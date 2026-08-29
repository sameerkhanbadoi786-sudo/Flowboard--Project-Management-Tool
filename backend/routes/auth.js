import { Router } from "express";
import jwt from "jsonwebtoken";
import { getUserByUsername, getUserByEmail, createUser, verifyPassword } from "../store.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../lib/mailer.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const { fullName, username, email, password, agreePrivacy } = req.body;

  if (!fullName?.trim() || !username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Full name, username, email, and password are all required." });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (!agreePrivacy) {
    return res.status(400).json({ error: "You need to agree to the Privacy Policy to create an account." });
  }

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (getUserByUsername(normalizedUsername)) {
    return res.status(409).json({ error: "That username is already taken." });
  }
  if (getUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user = createUser({
    fullName: fullName.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password,
  });

  const token = issueToken(user);

  // Fire-and-forget — sendWelcomeEmail already catches its own errors and
  // logs them, so a broken/missing SMTP config can never fail signup.
  sendWelcomeEmail(user.email, user.fullName);

  res.status(201).json({ token, username: user.username, fullName: user.fullName, email: user.email });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = issueToken(user);
  res.json({ token, username: user.username, fullName: user.full_name, email: user.email });
});

export default router;
