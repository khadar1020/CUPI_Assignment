export const SUPPORTED_STOCKS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];

const seedPrices = {
  GOOG: 178.24,
  TSLA: 182.67,
  AMZN: 186.91,
  META: 502.43,
  NVDA: 124.58
};

export const stockPrices = new Map(
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

export function pricesToObject() {
  return Object.fromEntries(stockPrices);
}

export function getSubscribedStocks(user) {
  return user.subscriptions.map((symbol) => stockPrices.get(symbol)).filter(Boolean);
}

export function updateStockPrices() {
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
}
