import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../types.js";

export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expire as SignOptions["expiresIn"] },
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};
