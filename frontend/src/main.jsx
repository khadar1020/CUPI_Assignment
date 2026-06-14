import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  UserPlus
} from "lucide-react";
import "./styles.css";

const supportedStocks = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];

const companyNames = {
  GOOG: "Alphabet Inc.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
  META: "Meta Platforms",
  NVDA: "NVIDIA Corp."
};

function createSocket() {
  return io("/", {
    autoConnect: true,
    transports: ["websocket", "polling"]
  });
}

function App() {
  const socket = useMemo(() => createSocket(), []);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "" });
  const [activeUser, setActiveUser] = useState(null);
  const [selectedStock, setSelectedStock] = useState("GOOG");
  const [subscribedStocks, setSubscribedStocks] = useState([]);
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState(
    "Ask Gemini to summarize your watchlist, compare subscribed stocks, or explain the latest movement."
  );
  const [isAiLoading, setIsAiLoading] = useState(false);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  React.useEffect(() => {
    function handleConnect() {
      setIsConnected(true);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handleDashboardUpdate(payload) {
      setActiveUser(payload.user || null);
      setSubscribedStocks(payload.subscriptions || []);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("dashboard:update", handleDashboardUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("dashboard:update", handleDashboardUpdate);
      socket.disconnect();
    };
  }, [socket]);

  function updateForm(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function createUser(event) {
    event.preventDefault();
    setMessage("");

    socket.emit("user:create", form, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setAuthMode("login");
      setMessage("User created successfully. Login with the same email to continue.");
    });
  }

  function login(event) {
    event.preventDefault();
    setMessage("");

    socket.emit("user:login", form.email, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setActiveUser(response.user);
      setForm((currentForm) => ({
        ...currentForm,
        name: response.user.name,
        email: response.user.email
      }));
      setMessage("Login successful. Your saved subscriptions are loaded.");
    });
  }

  function subscribe(event) {
    event.preventDefault();
    const symbolToSubscribe = unsubscribedOptions.includes(selectedStock)
      ? selectedStock
      : unsubscribedOptions[0];

    if (!symbolToSubscribe) {
      setMessage("All supported stocks are already in your watchlist.");
      return;
    }

    setMessage("");

    socket.emit("stock:subscribe", symbolToSubscribe, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setMessage(`${response.symbol} added and saved to your watchlist.`);
    });
  }

  function unsubscribe(symbol) {
    setMessage("");
    socket.emit("stock:unsubscribe", symbol, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setMessage(`${response.symbol} removed from your saved watchlist.`);
    });
  }

  function logout() {
    socket.emit("user:logout", () => {
      setActiveUser(null);
      setSubscribedStocks([]);
      setSelectedStock("GOOG");
      setMessage("Logged out successfully.");
    });
  }

  const subscribedSymbols = subscribedStocks.map((stock) => stock.symbol);
  const unsubscribedOptions = supportedStocks.filter(
    (symbol) => !subscribedSymbols.includes(symbol)
  );
  const totalValue = subscribedStocks.reduce((total, stock) => total + stock.price, 0);
  const isDarkMode = theme === "dark";

  React.useEffect(() => {
    if (unsubscribedOptions.length && !unsubscribedOptions.includes(selectedStock)) {
      setSelectedStock(unsubscribedOptions[0]);
    }
  }, [selectedStock, unsubscribedOptions.join("|")]);

  async function askGemini(event) {
    event.preventDefault();
    const question = aiQuestion.trim();

    if (!question) {
      setAiAnswer("Please enter a question for Gemini.");
      return;
    }

    setIsAiLoading(true);
    setAiAnswer("Analyzing your current watchlist...");

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          email: activeUser?.email,
          stocks: subscribedStocks
        })
      });
      const data = await response.json();

      if (!data.ok) {
        setAiAnswer(data.message);
        return;
      }

      setAiAnswer(data.answer);
      setAiQuestion("");
    } catch {
      setAiAnswer("Gemini AI is unavailable right now. Please check the backend server.");
    } finally {
      setIsAiLoading(false);
    }
  }

  if (!activeUser) {
    return (
      <main className="auth-shell">
        <section className="auth-hero">
          <div className="auth-copy">
            <p className="eyebrow">Escrow Stack assignment</p>
            <h1>Stock Broker Client Dashboard</h1>
            <p>
              I built this as a full-stack realtime dashboard with MongoDB user
              creation, email login, saved subscriptions, and live stock updates.
            </p>
          </div>
          <button
            type="button"
            className="theme-button hero-theme"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </section>

        <section className="auth-card" aria-label="User authentication">
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setMessage("");
              }}
            >
              <LogIn size={17} />
              Login
            </button>
            <button
              type="button"
              className={authMode === "create" ? "active" : ""}
              onClick={() => {
                setAuthMode("create");
                setMessage("");
              }}
            >
              <UserPlus size={17} />
              Create User
            </button>
          </div>

          <form
            className="stacked-form"
            onSubmit={authMode === "create" ? createUser : login}
          >
            {authMode === "create" && (
              <>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Khadar Ahmed"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              required
            />

            <button type="submit" className="primary-button">
              {authMode === "create" ? <UserPlus size={18} /> : <CheckCircle2 size={18} />}
              {authMode === "create" ? "Create User" : "Login"}
            </button>
          </form>

          <div className="auth-status-row">
            <span className={`tiny-status ${isConnected ? "online" : "offline"}`}>
              <Activity size={14} />
              {isConnected ? "Server connected" : "Server offline"}
            </span>
          </div>

          {message && <p className="status-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="app-header" aria-label="Application summary">
        <div>
          <p className="eyebrow">Protected payments stock desk</p>
          <h1>Client Trading Dashboard</h1>
        </div>
        <div className="header-actions">
          <div className={`connection-pill ${isConnected ? "online" : "offline"}`}>
            <Activity size={16} />
            {isConnected ? "Live" : "Offline"}
          </div>
          <button
            type="button"
            className="theme-button"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="user-menu" title={activeUser.email}>
            <div className="avatar circle-avatar">{activeUser.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{activeUser.name}</strong>
              <span>{activeUser.email}</span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </section>

      <section className="workspace">
        <section className="dashboard-panel">
          <div className="trade-toolbar">
            <div>
              <p className="eyebrow">Subscription desk</p>
              <h2>Build your live watchlist</h2>
            </div>
            <form onSubmit={subscribe} className="subscribe-form">
              <label htmlFor="stock">Ticker</label>
              <select
                id="stock"
                value={unsubscribedOptions.includes(selectedStock) ? selectedStock : unsubscribedOptions[0] || ""}
                onChange={(event) => setSelectedStock(event.target.value)}
                disabled={unsubscribedOptions.length === 0}
              >
                {unsubscribedOptions.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol} - {companyNames[symbol]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="primary-button compact-button"
                disabled={unsubscribedOptions.length === 0}
              >
                <Plus size={18} />
                Subscribe
              </button>
            </form>
          </div>

          <div className="supported-list" aria-label="Supported stocks">
            {supportedStocks.map((symbol) => (
              <span className={subscribedSymbols.includes(symbol) ? "selected" : ""} key={symbol}>
                {symbol}
              </span>
            ))}
          </div>

          {message && <p className="status-message inline-message">{message}</p>}

          <div className="stats-grid">
            <article>
              <p>Client account</p>
              <strong>{activeUser.email}</strong>
            </article>
            <article>
              <p>Saved stocks</p>
              <strong>{subscribedStocks.length}</strong>
            </article>
            <article>
              <p>Combined live price</p>
              <strong>${totalValue.toFixed(2)}</strong>
            </article>
          </div>

          <div className="table-header">
            <div>
              <p className="eyebrow">Live subscriptions</p>
              <h2>Personal Watchlist</h2>
            </div>
            <ShieldCheck size={24} aria-hidden="true" />
          </div>

          {subscribedStocks.length ? (
            <div className="stock-grid">
              {subscribedStocks.map((stock) => {
                const change = stock.price - stock.previousPrice;
                const isUp = change >= 0;

                return (
                  <article className="stock-card" key={stock.symbol}>
                    <div className="stock-card-head">
                      <div>
                        <h3>{stock.symbol}</h3>
                        <p>{companyNames[stock.symbol]}</p>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => unsubscribe(stock.symbol)}
                        aria-label={`Unsubscribe ${stock.symbol}`}
                        title={`Unsubscribe ${stock.symbol}`}
                      >
                        <Minus size={18} />
                      </button>
                    </div>
                    <div className="price-row">
                      <strong>${stock.price.toFixed(2)}</strong>
                      <span className={isUp ? "positive" : "negative"}>
                        {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isUp ? "+" : ""}
                        {change.toFixed(2)}
                      </span>
                    </div>
                    <p className="updated-text">
                      Updated {new Date(stock.updatedAt).toLocaleTimeString()}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Bell size={34} />
              <h2>No stocks subscribed yet</h2>
              <p>Subscribe to GOOG, TSLA, AMZN, META, or NVDA to start the live feed.</p>
            </div>
          )}
        </section>

        <aside className="ai-panel">
          <div className="ai-panel-head">
            <div className="ai-icon">
              <Bot size={20} />
            </div>
            <div>
              <p className="eyebrow">Gemini AI</p>
              <h2>Stock Assistant</h2>
            </div>
          </div>

          <div className="ai-answer">
            <Sparkles size={18} />
            <p>{aiAnswer}</p>
          </div>

          <form onSubmit={askGemini} className="ai-form">
            <label htmlFor="ai-question">Ask about your watchlist</label>
            <textarea
              id="ai-question"
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Example: Analyze TSLA and NVDA from my watchlist"
              rows="5"
            />
            <button type="submit" className="primary-button" disabled={isAiLoading}>
              <Send size={17} />
              {isAiLoading ? "Analyzing..." : "Ask Gemini"}
            </button>
          </form>

          <div className="ai-suggestions">
            <button type="button" onClick={() => setAiQuestion("Summarize my subscribed stocks.")}>
              Summarize watchlist
            </button>
            <button type="button" onClick={() => setAiQuestion("Which subscribed stock moved the most?")}>
              Biggest movement
            </button>
            <button type="button" onClick={() => setAiQuestion("Explain the risk in my current watchlist.")}>
              Explain risk
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");
globalThis.__stockDashboardRoot ||= createRoot(rootElement);
globalThis.__stockDashboardRoot.render(<App />);
