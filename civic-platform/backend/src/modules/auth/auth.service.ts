import { env } from "../../config/env.js";
import { createCitizenUser, getUserForLogin } from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.types.js";

function validateLoginInput(input: Partial<LoginInput>) {
  if (!input.email) {
    throw new Error("email is required");
  }

  if (!input.password) {
    throw new Error("password is required");
  }
}

function isValidPassword(storedHash: string | null, password: string) {
  if (!storedHash) {
    return false;
  }

  if (storedHash === password) {
    return true;
  }

  if (storedHash === "dev-placeholder-hash" && password === env.demoAuthPassword) {
    return true;
  }

  return false;
}

export async function loginService(input: Partial<LoginInput>) {
  validateLoginInput(input);

  const user = await getUserForLogin(input.email as string);

  if (!user || !isValidPassword(user.passwordHash, input.password as string)) {
    throw new Error("Invalid email or password");
  }

  const { passwordHash: _passwordHash, ...sessionUser } = user;
  return sessionUser;
}

function validateRegisterInput(input: Partial<RegisterInput>) {
  if (!input.fullName?.trim()) {
    throw new Error("fullName is required");
  }

  if (!input.email?.trim()) {
    throw new Error("email is required");
  }

  if (!input.password) {
    throw new Error("password is required");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

export async function registerCitizenService(input: Partial<RegisterInput>) {
  validateRegisterInput(input);

  const existingUser = await getUserForLogin(input.email as string);

  if (existingUser) {
    throw new Error("An account already exists for this email");
  }

  const user = await createCitizenUser({
    fullName: input.fullName!.trim(),
    email: input.email!.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    password: input.password!,
  });

  const { passwordHash: _passwordHash, ...sessionUser } = user;
  return sessionUser;
}
