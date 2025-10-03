export const requireRole = (role) => (req, res, next) => {
    if (req.user && req.user.role === role)
        return next();
    res.status(403).json({ message: 'Forbidden' });
};
export const requireRoles = (roles) => (req, res, next) => {
    console.log("⚡ requireRoles invoked", {
        expectedRoles: roles,
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method
    });
    if (req.user && roles.includes(req.user.role)) {
        return next();
    }
    res.status(403).json({ message: 'Forbidden /// from requireRoles' });
};
