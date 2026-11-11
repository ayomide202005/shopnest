import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../../.env'), quiet: true });

const fail = (message) => {
  console.error(`\nConfiguration error: ${message}`);
  console.error('Copy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
};

const nodeEnv = process.env.NODE_ENV || 'development';

const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) fail('MONGODB_URI is not set.');

const port = Number.parseInt(process.env.PORT ?? '5000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail(`PORT must be a number between 1 and 65535 (received "${process.env.PORT}").`);
}

const sessionSecret = process.env.SESSION_SECRET?.trim();
if (!sessionSecret || sessionSecret.length < 32) {
  fail('SESSION_SECRET must be set and at least 32 characters long.');
}

// How many proxies sit in front of the server in production (used for visitor IP addresses and secure cookies).
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  fail('TRUST_PROXY_HOPS must be a whole number between 0 and 5.');
}

// Email. Two ways to send, and at least one is required in production:
//  - Brevo over the web (BREVO_API_KEY + EMAIL_FROM). Works on hosts that block SMTP, such as Render's free plan.
//  - SMTP (SMTP_USER + SMTP_PASS + EMAIL_FROM), for example Gmail. Used when there is no Brevo key.
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, ''); // Google shows app passwords with spaces
const emailFrom = process.env.EMAIL_FROM?.trim();
const brevoApiKey = process.env.BREVO_API_KEY?.trim() || null;

const smtp =
  smtpUser && smtpPass && emailFrom
    ? {
        host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
        port: Number.parseInt(process.env.SMTP_PORT ?? '465', 10),
        secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
        user: smtpUser,
        pass: smtpPass,
        from: emailFrom,
      }
    : null;

if (brevoApiKey && !emailFrom) {
  fail('EMAIL_FROM must be set when BREVO_API_KEY is set (for example: ShopNest <you@example.com>).');
}

if (!smtp && !brevoApiKey && nodeEnv === 'production') {
  fail('Email is not configured. Set BREVO_API_KEY and EMAIL_FROM, or SMTP_USER, SMTP_PASS and EMAIL_FROM.');
}

// Cloudinary (product images). Optional in development, required in production.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const cloudApiKey = process.env.CLOUDINARY_API_KEY?.trim();
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// One folder per project (and per environment), so projects never mix in the Media Library.
const cloudFolder = (process.env.CLOUDINARY_FOLDER || 'shopnest').trim().toLowerCase();
if (!/^[a-z0-9][a-z0-9_-]{0,48}$/.test(cloudFolder)) {
  fail('CLOUDINARY_FOLDER may only contain lowercase letters, numbers, dashes and underscores (max 49 characters).');
}

const cloudinary =
  cloudName && cloudApiKey && cloudApiSecret
    ? { cloudName, apiKey: cloudApiKey, apiSecret: cloudApiSecret, folder: cloudFolder }
    : null;

if (!cloudinary && nodeEnv === 'production') {
  fail('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set in production.');
}

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  mongoUri,
  sessionSecret,
  trustProxyHops,
  smtp,
  brevoApiKey,
  emailFrom: emailFrom || null,
  cloudinary,
  clientUrls,
});