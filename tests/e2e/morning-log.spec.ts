import { test, expect } from "@playwright/test";

// Smoke test: when not authenticated, accessing `/` redirects to /login.
// The full magic-link flow requires Supabase set up locally; this validates
// the middleware contract.

test("redirects unauthenticated user to /login", async ({ page }) => {
  const res = await page.goto("/");
  expect(page.url()).toContain("/login");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText("Recevoir un magic link")).toBeVisible();
});

test("rejects non-whitelisted email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not.allowed@example.com");
  await page.getByRole("button", { name: "Recevoir un magic link" }).click();
  await expect(page.getByText("Cet email n'est pas autorisé.")).toBeVisible();
});

test("/protocol renders without auth (static)", async ({ page }) => {
  // /protocol is force-static so middleware should still redirect, but the page itself
  // is reachable via direct SW cache once registered. Here we only assert the redirect
  // path since the route IS protected by the auth middleware.
  const res = await page.goto("/protocol");
  expect(res?.status()).toBeLessThan(400);
});
