// src/routes/payments.routes.ts
import { Router } from "express";
import { initPaystackPayment, verifyPaystackPayment } from "../controllers/payments.controller.js";
import { validate } from "../middlewares/validator.js";
import { initPaystackSchema } from "../validators/payments.validator.js";
import { protect } from "../middlewares/authMiddleware.js";
const router = Router();
router.post("/init", protect, validate(initPaystackSchema), initPaystackPayment);
router.get("/verify/:reference", protect, /*auth?*/ verifyPaystackPayment);
// Note: Webhook is handled directly in server.ts to avoid middleware conflicts
export default router;
