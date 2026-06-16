import { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { verifyToken } from "../utils/jwt.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { UserRole } from "../types.js";
import { db } from "../db.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

const resolveUserFromToken = async (token: string) => {
  const decoded = verifyToken(token);

  if (decoded) {
    return decoded as { id: string; email: string; role: UserRole };
  }

  return null;
};

const resolveUserFromClerkRequest = async (req: Request) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return null;
  }

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    return null;
  }

  const dbUser = await db.queryOne(
    "SELECT id, email, role FROM users WHERE email = $1",
    [primaryEmail.trim().toLowerCase()],
  );

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
  };
};

const touchLastActive = async (userId: string) => {
  try {
    await db.query(
      `
        UPDATE users
        SET last_active_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [userId],
    );
  } catch (error) {
    console.error("Failed to update user last_active_at", error);
  }
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const clerkUser = await resolveUserFromClerkRequest(req);

    if (clerkUser) {
      req.user = clerkUser;
      void touchLastActive(clerkUser.id);
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.substring(7);
    const decoded = await resolveUserFromToken(token);

    if (!decoded) {
      throw new AuthenticationError("Invalid or expired token");
    }

    req.user = decoded;
    void touchLastActive(decoded.id);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `This action requires one of the following roles: ${roles.join(", ")}`,
        ),
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const clerkUser = await resolveUserFromClerkRequest(req);

    if (clerkUser) {
      req.user = clerkUser;
      void touchLastActive(clerkUser.id);
      next();
      return;
    }

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = await resolveUserFromToken(token);

      if (decoded) {
        req.user = decoded;
        void touchLastActive(decoded.id);
      }
    }

    next();
  } catch (error) {
    next();
  }
};
