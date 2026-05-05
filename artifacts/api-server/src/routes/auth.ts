import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import {
  createPasswordHash,
  createSessionToken,
  getUserFromToken,
  requireAuth,
  verifyPassword,
} from "../lib/auth";
import { sessionsCol, usersCol } from "../lib/firebase";

const router = Router();

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validateEmail(email: string): boolean {
  return email.length > 0 && email.includes("@");
}

function validatePassword(password: string): boolean {
  return password.length >= 6;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!validateEmail(email) || !validatePassword(password)) {
    res.status(400).json({ error: "Email must be valid and password must be at least 6 characters." });
    return;
  }

  const userRef = usersCol.doc(email);
  const existing = await userRef.get();
  if (existing.exists) {
    res.status(400).json({ error: "A user with that email already exists." });
    return;
  }

  const passwordHash = createPasswordHash(password);
  await userRef.set({
    email,
    passwordHash,
    createdAt: FieldValue.serverTimestamp(),
  });

  const token = await createSessionToken(email);
  res.status(201).json({ email, token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!validateEmail(email) || !validatePassword(password)) {
    res.status(400).json({ error: "Invalid email or password." });
    return;
  }

  const userRef = usersCol.doc(email);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const userData = userDoc.data();
  if (!userData || typeof userData.passwordHash !== "string") {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (!verifyPassword(password, userData.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = await createSessionToken(email);
  res.json({ email, token });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json({ email: req.user?.id });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization as string;
  const token = authHeader.replace(/^Bearer\s*/i, "").trim();
  if (token) {
    await sessionsCol.doc(token).delete();
  }
  res.sendStatus(204);
});

export default router;
