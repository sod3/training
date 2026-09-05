import { test, expect } from "@playwright/test";
const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1728, 1920];
test("homepage and key screens fit every requested viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/trainers",
    "/trainers/ahmed-raza",
    "/match",
    "/dashboard/customer",
    "/dashboard/trainer",
    "/admin",
    "/booking?trainer=ahmed-raza",
    "/login",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${route} overflows at ${width}`).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});
test("all navigation destinations resolve, unknown profiles show a useful 404", async ({
  request,
}) => {
  for (const route of [
    "/",
    "/trainers",
    "/trainers/ahmed-raza",
    "/trainers/usman-ali",
    "/trainers/omar-siddiqui",
    "/trainers/bilal-khan",
    "/trainers/fahad-malik",
    "/trainers/hassan-ahmed",
    "/match",
    "/match/results",
    "/compare",
    "/booking?trainer=usman-ali",
    "/checkout?package=p1_t8",
    "/booking/success",
    "/login",
    "/signup",
    "/about",
    "/how-it-works",
    "/become-a-trainer",
    "/locations",
    "/contact",
    "/help",
    "/safety",
    "/cancellation",
    "/privacy",
    "/terms",
    "/careers",
    "/dashboard/customer",
    ...[
      "bookings",
      "trainers",
      "saved",
      "messages",
      "progress",
      "payments",
      "reviews",
      "profile",
    ].map((x) => `/dashboard/customer/${x}`),
    "/dashboard/trainer",
    ...["calendar", "clients", "messages", "earnings", "profile"].map(
      (x) => `/dashboard/trainer/${x}`,
    ),
    "/admin",
    ...["applications", "bookings", "payouts", "disputes", "profile"].map(
      (x) => `/admin/${x}`,
    ),
  ]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }
  const missing = await request.get("/trainers/not-a-real-trainer");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("Looks like this workout moved");
});
test("filters, saved trainers, comparison and mobile sheet work", async ({
  page,
}) => {
  await page.goto("/trainers?type=online");
  await expect(page.locator(".trainer-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Save Bilal", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Trainer saved");
  await page
    .locator(".trainer-card")
    .first()
    .getByRole("button", { name: "Compare", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Compare trainers →", exact: true })
    .click();
  await expect(page.locator(".comparison-grid")).toContainText("Bilal Khan");
  await page.goto("/dashboard/customer/saved");
  await expect(page.locator(".trainer-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".trainer-card")).toHaveCount(1);
  await page.goto("/trainers?goal=Mobility");
  await expect(page.locator(".trainer-card")).toHaveCount(3);
  await page.getByLabel("Search trainers or specialties").fill("zzzzzz");
  await expect(
    page.getByRole("heading", { name: "No exact matches yet." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".trainer-card")).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "online", exact: true })
    .click();
  await page.getByRole("button", { name: "Show 4 trainers" }).click();
  await expect(page.locator(".trainer-card")).toHaveCount(4);
});
test("match preferences produce deterministic relevant results", async ({
  page,
}) => {
  await page.goto("/match");
  for (const answer of ["Build Muscle", "home", "DHA", "Evening"]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page
      .getByRole("button", { name: /Continue|Find my matches/ })
      .click();
  }
  await expect(page).toHaveURL(/match\/results/);
  await expect(page.locator(".trainer-card").first()).toContainText("Ahmed");
  await expect(page.locator(".trainer-card").first()).toContainText(
    "100% match",
  );
});
test("booking uses selected coach and price, persists, exports calendar, and handles cancellation", async ({
  page,
}) => {
  await page.goto("/booking?trainer=usman-ali");
  await page.getByRole("button", { name: "online", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose a time", exact: true })
    .click();
  await page.getByRole("button", { name: "8:00 AM", exact: true }).click();
  await page.getByRole("button", { name: "Continue to booking" }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator(".order-summary")).toContainText("Usman Ali");
  await expect(page.locator(".order-total")).toContainText("PKR 2,000");
  await page.getByLabel("Full name", { exact: true }).fill("Test Client");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Phone number", { exact: true }).fill("03001234567");
  await page.getByRole("button", { name: "Review & payment" }).click();
  await page.getByLabel("Test a failed demo payment").check();
  await page.getByRole("button", { name: "Confirm demo booking" }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "did not go through",
  );
  await page.getByLabel("Test a failed demo payment").uncheck();
  await page.getByRole("button", { name: "Confirm demo booking" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await expect(page.locator(".success-page")).toContainText("Usman Ali");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  expect((await download).suggestedFilename()).toMatch(/SPT-.*\.ics/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View booking →" }).click();
  await expect(page.locator(".booking-row")).toContainText("Usman Ali");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.locator(".booking-row .status")).toHaveText("Cancelled");
});
test("trainer applications and messages update demo state", async ({
  page,
}) => {
  await page.goto("/become-a-trainer");
  await page.getByLabel("Full name").fill("Test Coach");
  await page.getByLabel("Email", { exact: true }).fill("coach@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your qualifications")
    .fill("Sample coaching certificate");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your specialty").fill("Strength");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Training locations").fill("DHA");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Preferred availability").selectOption("Evening");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your coaching approach")
    .fill("Thoughtful strength coaching for beginners.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re on the list." }),
  ).toBeVisible();
  await page.goto("/admin/applications");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".application-row .status")).toHaveText("Approved");
  await page.goto("/dashboard/customer/messages?trainer=t8");
  await page
    .getByLabel("Your message")
    .fill("Hello, I’m interested in a trial.");
  await page.getByRole("button", { name: "Send demo message" }).click();
  await page.reload();
  await expect(page.locator(".message-bubble")).toContainText(
    "interested in a trial",
  );
});

test("booked slots cannot be reused and profile preferences survive reload", async ({
  page,
}) => {
  await page.goto("/booking?trainer=ahmed-raza");
  await page.getByRole("button", { name: "gym", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose a time", exact: true })
    .click();
  await page.getByRole("button", { name: "6:00 PM", exact: true }).click();
  await page.getByRole("button", { name: "Continue to booking" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Test Member");
  await page.getByLabel("Email", { exact: true }).fill("member@example.com");
  await page.getByLabel("Phone number").fill("03000000000");
  await page.getByRole("button", { name: "Review & payment" }).click();
  await page.getByRole("button", { name: "Confirm demo booking" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await page.goto("/booking?trainer=ahmed-raza");
  await page.getByRole("button", { name: "gym", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose a time", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "6:00 PM", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue to booking" }),
  ).toBeDisabled();
  await page.goto("/dashboard/customer/profile");
  await page.getByLabel("Name", { exact: true }).fill("New Name");
  await page.getByLabel("Training goal").selectOption("Mobility");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "New Name",
  );
  await expect(page.getByLabel("Training goal")).toHaveValue("Mobility");
  await page.goto("/dashboard/trainer/calendar");
  await page.getByRole("button", { name: "Log completed session" }).click();
  await expect(page.locator(".booking-row .status")).toHaveText("Completed");
  await page.goto("/dashboard/customer/reviews");
  await page
    .getByLabel("Your experience")
    .fill("Clear guidance and a thoughtful first session.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await page.reload();
  await expect(page.locator(".profile-review")).toContainText("Clear guidance");
});
test("map, price sorting, persisted URL filters, and accessible menu work", async ({
  page,
}) => {
  await page.goto("/trainers");
  await page.getByLabel("Sort trainers").selectOption("low");
  await expect(page.locator(".trainer-card").first()).toContainText("Omar");
  await page.getByRole("button", { name: "Show map" }).click();
  await expect(page.locator(".map-pin")).toHaveCount(6);
  await page.locator(".map-pin").first().hover();
  await expect(page.locator(".map-list-card.selected")).toHaveCount(1);
  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByLabel("Maximum session price").fill("2500");
  await page.reload();
  await expect(page.getByLabel("Maximum session price")).toHaveValue("2500");
  await expect(page.locator(".trainer-card")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
});
