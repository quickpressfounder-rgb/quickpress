import { test, expect } from 'kryptheon/kryptheon-fixture';

test('quickpress customer website landing and responsive navigation', async ({ page }) => {
  await page.goto('https://withquickpress.com');
  await expect(page).toHaveTitle(/QuickPress/i);

  // Verify Main Call to Actions and Heading are visible
  const heroHeading = page.locator('h1');
  await expect(heroHeading).toBeVisible();

  // Verify navigation buttons
  const downloadLinks = page.locator('a[href*="apk" i], button:has-text("Download"), a:has-text("Get Started")');
  await expect(downloadLinks.first()).toBeVisible();
});
