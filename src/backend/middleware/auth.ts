import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extended request type used after authentication.
// Attaches user identity and role to the request object
export interface AuthRequest extends Request {
  userId?: string;
  role?: 'student' | 'admin';
}

// Middleware that validates a JWT token and extracts the authenticated user's identity.
// This middleware is applied to all protected routes.

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  // Authorization header must be present
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Missing authorization header' });
  }

  // Expect header format: "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
      role: 'student' | 'admin';
    };

    // Attach decoded values to request for downstream handlers
    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch {
    return res
      .status(403)
      .json({ message: 'Invalid or expired token' });
  }
};
