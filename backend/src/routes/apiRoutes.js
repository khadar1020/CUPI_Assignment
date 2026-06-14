import express from "express";
import { analyzeStocks } from "../controllers/aiController.js";
import { getHealth, getStocks } from "../controllers/stockController.js";

const router = express.Router();

router.get("/health", getHealth);
router.get("/stocks", getStocks);
router.post("/ai/analyze", analyzeStocks);

export default router;
