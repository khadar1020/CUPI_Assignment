import { getSubscribedStocks, pricesToObject, SUPPORTED_STOCKS, updateStockPrices } from "../data/stocks.js";
import { User } from "../models/User.js";
import {
  createUser,
  loginUser,
  normalizeSymbol,
  serializeUser
} from "../controllers/userController.js";

const activeSessions = new Map();

function emitDashboard(socket, user) {
  socket.emit("dashboard:update", {
    user: serializeUser(user),
    subscriptions: getSubscribedStocks(user)
  });
}

async function handleSocketError(callback, error) {
  console.error(error);
  callback?.({
    ok: false,
    message: "Server error. Please check that MongoDB is running and try again."
  });
}

export function registerDashboardSocket(io) {
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

    socket.on("user:login", async (payload, callback) => {
      try {
        const result = await loginUser(payload || {});
        if (!result.ok) {
          callback?.(result);
          return;
        }

        activeSessions.set(socket.id, result.user._id.toString());
        callback?.({
          ok: true,
          user: serializeUser(result.user),
          supportedStocks: SUPPORTED_STOCKS,
          prices: pricesToObject()
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
    updateStockPrices();

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
}
