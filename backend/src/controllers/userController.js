import { User } from "../models/User.js";

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

export async function createUser({ name, email }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 2) {
    return { ok: false, message: "Please enter your full name." };
  }

  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." };
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
    subscriptions: []
  });

  return { ok: true, user: serializeUser(user) };
}

export async function loginUser(email) {
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

  return { ok: true, user };
}
