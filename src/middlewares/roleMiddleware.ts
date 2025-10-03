import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user && (req as any).user.role === role) return next();
  res.status(403).json({ message: 'Forbidden' });
};

export const requireRoles = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  console.log("⚡ requireRoles invoked", {
    expectedRoles: roles,
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method
  });

  if ((req as any).user && roles.includes((req as any).user.role)) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden /// from requireRoles' });
};

