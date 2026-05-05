import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db, usersCol, sessionsCol } from "./firebase";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

const AUTH_HEADER_PREFIX = "Bearer ";

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashPassword(password, salt)}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.includes(":")) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");
  const candidate = hashPassword(password, salt);

  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

export async function createSessionToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await sessionsCol.doc(token).set({
    userId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return token;
}

export async function getUserFromToken(token: string | undefined | null): Promise<{ id: string } | null> {
  if (!token) {
    return null;
  }

  const session = await sessionsCol.doc(token).get();
  if (!session.exists) {
    return null;
  }

  const data = session.data();
  if (!data || typeof data["userId"] !== "string") {
    return null;
  }

  return { id: data["userId"] };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(AUTH_HEADER_PREFIX)) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }

  const token = header.slice(AUTH_HEADER_PREFIX.length).trim();
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid auth token" });
    return;
  }

  req.user = user;
  next();
}
