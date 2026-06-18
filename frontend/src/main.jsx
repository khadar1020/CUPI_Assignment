import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  KeyRound,
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

const initialPrices = {
  GOOG: 178.24,
  TSLA: 182.67,
  AMZN: 186.91,
  META: 502.43,
  NVDA: 124.58
};

function createSocket() {
  return io("/", {
    autoConnect: true,
    transports: ["websocket", "polling"]
  });
}

function App() {
  const socket = useMemo(() => createSocket(), []);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [activeUser, setActiveUser] = useState(null);
  const [selectedStock, setSelectedStock] = useState("GOOG");
  const [subscribedStocks, setSubscribedStocks] = useState([]);
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isHostedMode, setIsHostedMode] = useState(false);
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
    const hostedTimer = window.setTimeout(() => {
      if (!socket.connected) {
        setIsHostedMode(true);
        setMessage("Hosted access is ready. Create an account to explore the live dashboard.");
      }
    }, 1600);

    function handleConnect() {
      setIsConnected(true);
      setIsHostedMode(false);
    }

    function handleDisconnect() {
      setIsConnected(false);
      setIsHostedMode(true);
    }

    function handleDashboardUpdate(payload) {
      setActiveUser(payload.user || null);
      setSubscribedStocks(payload.subscriptions || []);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("dashboard:update", handleDashboardUpdate);

    return () => {
      window.clearTimeout(hostedTimer);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("dashboard:update", handleDashboardUpdate);
      socket.disconnect();
    };
  }, [socket]);

  React.useEffect(() => {
    if (!isHostedMode || !activeUser) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSubscribedStocks((currentStocks) =>
        currentStocks.map((stock) => {
          const movement = (Math.random() - 0.48) * 3.4;
          const nextPrice = Math.max(10, stock.price + movement);

          return {
            ...stock,
            previousPrice: stock.price,
            price: Number(nextPrice.toFixed(2)),
            updatedAt: new Date().toISOString()
          };
        })
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeUser, isHostedMode]);

  function updateForm(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function createUser(event) {
    event.preventDefault();
    setMessage("");

    if (isHostedMode) {
      const hostedUsers = JSON.parse(localStorage.getItem("hostedUsers") || "{}");
      const cleanEmail = form.email.trim().toLowerCase();

      if (hostedUsers[cleanEmail]) {
        setMessage("A user with this email already exists. Please login instead.");
        return;
      }

      if (form.password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      hostedUsers[cleanEmail] = {
        id: cleanEmail,
        name: form.name.trim(),
        email: cleanEmail,
        password: form.password,
        subscriptions: []
      };
      localStorage.setItem("hostedUsers", JSON.stringify(hostedUsers));
      setAuthMode("login");
      setMessage("Account created. Login with the same email and password to continue.");
      return;
    }

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

    if (isHostedMode) {
      const hostedUsers = JSON.parse(localStorage.getItem("hostedUsers") || "{}");
      const cleanEmail = form.email.trim().toLowerCase();
      const hostedUser = hostedUsers[cleanEmail];

      if (!hostedUser) {
        setMessage("No account found with this email. Please create the user first.");
        return;
      }

      if (hostedUser.password !== form.password) {
        setMessage("Incorrect password. Please try again.");
        return;
      }

      setActiveUser(hostedUser);
      setForm((currentForm) => ({
        ...currentForm,
        name: hostedUser.name,
        email: hostedUser.email,
        password: ""
      }));
      setSubscribedStocks(
        hostedUser.subscriptions.map((symbol) => ({
          symbol,
          price: initialPrices[symbol],
          previousPrice: initialPrices[symbol],
          updatedAt: new Date().toISOString()
        }))
      );
      setMessage("Login successful. Your watchlist is ready.");
      return;
    }

    socket.emit("user:login", { email: form.email, password: form.password }, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setActiveUser(response.user);
      setForm((currentForm) => ({
        ...currentForm,
        name: response.user.name,
        email: response.user.email,
        password: ""
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

    if (isHostedMode) {
      const newStock = {
        symbol: symbolToSubscribe,
        price: initialPrices[symbolToSubscribe],
        previousPrice: initialPrices[symbolToSubscribe],
        updatedAt: new Date().toISOString()
      };

      setSubscribedStocks((currentStocks) => [...currentStocks, newStock]);
      const hostedUsers = JSON.parse(localStorage.getItem("hostedUsers") || "{}");
      hostedUsers[activeUser.email] = {
        ...activeUser,
        subscriptions: [...subscribedSymbols, symbolToSubscribe]
      };
      localStorage.setItem("hostedUsers", JSON.stringify(hostedUsers));
      setActiveUser(hostedUsers[activeUser.email]);
      setMessage(`${symbolToSubscribe} added to your watchlist.`);
      return;
    }

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

    if (isHostedMode) {
      const nextSymbols = subscribedSymbols.filter((subscribedSymbol) => subscribedSymbol !== symbol);
      setSubscribedStocks((currentStocks) =>
        currentStocks.filter((stock) => stock.symbol !== symbol)
      );
      const hostedUsers = JSON.parse(localStorage.getItem("hostedUsers") || "{}");
      hostedUsers[activeUser.email] = {
        ...activeUser,
        subscriptions: nextSymbols
      };
      localStorage.setItem("hostedUsers", JSON.stringify(hostedUsers));
      setActiveUser(hostedUsers[activeUser.email]);
      setMessage(`${symbol} removed from your watchlist.`);
      return;
    }

    socket.emit("stock:unsubscribe", symbol, (response) => {
      if (!response.ok) {
        setMessage(response.message);
        return;
      }

      setMessage(`${response.symbol} removed from your saved watchlist.`);
    });
  }

  function logout() {
    if (isHostedMode) {
      setActiveUser(null);
      setSubscribedStocks([]);
      setSelectedStock("GOOG");
      setMessage("Logged out successfully.");
      return;
    }

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
      setAiAnswer("AI analysis is unavailable right now. Please try again shortly.");
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
            <h1>Secure Stock Broker Dashboard</h1>
            <p>
              A protected client workspace with password login, live stock updates,
              saved watchlists, and an AI assistant for quick portfolio summaries.
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

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <KeyRound size={17} />
              <input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                minLength="6"
                required
              />
            </div>

            <button type="submit" className="primary-button">
              {authMode === "create" ? <UserPlus size={18} /> : <CheckCircle2 size={18} />}
              {authMode === "create" ? "Create User" : "Login"}
            </button>
          </form>

          <div className="auth-status-row">
            <span className={`tiny-status ${isConnected ? "online" : "offline"}`}>
              <Activity size={14} />
              {isConnected ? "Secure server connected" : "Hosted access"}
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
            {isConnected ? "Live" : "Hosted"}
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
