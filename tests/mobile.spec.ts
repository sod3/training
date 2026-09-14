import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const widths = [320, 360, 375, 390, 414, 430];
const phoneHeights: Record<number, number> = {
  320: 568,
  360: 800,
  375: 812,
  390: 844,
  414: 896,
  430: 932,
};
const origin = { Origin: "https://localhost:3201" };
const audited: { route: string; width: number; height: number }[] = [];
const expectedTitles: Record<string, string> = {};

async function auditDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const width of widths) {
    const height = width === 320 ? 568 : 844;
    await page.setViewportSize({ width, height });
    await expect
      .poll(
        async () => {
          const box = await dialog.boundingBox();
          return (
            !!box &&
            box.x >= 8 &&
            box.y >= 0 &&
            box.x + box.width <= width - 8 &&
            box.y + box.height <= height
          );
        },
        { message: `Dialog fits ${width}px phone` },
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function audit(page: Page, routes: string[], state = "") {
  const output = `test-results/mobile/${test.info().project.name}`;
  await mkdir(output, { recursive: true });
  for (const route of routes) {
    await page.goto(route);
    if (
      route.startsWith("/dashboard/") ||
      route.startsWith("/trainer/") ||
      route === "/trainer" ||
      (route.startsWith("/admin") && route !== "/admin/login") ||
      route.startsWith("/booking/success?id=")
    )
      await expect(page).not.toHaveURL(/\/(?:admin\/)?login/);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".workspace-main > [role=status]")).toHaveCount(
      0,
    );
    if (route.startsWith("/booking?") || route.startsWith("/checkout?"))
      await expect(page.locator(".booking-page")).toBeVisible();
    if (route.startsWith("/booking/success?id="))
      await expect(page.locator(".success-page [role=status]")).toHaveCount(0);
    if (expectedTitles[route])
      await expect(
        page.getByRole("heading", { name: expectedTitles[route], exact: true }),
      ).toBeVisible();
    if (route === "/compare") {
      await expect(page.locator(".comparison-loading")).toHaveCount(0);
      if (
        await page.evaluate(
          () =>
            JSON.parse(sessionStorage.getItem("spotter-compare") || "[]")
              .length,
        )
      )
        await expect(
          page.locator(".comparison-grid article").first(),
        ).toBeVisible();
    }
    if (route === "/trainers" || route === "/locations")
      await expect(page.locator(".trainer-card-skeleton")).toHaveCount(0, {
        timeout: 20000,
      });
    for (const width of widths) {
      await page.setViewportSize({
        width,
        height: phoneHeights[width],
      });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          { message: `${route} overflow at ${width}px` },
        )
        .toBeLessThanOrEqual(1);
      const clippedControls = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "input:not([type=checkbox]):not([type=radio]), textarea, .btn",
          ),
        ]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (
              !r.width ||
              !r.height ||
              el.closest(
                ".showcase-track, .spotter-mobile-menu:not([data-open])",
              )
            )
              return false;
            return (
              r.width > innerWidth ||
              (el.scrollWidth > el.clientWidth + 3 && el.matches(".btn"))
            );
          })
          .map((el) => el.outerHTML.slice(0, 180)),
      );
      expect(clippedControls, `${route}: clipped controls at ${width}`).toEqual(
        [],
      );
      if (route === "/") {
        const heroFits = await page
          .locator(".spotter-hero-trust")
          .evaluate((element) => {
            const hero = element
              .closest(".spotter-hero")!
              .getBoundingClientRect();
            return element.getBoundingClientRect().bottom <= hero.bottom;
          });
        expect(heroFits, `Hero content fits at ${width}`).toBe(true);
      }
      if (await page.locator("#site-footer").count()) {
        const lastLink = page.locator(".footer-social-links a").last();
        await lastLink.scrollIntoViewIfNeeded();
        await page.evaluate(() =>
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "instant",
          }),
        );
        await expect
          .poll(
            () =>
              lastLink.evaluate((element) => {
                const box = element.getBoundingClientRect();
                return (
                  box.top >= 0 &&
                  box.bottom <= innerHeight + 0.5 &&
                  element.contains(
                    document.elementFromPoint(
                      box.x + box.width / 2,
                      box.y + box.height / 2,
                    ),
                  )
                );
              }),
            { message: `${route}: footer bottom reachable at ${width}` },
          )
          .toBe(true);
      }
      audited.push({
        route,
        width,
        height: phoneHeights[width],
      });
      if (width === 390)
        await page.screenshot({
          path: `${output}/${state}${route.split("?")[0].replace(/[^a-z0-9]+/gi, "-") || "home"}.png`,
          scale: "css",
          fullPage: true,
        });
    }
  }
  await writeFile(`${output}/audit.json`, JSON.stringify(audited, null, 2));
}

async function login(
  page: Page,
  email: string,
  password = "mobile-audit-password",
) {
  const response = await page.request.post("/api/auth/login", {
    headers: origin,
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test("public screens and phone navigation at all six widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (!e.message.includes("due to access control checks")) {
      errors.push(`${page.url()}: ${e.message}`);
    }
  });
  await audit(page, [
    "/",
    "/trainers",
    "/trainers/mobile-coach-0",
    "/match",
    "/match/results?goal=Strength+Training&experience=Beginner&time=Afternoon&budget=5000",
    "/booking",
    "/booking?trainer=mobile-coach-0",
    "/checkout?trainer=mobile-coach-0",
    "/booking/success",
    "/compare",
    "/login",
    "/signup",
    "/signup?role=trainer",
    "/admin/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/locations",
    "/about",
    "/how-it-works",
    "/become-a-trainer",
    "/contact",
    "/help",
    "/safety",
    "/privacy",
    "/terms",
    "/cancellation",
    "/careers",
    "/not-a-page",
  ]);
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Trainers", exact: true })
    .click();
  await expect(page).toHaveURL(/\/trainers$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".trainer-card")
    .first()
    .getByRole("button", { name: "Compare", exact: true })
    .click();
  await page
    .locator(".trainer-card")
    .nth(1)
    .getByRole("button", { name: "Compare", exact: true })
    .click();
  await audit(page, ["/compare"]);
  expect(errors).toEqual([]);
});

test("customer, trainer, onboarding, and admin screens with populated records", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (!e.message.includes("due to access control checks")) {
      errors.push(`${page.url()}: ${e.message}`);
    }
  });
  await login(page, "mobile-customer@spotter.test");
  await audit(page, [
    "/dashboard/customer",
    ...[
      "training",
      "bookings",
      "saved",
      "messages",
      "payments",
      "reviews",
      "profile",
      "security",
      "notifications",
    ].map((t) => `/dashboard/customer/${t}`),
  ]);
  const bookingResponse = await page.request.get("/api/dashboard/bookings");
  const orders = (await bookingResponse.json()).items;
  const statusTitles: Record<string, string> = {
    CONFIRMED: "You’re all set for training!",
    COMPLETED: "Training complete.",
    CANCELLED: "Booking cancelled.",
    REFUND_PENDING: "Your refund is under review.",
    REFUNDED: "Your refund is complete.",
    EXPIRED: "Reservation expired.",
  };
  for (const order of orders)
    expectedTitles[`/booking/success?id=${order._id}`] =
      statusTitles[order.bookingStatus] ||
      (order.paymentStatus === "REJECTED"
        ? "Your payment needs attention."
        : "Your Booking Status");
  await audit(
    page,
    orders.map((o: { _id: string }) => `/booking/success?id=${o._id}`),
  );
  await page.goto("/dashboard/customer/training");
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await expect(page.getByLabel("Send a message")).toBeVisible();
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(
    page.locator(".hub-sessions article.panel").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reschedule", exact: true })
    .first()
    .click();
  await auditDialog(page);
  await page.screenshot({ path: "test-results/mobile/rescheduling-sheet.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await login(page, "mobile-trainer0@spotter.test");
  await page.goto("/trainer");
  for (const width of widths) {
    await page.setViewportSize({ width, height: phoneHeights[width] });
    await page
      .getByRole("button", { name: "Open workspace navigation" })
      .click();
    const navigation = page.getByRole("dialog", {
      name: "Workspace navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(navigation.locator(".sidebar-identity")).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Profile", exact: true }),
    ).toBeVisible();
    await navigation
      .getByRole("button", { name: "Log out", exact: true })
      .scrollIntoViewIfNeeded();
    const unobscured = await navigation
      .getByRole("button", { name: "Log out", exact: true })
      .evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.bottom <= innerHeight &&
          element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ),
          )
        );
      });
    expect(unobscured, `Drawer logout reachable at ${width}`).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: `test-results/mobile/${test.info().project.name}/workspace-drawer.png`,
      });
    await page.keyboard.press("Escape");
    await expect(navigation).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open workspace navigation" }),
    ).toBeFocused();
  }
  await audit(page, [
    "/trainer",
    ...[
      "clients",
      "schedule",
      "availability",
      "messages",
      "earnings",
      "packages",
      "profile",
      "verification",
      "application",
      "notifications",
      "security",
    ].map((t) => `/trainer/${t}`),
    "/trainer/onboarding",
    "/dashboard/trainer",
  ]);
  await page.goto("/trainer/earnings");
  await page.getByRole("button", { name: "REQUEST PAYOUT" }).click();
  await auditDialog(page);
  await page.screenshot({ path: "test-results/mobile/payout-sheet.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/trainer/clients");
  await page.getByRole("button", { name: "Back to Client List" }).click();
  await expect(page.locator(".clients-list-col")).toBeVisible();
  await page.locator(".clients-list-col button").first().click();
  await expect(page.locator(".client-detail-col")).toBeVisible();
  await page.goto("/trainer/profile");
  for (const name of [
    "Public Information",
    "Verification & Identity",
    "Application Status",
    "Client Reviews",
    "Account & Security",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} at ${width}`,
      ).toBe(true);
    }
    await page.screenshot({
      path: `test-results/mobile/trainer-profile-${name.replace(/[^a-z]+/gi, "-")}.png`,
      fullPage: true,
    });
  }
  const draft = await page.request.post("/api/auth/signup", {
    headers: origin,
    data: {
      firstName: "New",
      lastName: "Coach",
      email: `mobile-draft-${test.info().project.name}@spotter.test`,
      password: "mobile-audit-password",
      confirmPassword: "mobile-audit-password",
      terms: true,
      role: "TRAINER",
    },
  });
  expect(draft.ok()).toBe(true);
  await page.goto("/trainer/onboarding");
  await expect(page.locator(".onboarding-card").first()).toBeVisible();
  for (let step = 0; step < 6; step++) {
    await page
      .getByLabel("Jump to application section")
      .selectOption(String(step));
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `onboarding step ${step} at ${width}`,
      ).toBe(true);
    }
    await page.screenshot({
      path: `test-results/mobile/onboarding-step-${step}.png`,
      fullPage: true,
    });
  }
  await login(page, "admin@spotter.test", "integration-admin-password");
  await audit(page, [
    "/admin",
    ...[
      "users",
      "customers",
      "trainers",
      "applications",
      "verification",
      "bookings",
      "payments",
      "refunds",
      "payouts",
      "operations",
      "categories",
      "specialties",
      "content",
      "sessions",
      "reviews",
      "support",
      "audit-logs",
      "settings",
      "notifications",
      "security",
      "reports",
    ].map((t) => `/admin/${t}`),
  ]);
  await page.goto("/admin/payments");
  await page.getByRole("button", { name: "✓ Approve Payment" }).first().click();
  const dialog = page.getByRole("dialog");
  await auditDialog(page);
  await page.screenshot({ path: "test-results/mobile/confirmation-sheet.png" });
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile matching, service selection, schedule and payment submission", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        origin: "https://localhost:3201",
      },
    }),
  );
  await page.goto("/match?edit=1");
  for (const key of ["goal", "experience", "time", "budget"]) {
    await expect(page.locator(".quiz-content")).toHaveAttribute(
      "data-question",
      key,
    );
    await page.locator(".quiz-options button").first().click();
    await expect(page.locator(".quiz-options button").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const width of widths) {
      await page.setViewportSize({ width, height: phoneHeights[width] });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Matching ${key} at ${width}`,
      ).toBe(true);
    }
    await page.locator(".quiz-content > .btn").click();
  }
  await expect(page).toHaveURL(/\/match\/results/);
  await login(page, "mobile-customer@spotter.test");
  await page.goto("/trainers/mobile-coach-0");
  await expect(page.locator(".booking-sidebar")).toBeVisible();
  await page
    .locator(".booking-sidebar")
    .getByRole("button", { name: /Build your routine/ })
    .click();
  await page
    .locator(".booking-sidebar .overflow-x-auto button")
    .first()
    .click();
  await page
    .locator(".booking-sidebar .choice-chips")
    .last()
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("link", { name: "Continue to Booking" }).click();
  await expect(
    page.getByRole("heading", { name: "Select Payment Method" }),
  ).toBeVisible();
  await expect(page.locator(".payment-method-cards button")).toHaveCount(3);
  for (const method of ["Easypaisa", "Bank Transfer", "JazzCash"]) {
    const option = page
      .locator(".payment-method-cards")
      .getByRole("button", { name: new RegExp(method) });
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${method} at ${width}`,
      ).toBe(true);
    }
  }
  await page.screenshot({
    path: "test-results/mobile/payment-details.png",
    fullPage: true,
  });
  await page.getByLabel("Name used for transfer").fill("Amina Khan");
  await page.getByLabel("Transaction ID").fill(`MOBILE-FLOW-${Date.now()}`);
  await page
    .getByLabel("Payment screenshot")
    .setInputFiles("public/images/ahmed.webp");
  await page.getByRole("button", { name: "Submit payment for review" }).click();
  await expect(page).toHaveURL(/\/booking\/success\?id=/);
  await expect(
    page.getByText("Payment Proof Submitted & Under Admin Review"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile/submitted-booking.png",
    fullPage: true,
  });
});

test("mobile loading, errors, empty accounts, registration, success and touch motion", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        origin: "https://localhost:3201",
      },
    }),
  );
  let releaseLoading!: () => void;
  const loadingGate = new Promise<void>((resolve) => {
    releaseLoading = resolve;
  });
  await page.route("**/api/trainers?**", async (route) => {
    await loadingGate;
    await route.continue();
  });
  await page.goto("/trainers");
  await expect(page.locator(".trainer-card-skeleton").first()).toBeVisible();
  await page.screenshot({
    path: `test-results/mobile/loading-${test.info().project.name}.png`,
    scale: "css",
  });
  releaseLoading();
  await expect(page.locator(".trainer-card-skeleton")).toHaveCount(0);
  await page.unroute("**/api/trainers?**");
  await page.route("**/api/trainers?**", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error:
          "Trainers are temporarily unavailable. Please try again shortly.",
      },
    }),
  );
  await audit(page, ["/trainers"], "error");
  await expect(
    page.getByRole("alert").filter({ hasText: "temporarily unavailable" }),
  ).toBeVisible();
  await page.unroute("**/api/trainers?**");
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("mobile-customer@spotter.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator(".form-error")).toBeVisible();
  await page.goto("/signup");
  await page.getByLabel("First name", { exact: true }).fill("Sara");
  await page.getByLabel("Last name", { exact: true }).fill("Ali");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`mobile-new-${test.info().project.name}@spotter.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("mobile-audit-password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("mobile-audit-password");
  await page.locator("input[name=terms]").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/customer/);
  await audit(
    page,
    [
      "/dashboard/customer",
      "/dashboard/customer/training",
      "/dashboard/customer/saved",
      "/dashboard/customer/notifications",
    ],
    "empty",
  );
  await page.goto("/trainers/mobile-coach-0");
  await page.getByRole("link", { name: "Message Ahmed", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/customer\/training/);
  await page
    .getByRole("button", { name: "Message trainer", exact: true })
    .click();
  await expect(page).toHaveURL(/section=messages/);
  await expect(
    page.getByRole("heading", { name: "Messages with your coach" }),
  ).toBeVisible();
  await expect(page.getByLabel("Send a message")).toBeVisible();
  await page
    .getByLabel("Send a message")
    .fill("Hello! I’d like to learn more about your coaching.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message-history")).toContainText(
    "Hello! I’d like to learn more about your coaching.",
  );
  await audit(page, ["/dashboard/customer/messages"], "pre-booking-chat");
  await page.goto("/contact");
  await page.getByLabel("Your name", { exact: true }).fill("Sara Ali");
  await page.getByLabel("Email", { exact: true }).fill("sara@example.test");
  await page.getByLabel("Subject", { exact: true }).fill("Finding a coach");
  await page
    .getByLabel("How can we help?", { exact: true })
    .fill("I would like help finding the right online coach.");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.locator(".form-success")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 412, height: 915 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator(".performance-story").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  }
});
