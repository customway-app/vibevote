import { env } from './env.js';

// Optional server-side captcha verification.
// If not configured, this is a no-op (useful for local dev).
export async function verifyCaptcha(token: string | undefined) {
  if (!env.CAPTCHA_PROVIDER || !env.CAPTCHA_SECRET) {
    return true;
  }

  if (!token) {
    return false;
  }

  // hCaptcha verification endpoint.
  if (env.CAPTCHA_PROVIDER === 'hcaptcha') {
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.CAPTCHA_SECRET, response: token }).toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  }

  // reCAPTCHA v2/v3 verification endpoint.
  if (env.CAPTCHA_PROVIDER === 'recaptcha') {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.CAPTCHA_SECRET, response: token }).toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  }

  // Unknown provider
  return false;
}
