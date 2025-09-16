import { verifyAccessToken } from '../utils/tokenService.js';
import { User } from '../models/User.js';
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyAccessToken(token);
            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                res.status(401);
                throw new Error('User not found');
            }
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401);
            next(new Error("Not authorized, token failed"));
        }
    }
    if (!token) {
        res.status(401);
        next(new Error("Not authorized, token failed"));
    }
};
export { protect };
