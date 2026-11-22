import { test, expect } from 'kryptheon/kryptheon-fixture';

test('partner end-to-end registration & email OTP verification flow', async ({ page }) => {
  // 1. Visit Partner Auth
  await page.goto('https://quickpress.online/auth');
  await expect(page).toHaveTitle(/QuickPress/i);

  // 2. Click Login on the Welcome Carousel
  const loginBtn = page.getByRole('button', { name: /login/i });
  await expect(loginBtn).toBeVisible();
  await loginBtn.click();

  // 3. Enter Phone Number
  const phoneInput = page.locator('#partner-phone-input');
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('7000000001');

  // 4. Submit Phone for OTP
  const continueBtn = page.getByRole('button', { name: /continue with otp/i });
  await expect(continueBtn).toBeEnabled();
  await continueBtn.click();

  // 5. Land on OTP Verification Screen
  await page.waitForURL(/.*\/otp.*/, { timeout: 15000 });
  const otpInput = page.locator('input[autoComplete="one-time-code"]');
  await expect(otpInput).toBeVisible();

  // 6. Enter Universal Bypass OTP 706513
  await otpInput.fill('706513');

  // 7. Verify Redirected to Registration (Strict un-onboarded protection)
  await page.waitForURL(/.*\/registration.*/, { timeout: 15000 });
  expect(page.url()).toContain('/registration');

  // 8. Verify First Name and Last Name inputs are visible
  const firstNameInput = page.locator('input[placeholder="e.g. Ramesh"]');
  await expect(firstNameInput).toBeVisible();
  await firstNameInput.fill('Aman');

  const lastNameInput = page.locator('input[placeholder="e.g. Kumar"]');
  await expect(lastNameInput).toBeVisible();
  await lastNameInput.fill('Sharma');

  // 9. Enter Email address
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
  await emailInput.fill('partner.test@withquickpress.com');

  // 10. Click Verify Email Button
  const verifyEmailBtn = page.getByRole('button', { name: /verify email/i });
  await expect(verifyEmailBtn).toBeEnabled();
  await verifyEmailBtn.click();

  // 11. Verify 6-Digit Email OTP Box appears
  const emailOtpInput = page.locator('input[placeholder="• • • • • •"]');
  await expect(emailOtpInput).toBeVisible({ timeout: 10000 });

  // 12. Enter Universal Bypass OTP 706513
  await emailOtpInput.fill('706513');

  // 13. Click Verify Code
  const verifyCodeBtn = page.getByRole('button', { name: /verify code/i });
  await expect(verifyCodeBtn).toBeEnabled();
  await verifyCodeBtn.click();

  // 14. Verify Email verified status indicator (Disabled email or success message)
  await expect(emailInput).toBeDisabled({ timeout: 10000 });
});
