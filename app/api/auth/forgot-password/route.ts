import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/auth/http";
import { issueResetToken } from "@/lib/auth/reset-token";
import { forgotPasswordSchema, zodMessage } from "@/lib/auth/schemas";
import { findAuthUserByEmail } from "@/lib/auth/users";

const MESSAGE = "If an account exists for that email, a reset link is ready.";

function appOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? url.protocol.replace(":", "")}://${forwardedHost}`;
  }
  return url.origin;
}

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return json({ error: zodMessage(parsed.error) }, 400);
  }

  const user = await findAuthUserByEmail(parsed.data.email);
  if (!user || !user.isActive) {
    return json({ ok: true, message: MESSAGE });
  }

  const issued = issueResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: issued.hash,
      resetTokenExpiry: issued.expiresAt,
    },
  });

  const body: { ok: true; message: string; resetToken?: string; resetUrl?: string } = {
    ok: true,
    message: MESSAGE,
  };

  if (process.env.NODE_ENV === "development") {
    const resetUrl = `${appOrigin(request)}/reset-password?token=${encodeURIComponent(issued.token)}`;
    body.resetToken = issued.token;
    body.resetUrl = resetUrl;
  }

  return json(body);
}
