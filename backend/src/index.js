import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { connectDatabase } from "./db/connect.js";
import apiRoutes from "./routes/apiRoutes.js";
import { registerDashboardSocket } from "./socket/dashboardSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
  quiet: true
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock_broker_dashboard";
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174"
    ],
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use("/api", apiRoutes);
app.use(express.static(FRONTEND_DIST));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

registerDashboardSocket(io);

async function startServer() {
  try {
    await connectDatabase(MONGODB_URI);
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
