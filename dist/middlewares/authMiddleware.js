import { verifytoken } from "../utils/tokenService.js";
import { User } from "../models/User.js";
const protect = async (req, res, next) => {
    let token;
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
        }
        catch (error) {
            console.error("JWT error:", error.message);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }
    return res.status(401).json({ message: "Not authorized, no token" });
};
export { protect };
