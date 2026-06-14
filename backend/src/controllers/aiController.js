import { GoogleGenAI } from "@google/genai";
import { SUPPORTED_STOCKS } from "../data/stocks.js";
import { normalizeEmail } from "./userController.js";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export async function analyzeStocks(req, res) {
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
}
