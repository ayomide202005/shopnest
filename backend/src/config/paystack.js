import './env.js'; // makes sure backend/.env has been loaded first

const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

if (secretKey && !/^sk_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) {
  console.error('\nConfiguration error: PAYSTACK_SECRET_KEY looks wrong. It should start with sk_test_ or sk_live_.\n');
  process.exit(1);
}

if (!secretKey && process.env.NODE_ENV === 'production') {
  console.error('\nConfiguration error: PAYSTACK_SECRET_KEY must be set in production.\n');
  process.exit(1);
}

// null when no key is set (online payment is then switched off, everything else still works).
export const paystack = secretKey ? { secretKey, isTest: secretKey.startsWith('sk_test_') } : null;