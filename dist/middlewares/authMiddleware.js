import { verifytoken } from "../utils/tokenService.js";
import { User } from "../models/User.js";
const protect = async (req, res, next) => {
    let token;
    // Log the incoming request headers
    console.log('🔍 Authentication Request:', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
        timestamp: new Date().toISOString()
    });
    if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
        console.log('🎟️ Token extracted:', token ? `${token.slice(0, 10)}...` : 'No token');
        try {
            const decoded = verifytoken(token);
            if (!decoded) {
                console.log('❌ Token verification failed');
                return res.status(401).json({ message: "Not authorized, token invalid" });
            }
            console.log('✅ Token verified:', { userId: decoded.id });
            // Fetch the user from the database
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                console.log('❌ User not found in database:', { userId: decoded.id });
                return res.status(401).json({ message: "User not found" });
            }
            // Attach the full user object to the request
            req.user = user;
            console.log('👤 User found:', {
                userId: user._id,
                role: user.role,
            });
            return next();
        }
        catch (error) {
            console.error('🚨 JWT error:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }
    console.log('❌ No authorization header present');
    return res.status(401).json({ message: "Not authorized, no token" });
};
export { protect };
