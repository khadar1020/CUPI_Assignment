import { GoogleGenAI } from "@google/genai";

const SUPPORTED_STOCKS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];

function getStockContext(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return "The user has not subscribed to any stocks yet.";
  }

  return stocks
    .map((stock) => {
      const price = Number(stock.price || 0);
      const previousPrice = Number(stock.previousPrice || 0);
      const movement = price - previousPrice;

      return `${stock.symbol}: price $${price.toFixed(2)}, last movement ${
        movement >= 0 ? "+" : ""
      }${movement.toFixed(2)}`;
    })
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      ok: false,
      message: "Gemini AI is not configured yet."
    });
    return;
  }

  const question = String(req.body?.question || "").trim();
  if (!question) {
    res.status(400).json({ ok: false, message: "Please enter a question." });
    return;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const stockContext = getStockContext(req.body?.stocks);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `You are a stock assistant inside a student stock broker dashboard.
Give concise educational analysis only. Do not provide real financial advice.

Supported stocks: ${SUPPORTED_STOCKS.join(", ")}
Current subscribed stock context:
${stockContext}

User question:
${question}`
    });

    res.status(200).json({
      ok: true,
      answer: response.text || "I could not generate an answer right now."
    });
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    res.status(500).json({
      ok: false,
      message: `Gemini request failed: ${error?.message || "Unknown error"}`
    });
  }
}
