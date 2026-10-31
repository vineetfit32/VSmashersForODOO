import { NextResponse } from "next/server";

import { clearSessionCookie, setSessionCookie } from "@/lib/auth/cookies";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function jsonWithSession(data: unknown, token: string, status = 200) {
  return setSessionCookie(json(data, status), token);
}

export function jsonWithoutSession(data: unknown, status = 200) {
  return clearSessionCookie(json(data, status));
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
