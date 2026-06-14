import { pricesToObject, SUPPORTED_STOCKS } from "../data/stocks.js";
import { getDatabaseStatus } from "../db/connect.js";

export function getHealth(_req, res) {
  res.json({
    ok: true,
    database: getDatabaseStatus(),
    supportedStocks: SUPPORTED_STOCKS
  });
}

export function getStocks(_req, res) {
  res.json({
    supportedStocks: SUPPORTED_STOCKS,
    prices: pricesToObject()
  });
}
