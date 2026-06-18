import { User } from "../models/User.js";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

export function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    subscriptions: user.subscriptions
  };
}

function isValidPassword(password) {
  return String(password || "").length >= 6;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || "").split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(key, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export async function createUser({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 2) {
    return { ok: false, message: "Please enter your full name." };
  }

  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  if (!isValidPassword(password)) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    return {
      ok: false,
      message: "A user with this email already exists. Please login instead."
    };
  }

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    passwordHash: await hashPassword(password),
    subscriptions: []
  });

  return { ok: true, user: serializeUser(user) };
}

export async function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);

  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return {
      ok: false,
      message: "No user found with this email. Please create the user first."
    };
  }

  const isPasswordCorrect = await verifyPassword(password, user.passwordHash);
  if (!isPasswordCorrect) {
    return { ok: false, message: "Incorrect password. Please try again." };
  }

  return { ok: true, user };
}
