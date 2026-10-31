import { prisma } from "../lib/prisma";

const base = "http://localhost:3000";
const stamp = Date.now();
const emailA = `auth-a-${stamp}@example.com`;
const emailB = `auth-b-${stamp}@example.com`;
const password = "Valid#Pass1";
const nextPassword = "Next#Pass2";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cookiePair(response: Response) {
  const raw = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const session = raw.find((value) => value.startsWith("brightloop_session="));
  return { raw, session, header: session ? session.split(";")[0] : "" };
}

async function request(
  path: string,
  init: { method?: string; body?: unknown; cookie?: string; redirect?: RequestRedirect } = {},
) {
  const response = await fetch(base + path, {
    method: init.method ?? "GET",
    redirect: init.redirect ?? "manual",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const cookies = cookiePair(response);
  return { response, data, cookies };
}

async function main() {
  const weak = ["password", "Password1", "Ab!", "alllower!", "ALLUPPER!", "NoSpecial1"];
  for (const candidate of weak) {
    const result = await request("/api/auth/register", {
      method: "POST",
      body: {
        firstName: "Weak",
        lastName: "Password",
        companyName: "Weak Co",
        email: `weak-${stamp}-${candidate.length}@example.com`,
        password: candidate,
      },
    });
    assert(result.response.status === 400, `expected 400 for ${candidate}, got ${result.response.status}`);
  }

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Asha",
      lastName: "Tester",
      companyName: "Auth Test A",
      email: emailA,
      password,
      phone: "+91 90000 00001",
    },
  });
  assert(registered.response.status === 201, `register failed ${registered.response.status}`);
  assert(registered.cookies.session?.toLowerCase().includes("httponly"), "session cookie is not HttpOnly");
  assert(!registered.cookies.session?.toLowerCase().includes("secure"), "dev cookie should not be Secure");
  const userA = registered.data as { user: { role: string; customerId: string; email: string } };
  assert(userA.user.role === "CUSTOMER" && userA.user.customerId, "register did not create a customer scope");
  const cookieA = registered.cookies.header;

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Asha",
      lastName: "Tester",
      companyName: "Auth Test A",
      email: emailA,
      password,
    },
  });
  assert(duplicate.response.status === 409, "duplicate email was accepted");

  const registeredB = await request("/api/auth/register", {
    method: "POST",
    body: {
      firstName: "Bala",
      lastName: "Tester",
      companyName: "Auth Test B",
      email: emailB,
      password,
    },
  });
  assert(registeredB.response.status === 201, "second register failed");
  const userB = registeredB.data as { user: { customerId: string } };
  const cookieB = registeredB.cookies.header;

  const me = await request("/api/auth/me", { cookie: cookieA });
  assert(me.response.status === 200, "me failed");
  assert((me.data as { user: { email: string } }).user.email === emailA, "me returned the wrong user");

  const adminPage = await request("/admin", { cookie: cookieA });
  assert(adminPage.response.status === 307, `customer /admin status ${adminPage.response.status}`);
  assert(adminPage.response.headers.get("location")?.endsWith("/portal"), "customer was not sent to the portal");

  const staffPage = await request("/app", { cookie: cookieA });
  assert(staffPage.response.status === 307, "customer /app was not redirected");
  assert(staffPage.response.headers.get("location")?.endsWith("/portal"), "customer /app went to the wrong place");

  const portal = await request("/portal", { cookie: cookieA });
  assert(portal.response.status === 200, `portal status ${portal.response.status}`);
  assert(String(portal.data).includes("Auth Test A"), "portal did not render this customer's company");
  assert(!String(portal.data).includes("Auth Test B"), "portal leaked the other customer");

  const ownRecord = await request(`/portal/customers/${userA.user.customerId}`, { cookie: cookieA });
  assert(ownRecord.response.status === 200, "own customer page was blocked");

  const foreignRecord = await request(`/portal/customers/${userB.customerId}`, { cookie: cookieA });
  assert(foreignRecord.response.status === 403, `foreign customer page status ${foreignRecord.response.status}`);

  const ownApi = await request("/api/portal/account", { cookie: cookieA });
  assert(ownApi.response.status === 200, "own account API failed");
  assert((ownApi.data as { customer: { companyName: string } }).customer.companyName === "Auth Test A", "wrong company");

  const foreignApi = await request(`/api/portal/account?customerId=${userB.customerId}`, { cookie: cookieA });
  assert(foreignApi.response.status === 403, "foreign customer query was allowed");

  const loggedOut = await request("/api/auth/logout", { method: "POST", cookie: cookieA });
  assert(loggedOut.response.status === 200, "logout failed");
  assert(loggedOut.cookies.session?.includes("Max-Age=0"), "logout did not clear the cookie");

  const afterLogout = await request("/api/auth/me", { cookie: loggedOut.cookies.header });
  assert((afterLogout.data as { user: unknown }).user === null, "session survived logout");

  const anon = await request("/api/portal/account");
  assert(anon.response.status === 401, "anonymous portal API was not rejected");

  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: emailB, password: "Wrong#Pass1" },
  });
  assert(badLogin.response.status === 401, "bad password was accepted");

  const forgotMissing = await request("/api/auth/forgot-password", {
    method: "POST",
    body: { email: `missing-${stamp}@example.com` },
  });
  assert(forgotMissing.response.status === 200, "missing email should still return 200");
  assert(!(forgotMissing.data as { resetToken?: string }).resetToken, "missing email leaked a token");

  const forgot = await request("/api/auth/forgot-password", {
    method: "POST",
    body: { email: emailB },
  });
  const resetToken = (forgot.data as { resetToken?: string }).resetToken;
  assert(forgot.response.status === 200 && resetToken, "reset token was not issued");

  const badReset = await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: "not-a-real-token-value-000", password: nextPassword },
  });
  assert(badReset.response.status === 400, "bad reset token was accepted");

  const weakReset = await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: resetToken, password: "password" },
  });
  assert(weakReset.response.status === 400, "weak reset password was accepted");

  const reset = await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: resetToken, password: nextPassword },
  });
  assert(reset.response.status === 200, `reset failed ${reset.response.status} ${JSON.stringify(reset.data)}`);
  assert(reset.cookies.session?.toLowerCase().includes("httponly"), "reset did not set an HttpOnly cookie");

  const reused = await request("/api/auth/reset-password", {
    method: "POST",
    body: { token: resetToken, password: "Other#Pass3" },
  });
  assert(reused.response.status === 400, "reset token was reusable");

  const oldPassword = await request("/api/auth/login", {
    method: "POST",
    body: { email: emailB, password },
  });
  assert(oldPassword.response.status === 401, "old password still works");

  const newPassword = await request("/api/auth/login", {
    method: "POST",
    body: { email: emailB, password: nextPassword, next: "/admin" },
  });
  assert(newPassword.response.status === 200, "new password login failed");
  assert((newPassword.data as { redirectTo: string }).redirectTo === "/portal", "customer was sent into admin");

  for (const role of ["ADMIN", "STAFF", "CUSTOMER"] as const) {
    const switched = await request("/api/auth/dev-login", { method: "POST", body: { role } });
    assert(switched.response.status === 200, `dev login ${role} failed`);
    const home = role === "ADMIN" ? "/admin" : role === "STAFF" ? "/app" : "/portal";
    assert((switched.data as { redirectTo: string }).redirectTo === home, `dev login ${role} redirect`);
    const page = await request(home, { cookie: switched.cookies.header });
    assert(page.response.status === 200, `${role} could not open ${home}`);
  }

  const admin = await request("/api/auth/dev-login", { method: "POST", body: { role: "ADMIN" } });
  const adminCookie = admin.cookies.header;
  assert((await request("/api/admin/session", { cookie: adminCookie })).response.status === 200, "admin session API");
  assert((await request("/app", { cookie: adminCookie })).response.status === 200, "admin cannot open staff workspace");
  const adminPortal = await request("/portal", { cookie: adminCookie });
  assert(adminPortal.response.status === 307, "admin portal was not redirected");
  assert(adminPortal.response.headers.get("location")?.endsWith("/admin"), "admin portal redirect target");

  const staff = await request("/api/auth/dev-login", { method: "POST", body: { role: "STAFF" } });
  const staffCookie = staff.cookies.header;
  assert((await request("/api/admin/session", { cookie: staffCookie })).response.status === 403, "staff opened admin API");
  assert((await request("/api/app/session", { cookie: staffCookie })).response.status === 200, "staff session API");
  const staffAdmin = await request("/admin", { cookie: staffCookie });
  assert(staffAdmin.response.headers.get("location")?.endsWith("/app"), "staff admin redirect");

  const customer = await request("/api/auth/dev-login", { method: "POST", body: { role: "CUSTOMER" } });
  const customerApi = await request("/api/portal/account", { cookie: customer.cookies.header });
  assert(customerApi.response.status === 200, "seeded customer account failed");
  assert(
    (customerApi.data as { customer: { companyName: string } }).customer.companyName === "Northwind Analytics Pvt Ltd",
    "persona was not the seeded customer",
  );

  const home = await request("/");
  assert(home.response.status === 200, "home failed");
  assert(String(home.data).includes("Preview as"), "dev banner missing");
  assert(String(home.data).includes(">Admin<") || String(home.data).includes("Admin"), "admin switch missing");

  const loginPage = await request("/login");
  assert(loginPage.response.status === 200 && String(loginPage.data).includes("Sign in"), "login page missing");

  console.log("auth checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [emailA, emailB] } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    if (ids.length) {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
      });
      await prisma.customer.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });
