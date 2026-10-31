import { NextResponse } from "next/server";

export const SESSION_COOKIE = "billpilot_session";
const EIGHT_HOURS = 60 * 60 * 8;

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const sessionCookieOptions = {
  ...base,
  maxAge: EIGHT_HOURS,
};

export const clearCookieOptions = {
  ...base,
  maxAge: 0,
};

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    ...sessionCookieOptions,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    ...clearCookieOptions,
  });
  return response;
}
