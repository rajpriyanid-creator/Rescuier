import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin' && req.userRole !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const responderMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const allowedRoles = ['responder', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.userRole || '')) {
    res.status(403).json({ error: 'First responder role required' });
    return;
  }
  next();
};
