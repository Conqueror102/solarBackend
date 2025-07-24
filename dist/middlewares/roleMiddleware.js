export const requireRole = (role) => (req, res, next) => {
    if (req.user && req.user.role === role)
        return next();
    res.status(403).json({ message: 'Forbidden' });
};
export const requireRoles = (roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role))
        return next();
    res.status(403).json({ message: 'Forbidden' });
};
