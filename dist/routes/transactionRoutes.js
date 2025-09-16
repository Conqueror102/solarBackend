import { Router } from "express";
import { getTransactions, getTransactionById } from "../controllers/transactionController.js";
const router = Router();
router.get("/", getTransactions); // GET /api/transactions
router.get("/:id", getTransactionById); // GET /api/transactions/:id
export default router;
