// src/routes/payments.routes.ts
import { Router } from "express";
import { rawBodyParser, initPaystackPayment, verifyPaystackPayment, paystackWebhook } from "../controllers/payments.controller.js";
import { validate } from "../middlewares/validator.js";
import { initPaystackSchema } from "../validators/payments.validator.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/init", protect,  validate(initPaystackSchema), initPaystackPayment);
router.get("/verify/:reference", protect, /*auth?*/ verifyPaystackPayment);

// Webhook uses RAW body parser ONLY on this route
router.post("/webhook", rawBodyParser, paystackWebhook);



export default router;




