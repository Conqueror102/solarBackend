import { Request, Response, NextFunction } from "express";
import { verifytoken } from "../utils/tokenService.js";
import { User } from "../models/User.js";

interface AuthRequest extends Request {
  user?: any;
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];

    try {
      const decoded = verifytoken(token);
      if (!decoded) {
        return res.status(401).json({ message: "Not authorized, token invalid" });
      }

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      return next();
    } catch (error: any) {
      console.error("JWT error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

export { protect };
