# Stock Broker Client Web Dashboard

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248)

A complete full-stack stock broker client dashboard with user authentication, real-time stock price updates via Socket.IO, MongoDB persistence, and a Gemini AI assistant sidebar.

---

## Architecture Diagram

> How all the pieces of the system connect to each other.

![Architecture Diagram](docs/images/architecture_diagram.png)

---

## Application Flow Diagram

> What happens step by step when a user opens the app, logs in, and uses the dashboard.

![Application Flow Diagram](docs/images/flow_diagram.png)

---

## Features

- User creation with full name and email address
- Login and logout using registered email
- MongoDB persistence — subscriptions saved across sessions
- Five supported stocks: `GOOG`, `TSLA`, `AMZN`, `META`, `NVDA`
- Subscribe and unsubscribe to stocks
- Real-time price updates every second via Socket.IO (no page refresh)
- Multi-user support — each user sees their own watchlist
- Light mode and dark mode theme toggle
- Gemini AI stock assistant sidebar

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, CSS |
| Backend | Node.js, Express.js |
| Real-time | Socket.IO |
| Database | MongoDB |
| ODM | Mongoose |
| AI Assistant | Google Gemini API |
| Icons | Lucide React |

---

## Folder Structure

```
CUPI_Assignement/
│
├── frontend/                      ← React + Vite app (port 5173)
│   ├── src/
│   │   ├── main.jsx               ← All React components and app logic
│   │   └── styles.css             ← All styles
│   ├── index.html
│   ├── vite.config.js             ← Proxies /api and /socket.io → backend
│   └── package.json
│
├── backend/                       ← Express + Socket.IO + MongoDB (port 4000)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.js    ← Gemini AI request handler
│   │   │   ├── stockController.js ← Stock subscription logic
│   │   │   └── userController.js  ← Create user / login / logout
│   │   ├── db/
│   │   │   └── connect.js         ← MongoDB connection
│   │   ├── models/
│   │   │   └── User.js            ← Mongoose schema (name, email, subscriptions)
│   │   ├── routes/
│   │   │   └── apiRoutes.js       ← All API route definitions
│   │   ├── socket/
│   │   │   └── dashboardSocket.js ← Real-time price broadcast logic
│   │   └── index.js               ← Server entry point
│   └── package.json
│
├── docs/images/                   ← Diagrams and screenshots
│   ├── architecture_diagram.png
│   └── flow_diagram.png
├── .env                           ← Your environment variables (create this)
├── .env.example                   ← Template for .env
├── docker-compose.yml             ← Start MongoDB via Docker
├── LICENSE                        ← MIT License
└── package.json                   ← Root — runs both together with concurrently
```

---

## Step 1 — Set Up Your .env File

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/stock_broker_dashboard
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

> `GEMINI_API_KEY` is optional. If left blank, the app runs normally but the AI sidebar will be unavailable.

---

## Step 2 — Start MongoDB

Choose **one** of the following options:

### Option A — Local MongoDB (Homebrew)

```bash
brew services start mongodb-community
```

### Option B — Docker

```bash
docker compose up -d
```

### Option C — MongoDB Atlas

Replace `MONGODB_URI` in your `.env` with your Atlas connection string:

```bash
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/stock_broker_dashboard
```

---

## Step 3 — Install Dependencies

Install packages for root, backend, and frontend all at once:

```bash
npm run install:all
```

Or install separately:

```bash
npm install                       # root
npm install --prefix backend      # backend
npm install --prefix frontend     # frontend
```

---

## Step 4 — Run the App

Run **both frontend and backend together** from the root folder:

```bash
npm run dev
```

You will see output like this:

```
[BACKEND]  MongoDB connected
[BACKEND]  Stock dashboard server running on http://localhost:4000
[FRONTEND] VITE v8.0.16  ready in 338 ms
[FRONTEND]   ➜  Local:   http://localhost:5173/
```

Open your browser at:

```
http://localhost:5173
```

---

## All Available Commands

Run from the **root folder** (`CUPI_Assignement/`):

| Command | What It Does |
| --- | --- |
| `npm run dev` | Runs **both** frontend and backend together |
| `npm run dev:backend` | Runs **only** the backend (port 4000) |
| `npm run dev:frontend` | Runs **only** the frontend (port 5173) |
| `npm run install:all` | Installs all packages for root + backend + frontend |
| `npm run build:frontend` | Builds the frontend for production |
| `npm run start` | Runs the backend in production mode |

---

## How To Use The App

1. Open `http://localhost:5173`
2. Click **Create User** → enter a full name and email → click **Create User**
3. Go back to **Login** → enter the same email → click **Login**
4. Type a stock ticker (`GOOG`, `TSLA`, `AMZN`, `META`, or `NVDA`) and click **Subscribe**
5. Watch live prices update every second automatically
6. Open the **AI Assistant** sidebar on the right to ask Gemini about your watchlist
7. Toggle **light / dark mode** using the theme button in the header
8. Click the **logout icon** (top-right) to return to the login page

---

## Testing Multiple Users

1. Open `http://localhost:5173` in a normal browser window
2. Create and login as `user1@example.com` — subscribe to `GOOG`, `TSLA`
3. Open `http://localhost:5173` in a **new incognito / private window**
4. Create and login as `user2@example.com` — subscribe to `AMZN`, `META`
5. Both dashboards update live independently — each user sees only their own stocks

---

## Supported Stocks

| Ticker | Company |
| --- | --- |
| GOOG | Alphabet Inc. |
| TSLA | Tesla Inc. |
| AMZN | Amazon.com Inc. |
| META | Meta Platforms |
| NVDA | NVIDIA Corporation |

---

## Important Notes

- Stock prices are **randomly generated** — real market data is not used.
- User accounts and subscriptions are **saved in MongoDB** and persist across refreshes and restarts.
- Gemini AI provides **educational analysis only** — not real financial advice.
- The frontend (Vite) proxies all `/api` and `/socket.io` requests to the backend automatically, so you only ever open `http://localhost:5173`.

---

## License

This project is licensed under the [MIT License](LICENSE).
