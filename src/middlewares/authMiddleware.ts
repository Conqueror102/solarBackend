
/**
 * authMiddleware.js
 * -----------------
 * Verifies JWT tokens and ensures user roles for access control.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

interface AuthRequest extends Request {
    user?: any;
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;
    
    // Check for token in cookies first (more secure)
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // Fallback to Authorization header for API clients
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                res.status(401);
                throw new Error('User not found');
            }
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            next(new Error("Not authorized, token failed"));
        }
    } else {
        res.status(401);
        next(new Error("Not authorized, no token"));
    }
};

export { protect };
