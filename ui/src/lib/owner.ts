import "server-only";

import { timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";

const OWNER_COOKIE = "katagami_owner";
const OWNER_COOKIE_SCOPE = "katagami-owner-v1";
const OWNER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function ownerSecret(): string {
  return process.env.KATAGAMI_OWNER_SECRET ?? "";
}

function ownerSignature(expiresAt: number, secret = ownerSecret()): string {
  return createHmac("sha256", secret)
    .update(`${OWNER_COOKIE_SCOPE}:${expiresAt}`)
    .digest("hex");
}

function createOwnerToken(secret: string): string {
  const expiresAt = Date.now() + OWNER_SESSION_MAX_AGE * 1000;
  return `${expiresAt}.${ownerSignature(expiresAt, secret)}`;
}

function isValidOwnerToken(token: string, secret: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }
  return safeEqual(signature, ownerSignature(expiresAt, secret));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isOwnerModeConfigured(): boolean {
  return ownerSecret().length > 0;
}

export async function isOwner(): Promise<boolean> {
  const secret = ownerSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(OWNER_COOKIE)?.value;
  return Boolean(token && isValidOwnerToken(token, secret));
}

export async function grantOwnerSession(passphrase: string): Promise<boolean> {
  const secret = ownerSecret();
  if (!secret || !safeEqual(passphrase, secret)) return false;

  const cookieStore = await cookies();
  cookieStore.set(OWNER_COOKIE, createOwnerToken(secret), {
    httpOnly: true,
    maxAge: OWNER_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function revokeOwnerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OWNER_COOKIE);
}

export async function assertOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error("Owner mode is required for this action.");
  }
}
