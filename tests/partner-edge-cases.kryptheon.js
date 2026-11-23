import { test, expect } from 'kryptheon/kryptheon-fixture';

test('partner invalid OTP handling & error banner visibility', async ({ page }) => {
  // 1. Open Auth page
  await page.goto('https://quickpress.online/auth');
  await expect(page).toHaveTitle(/QuickPress/i);

  // 2. Click Login
  const loginBtn = page.getByRole('button', { name: /login/i });
  await expect(loginBtn).toBeVisible();
  await loginBtn.click();

  // 3. Enter Phone
  const phoneInput = page.locator('#partner-phone-input');
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('7000000002');

  // 4. Submit Phone
  const continueBtn = page.getByRole('button', { name: /continue with otp/i });
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();

  // 5. Arrive at OTP page
  await page.waitForURL(/.*\/otp.*/, { timeout: 15000 });
  const otpInput = page.locator('input[autoComplete="one-time-code"]');
  await expect(otpInput).toBeVisible();

  // 6. Enter intentionally WRONG OTP (123456)
  await otpInput.fill('123456');

  // 7. Verify Invalid OTP Warning Sign appears
  const errorIndicator = page.locator('.animate-shake, div:has-text("Invalid OTP")');
  await expect(errorIndicator.first()).toBeVisible({ timeout: 10000 });

  // 8. Now enter the UNIVERSAL BYPASS OTP (706513)
  await otpInput.fill('706513');

  // 9. Verify Error clears and user advances to registration
  await page.waitForURL(/.*\/registration.*/, { timeout: 15000 });
  expect(page.url()).toContain('/registration');
});

