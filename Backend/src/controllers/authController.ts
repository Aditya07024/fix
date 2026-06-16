import { Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "../db.js";
import { generateToken } from "../utils/jwt.js";
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
} from "../utils/errors.js";
import {
  SignupRequest,
  AuthRequest,
  ApiResponse,
  AuthToken,
} from "../types.js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeUser = (user: any) => {
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const withOnboardingState = async (user: any) => {
  const sanitizedUser = sanitizeUser(user);
  const hasPhone = Boolean(String(sanitizedUser.phone || "").trim());

  if (sanitizedUser.role !== "employee") {
    return {
      ...sanitizedUser,
      needs_onboarding: !hasPhone,
    };
  }

  const employeeProfile = await db.queryOne(
    `
      SELECT
        e.hourly_rate,
        e.verification_status,
        EXISTS (
          SELECT 1
          FROM employee_services es
          WHERE es.employee_id = e.id
        ) AS has_services
      FROM employees e
      WHERE e.user_id = $1
    `,
    [sanitizedUser.id],
  );

  const needsOnboarding =
    !hasPhone ||
    !employeeProfile ||
    !Number(employeeProfile.hourly_rate || 0) ||
    !employeeProfile.has_services;

  return {
    ...sanitizedUser,
    employee_verification_status:
      employeeProfile?.verification_status || undefined,
    needs_onboarding: needsOnboarding,
  };
};

const getClerkProfile = async (req: Request) => {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new AuthenticationError("Invalid or expired Clerk session");
  }

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new ValidationError("Clerk user does not have a verified email");
  }

  return {
    clerkUserId: clerkUser.id,
    email: normalizeEmail(primaryEmail),
    name:
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      clerkUser.username ||
      primaryEmail.split("@")[0],
    image:
      clerkUser.imageUrl || clerkUser.externalAccounts[0]?.imageUrl || null,
  };
};

const findOrCreateClerkUser = async (req: Request) => {
  const profile = await getClerkProfile(req);
  const desiredRole = req.body?.role as
    | "client"
    | "employee"
    | "admin"
    | undefined;
  const existingUser = await db.queryOne(
    "SELECT * FROM users WHERE email = $1",
    [profile.email],
  );

  if (existingUser) {
    const updatedUser = await db.queryOne(
      `
        UPDATE users
        SET
          name = COALESCE(NULLIF($1, ''), name),
          image = COALESCE($2, image),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
      [profile.name, profile.image, existingUser.id],
    );

    return withOnboardingState(updatedUser || existingUser);
  }

  if (desiredRole === "admin") {
    throw new ValidationError(
      "Admin accounts must be created separately and can only sign in here",
    );
  }

  const role = desiredRole === "employee" ? "employee" : "client";

  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  const createdUser = await db.queryOne(
    `
      INSERT INTO users (name, email, phone, password_hash, role, image)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [profile.name, profile.email, "", passwordHash, role, profile.image],
  );

  if (!createdUser) {
    throw new ValidationError("Failed to create Clerk-authenticated user");
  }

  if (role === "employee") {
    await db.query(
      `
        INSERT INTO employees (user_id, is_available, verification_status)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [createdUser.id, false, "pending"],
    );
  }

  return withOnboardingState(createdUser);
};

export const authController = {
  async syncClerkUser(req: Request, res: Response) {
    const user = await findOrCreateClerkUser(req);

    // Generate a JWT token for the frontend to use in subsequent requests
    const token = generateToken(user);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        user,
        token,
      },
      message: "Clerk session synchronized",
    };

    res.status(200).json(response);
  },

  async signup(req: Request, res: Response) {
    const { name, email, phone, password, role, service_ids } =
      req.body as SignupRequest;

    // Check if user already exists
    const existingUser = await db.queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.queryOne(
      `
        INSERT INTO users (name, email, phone, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [name, email, phone, hashedPassword, role],
    );

    if (!newUser) {
      throw new ValidationError("Failed to create user");
    }

    if (role === "employee") {
      const employee = await db.queryOne(
        `
          INSERT INTO employees (user_id, is_available, verification_status)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [newUser.id, false, "pending"],
      );

      if (!employee) {
        throw new ValidationError("Failed to create employee profile");
      }

      const serviceRows = await db.query(
        "SELECT id FROM services WHERE id = ANY($1::uuid[])",
        [service_ids || []],
      );

      if (serviceRows.length !== (service_ids || []).length) {
        throw new ValidationError("One or more selected services are invalid");
      }

      for (const serviceId of service_ids || []) {
        await db.query(
          `
            INSERT INTO employee_services (employee_id, service_id)
            VALUES ($1, $2)
            ON CONFLICT (employee_id, service_id) DO NOTHING
          `,
          [employee.id, serviceId],
        );
      }
    }

    // Remove password from response
    const userWithoutPassword = sanitizeUser(newUser);
    const token = generateToken(userWithoutPassword);

    const response: ApiResponse<AuthToken> = {
      success: true,
      data: {
        token,
        user: userWithoutPassword,
      },
      message: "Signup successful",
    };

    res.status(201).json(response);
  },

  async login(req: Request, res: Response) {
    const { email, password, role } = req.body as AuthRequest;

    const user = await db.queryOne(
      `
        SELECT
          u.*,
          e.verification_status AS employee_verification_status
        FROM users u
        LEFT JOIN employees e ON e.user_id = u.id
        WHERE u.email = $1
      `,
      [email],
    );

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    if (user.role !== role) {
      throw new AuthenticationError(
        `This account belongs to ${user.role}, not ${role}`,
      );
    }

    // Remove password from response
    const userWithoutPassword = sanitizeUser(user);
    const token = generateToken(userWithoutPassword);
    const enrichedUser = await withOnboardingState(user);

    const response: ApiResponse<AuthToken> = {
      success: true,
      data: {
        token,
        user: enrichedUser,
      },
      message: "Login successful",
    };

    res.status(200).json(response);
  },

  async verifyToken(req: Request, res: Response) {
    const response: ApiResponse<any> = {
      success: true,
      data: req.user,
      message: "Token is valid",
    };

    res.status(200).json(response);
  },

  async getProfile(req: Request, res: Response) {
    const userId = req.user?.id;

    const user = await db.queryOne("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (!user) {
      throw new ValidationError("User not found");
    }

    const userWithoutPassword = await withOnboardingState(user);

    const response: ApiResponse<any> = {
      success: true,
      data: userWithoutPassword,
    };

    res.status(200).json(response);
  },

  async updateProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    const { name, phone, image } = req.body;

    const updatedUser = await db.queryOne(
      `
        UPDATE users
        SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          image = COALESCE($3, image),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `,
      [name ?? null, phone ?? null, image ?? null, userId],
    );

    if (!updatedUser) {
      throw new ValidationError("Failed to update profile");
    }

    const userWithoutPassword = await withOnboardingState(updatedUser);

    const response: ApiResponse<any> = {
      success: true,
      data: userWithoutPassword,
      message: "Profile updated successfully",
    };

    res.status(200).json(response);
  },
};
