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
  ).toBe(400);
  const publicTrainers = await request.get("/api/trainers");
  expect((await publicTrainers.json()).total).toBe(0);
});
test("trainer availability persists after adding, editing and removing windows in the production build", async ({
  page,
  request,
}) => {
  const anonymous = await request.post("/api/trainer/availability", {
    headers: origin,
    data: { rules: [] },
  });
  expect(anonymous.status()).toBe(401);
  const signup = {
    firstName: "Schedule",
    lastName: "Test",
    email: `schedule-${Date.now()}@spotter.test`,
    password: "integration-trainer-password",
    confirmPassword: "integration-trainer-password",
    terms: true,
    role: "TRAINER",
  };
  expect(
    (
      await page.request.post("/api/auth/signup", {
        headers: origin,
        data: signup,
      })
    ).status(),
  ).toBe(200);
  await page.goto("/trainer/availability");
  await expect(
    page.getByRole("heading", { name: "Your weekly schedule" }),
  ).toBeVisible();
  const windows = page.locator(".schedule-rule");
  const persist = async () => {
    const response = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/trainer/availability") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    expect((await response).status()).toBe(200);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your weekly schedule" }),
    ).toBeVisible();
  };
  await page.getByRole("button", { name: "Add time window" }).click();
  await page.getByRole("button", { name: "Add time window" }).click();
  await windows
    .nth(1)
    .getByRole("combobox", { name: "Day", exact: true })
    .selectOption("2");
  await persist();
  await expect(windows).toHaveCount(2);
  await expect(
    windows.nth(1).getByRole("combobox", { name: "Day", exact: true }),
  ).toHaveValue("2");
  await windows.first().getByLabel("Start", { exact: true }).fill("08:30");
  await persist();
  await expect(
    windows.first().getByLabel("Start", { exact: true }),
  ).toHaveValue("08:30");
  await windows
    .nth(1)
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await persist();
  await expect(windows).toHaveCount(1);
  const loaded = await (
    await page.request.get("/api/trainer/availability")
  ).json();
  expect(loaded.rules).toHaveLength(1);
  expect(loaded.rules[0].startTime).toBe("08:30");
  expect(loaded.rules[0].timezone).toBe("Asia/Karachi");
  const row = {
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "12:00",
    trainingTypes: ["gym"],
  };
  expect(
    (
      await page.request.post("/api/trainer/availability", {
        headers: origin,
        data: { rules: [row, row] },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/trainer/availability", {
        headers: origin,
        data: { rules: [{ ...row, startTime: "25:00" }] },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/trainer/availability", {
        headers: { ...origin, "Content-Type": "application/json" },
        data: "{invalid",
      })
    ).status(),
  ).toBe(400);
  expect(
    (await (await page.request.get("/api/trainer/availability")).json()).rules,
  ).toHaveLength(1);
  await windows
    .first()
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await persist();
  await expect(windows).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/trainer/availability")).json()).rules,
  ).toEqual([]);
  expect(
    (
      await request.post("/api/auth/signup", {
        headers: origin,
        data: {
          ...signup,
          role: "CUSTOMER",
          email: `schedule-customer-${Date.now()}@spotter.test`,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/trainer/availability", {
        headers: origin,
        data: { rules: [] },
      })
    ).status(),
  ).toBe(403);
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
