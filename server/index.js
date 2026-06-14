import dotenv from "dotenv";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock_broker_dashboard";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const SUPPORTED_STOCKS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];

const seedPrices = {
  GOOG: 178.24,
  TSLA: 182.67,
  AMZN: 186.91,
  META: 502.43,
  NVDA: 124.58
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true
    },
    subscriptions: {
      type: [String],
      enum: SUPPORTED_STOCKS,
      default: []
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"]
  }
});

const activeSessions = new Map();
const stockPrices = new Map(
  Object.entries(seedPrices).map(([symbol, price]) => [
    symbol,
    {
      symbol,
      price,
      previousPrice: price,
      updatedAt: new Date().toISOString()
    }
  ])
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "dist")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    supportedStocks: SUPPORTED_STOCKS
  });
});

app.get("/api/stocks", (_req, res) => {
  res.json({
    supportedStocks: SUPPORTED_STOCKS,
    prices: Object.fromEntries(stockPrices)
  });
});

app.post("/api/ai/analyze", async (req, res) => {
  if (!gemini) {
    res.status(503).json({
      ok: false,
      message: "Gemini AI is not configured. Add GEMINI_API_KEY to your .env file."
    });
    return;
  }

  const question = String(req.body?.question || "").trim();
  const stocks = Array.isArray(req.body?.stocks) ? req.body.stocks : [];
  const userEmail = normalizeEmail(req.body?.email);

  if (!question) {
    res.status(400).json({ ok: false, message: "Please enter a question." });
    return;
  }

  const stockContext = stocks.length
    ? stocks
        .map((stock) => {
          const change = Number(stock.price || 0) - Number(stock.previousPrice || 0);
          return `${stock.symbol}: price $${Number(stock.price || 0).toFixed(
            2
          )}, last movement ${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
        })
        .join("\n")
    : "The user has not subscribed to any stocks yet.";

  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: `You are an assistant inside a student stock broker dashboard assignment.
Give concise educational analysis only. Do not provide real financial advice.

User: ${userEmail || "unknown"}
Supported stocks: ${SUPPORTED_STOCKS.join(", ")}
Current subscribed stock context:
${stockContext}

User question:
${question}`
    });

    res.json({
      ok: true,
      answer: response.text || "I could not generate an answer right now."
    });
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    res.status(500).json({
      ok: false,
      message: "Gemini could not analyze the stocks right now. Please try again."
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    subscriptions: user.subscriptions
  };
}

function getSubscribedStocks(user) {
  return user.subscriptions.map((symbol) => stockPrices.get(symbol)).filter(Boolean);
}

function emitDashboard(socket, user) {
  socket.emit("dashboard:update", {
    user: serializeUser(user),
    subscriptions: getSubscribedStocks(user)
  });
}

async function createUser({ name, email }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 2) {
    return { ok: false, message: "Please enter your full name." };
  }

  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    return {
      ok: false,
      message: "A user with this email already exists. Please login instead."
    };
  }

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    subscriptions: []
  });

  return { ok: true, user: serializeUser(user) };
}

async function loginUser(email) {
  const cleanEmail = normalizeEmail(email);

  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return {
      ok: false,
      message: "No user found with this email. Please create the user first."
    };
  }

  return { ok: true, user };
}

async function handleSocketError(callback, error) {
  console.error(error);
  callback?.({
    ok: false,
    message: "Server error. Please check that MongoDB is running and try again."
  });
}

io.on("connection", (socket) => {
  socket.on("user:create", async (payload, callback) => {
    try {
      const result = await createUser(payload || {});
      callback?.(result);
    } catch (error) {
      if (error?.code === 11000) {
        callback?.({
          ok: false,
          message: "A user with this email already exists. Please login instead."
        });
        return;
      }

      await handleSocketError(callback, error);
    }
  });

  socket.on("user:login", async (email, callback) => {
    try {
      const result = await loginUser(email);
      if (!result.ok) {
        callback?.(result);
        return;
      }

      activeSessions.set(socket.id, result.user._id.toString());
      callback?.({
        ok: true,
        user: serializeUser(result.user),
        supportedStocks: SUPPORTED_STOCKS,
        prices: Object.fromEntries(stockPrices)
      });
      emitDashboard(socket, result.user);
    } catch (error) {
      await handleSocketError(callback, error);
    }
  });

  socket.on("stock:subscribe", async (symbol, callback) => {
    try {
      const userId = activeSessions.get(socket.id);
      const cleanSymbol = normalizeSymbol(symbol);

      if (!userId) {
        callback?.({ ok: false, message: "Please login before subscribing." });
        return;
      }

      if (!SUPPORTED_STOCKS.includes(cleanSymbol)) {
        callback?.({
          ok: false,
          message: `${cleanSymbol || "This stock"} is not supported.`
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { subscriptions: cleanSymbol } },
        { new: true }
      );

      callback?.({ ok: true, symbol: cleanSymbol });
      emitDashboard(socket, user);
    } catch (error) {
      await handleSocketError(callback, error);
    }
  });

  socket.on("stock:unsubscribe", async (symbol, callback) => {
    try {
      const userId = activeSessions.get(socket.id);
      const cleanSymbol = normalizeSymbol(symbol);

      if (!userId) {
        callback?.({ ok: false, message: "Please login first." });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { subscriptions: cleanSymbol } },
        { new: true }
      );

      callback?.({ ok: true, symbol: cleanSymbol });
      emitDashboard(socket, user);
    } catch (error) {
      await handleSocketError(callback, error);
    }
  });

  socket.on("user:logout", (callback) => {
    activeSessions.delete(socket.id);
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {
    activeSessions.delete(socket.id);
  });
});

setInterval(async () => {
  for (const symbol of SUPPORTED_STOCKS) {
    const current = stockPrices.get(symbol);
    const movement = (Math.random() - 0.48) * 3.4;
    const nextPrice = Math.max(10, current.price + movement);

    stockPrices.set(symbol, {
      symbol,
      price: Number(nextPrice.toFixed(2)),
      previousPrice: current.price,
      updatedAt: new Date().toISOString()
    });
  }

  for (const [socketId, userId] of activeSessions.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      continue;
    }

    const user = await User.findById(userId);
    if (user) {
      emitDashboard(socket, user);
    }
  }
}, 1000);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected");

    httpServer.listen(PORT, () => {
      console.log(`Stock dashboard server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Set MONGODB_URI in .env or start MongoDB locally.");
    process.exit(1);
  }
}

startServer();
