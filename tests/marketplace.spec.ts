import { test, expect } from "@playwright/test";
const origin = { Origin: "https://spotter.test" };
test("public pages preserve layout, show honest empty states, and protect workspaces", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/trainers",
    "/match",
    "/login",
    "/signup",
    "/about",
    "/privacy",
    "/terms",
    "/contact",
    "/become-a-trainer",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBe(true);
    }
    await expect(page.locator("body")).not.toContainText(
      /demo marketplace|sample profiles|illustrative|prototype/i,
    );
  }
  await page.goto("/trainers");
  await expect(
    page.getByRole("heading", { name: "No exact matches yet." }),
  ).toBeVisible();
  for (const route of ["/admin", "/trainer", "/dashboard/customer"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
  }
  expect((await request.get("/api/admin/users")).status()).toBe(401);
  expect((await request.get("/trainers/nonexistent")).status()).toBe(404);
  expect(errors).toEqual([]);
});
test("registration, cookie login, role enforcement, logout and server persistence", async ({
  page,
  request,
}) => {
  const email = `customer-${Date.now()}@spotter.test`;
  const created = await request.post("/api/auth/signup", {
    headers: origin,
    data: {
      firstName: "Amina",
      lastName: "Test",
      email,
      password: "integration-customer-password",
      confirmPassword: "integration-customer-password",
      terms: true,
    },
  });
  expect(created.status()).toBe(200);
  const cookie = created.headers()["set-cookie"];
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=lax");
  // Use the browser form to establish its own session and verify redirect handling.
  await page.route("**/api/auth/login", (route) =>
    route.continue({
      headers: { ...route.request().headers(), origin: "https://spotter.test" },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("integration-customer-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  const me = await request.get("/api/auth/me");
  expect((await me.json()).user.role).toBe("CUSTOMER");
  expect(
    (
      await request.post("/api/admin/settings", { headers: origin, data: {} })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/trainer/packages", { headers: origin, data: {} })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/favorites", {
        headers: { Origin: "https://evil.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const saved = await request.post("/api/account/profile", {
    headers: origin,
    data: {
      firstName: "Amina",
      lastName: "Updated",
      phone: "",
      fitnessGoals: ["Mobility"],
      preferredLocations: ["Clifton"],
    },
  });
  expect(saved.status()).toBe(200);
  const profile = await request.get("/api/dashboard/profile");
  expect((await profile.json()).profile.lastName).toBe("Updated");
  await request.post("/api/auth/logout", { headers: origin, data: {} });
  expect((await request.get("/api/dashboard/bookings")).status()).toBe(401);
});
test("trainer signup creates a private draft and privileged signup is rejected", async ({
  request,
}) => {
  const email = `trainer-${Date.now()}@spotter.test`;
  const body = {
    firstName: "Trainer",
    lastName: "Test",
    email,
    password: "integration-trainer-password",
    confirmPassword: "integration-trainer-password",
    terms: true,
    role: "TRAINER",
  };
  const response = await request.post("/api/auth/signup", {
    headers: origin,
    data: body,
  });
  expect(response.status()).toBe(200);
  const profile = await request.get("/api/trainer/verification");
  const data = await profile.json();
  expect(data.application.status).toBe("DRAFT");
  expect(data.trainer.profileVisibility).toBe("PRIVATE");
  expect(
    (
      await request.post("/api/auth/signup", {
        headers: origin,
        data: { ...body, email: "privileged@spotter.test", role: "ADMIN" },
      })
    ).status(),
  ).toBe(422);
  const publicTrainers = await request.get("/api/trainers");
  expect((await publicTrainers.json()).total).toBe(0);
});
test("admin login accesses real records and contact requests reach support", async ({
  request,
}) => {
  const login = await request.post("/api/auth/login", {
    headers: origin,
    data: {
      email: "admin@spotter.test",
      password: "integration-admin-password",
    },
  });
  expect(login.status()).toBe(200);
  const contact = await request.post("/api/contact", {
    headers: origin,
    data: {
      name: "Customer",
      email: "customer@spotter.test",
      subject: "A booking question",
      message: "Please help with a booking question.",
    },
  });
  expect(contact.status()).toBe(200);
  const support = await request.get("/api/admin/support");
  expect((await support.json()).items.length).toBeGreaterThan(0);
  const users = await request.get("/api/admin/users");
  expect(await users.text()).not.toContain("passwordHash");
});
