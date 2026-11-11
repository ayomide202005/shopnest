import { randomInt } from 'node:crypto';

// No 0/O or 1/I, so numbers are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Example: SN-261105-K7M2QX
export function generateOrderNumber() {
  const now = new Date();
  const date =
    String(now.getUTCFullYear()).slice(2) +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');

  let code = '';
  for (let i = 0; i < 6; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];

  return `SN-${date}-${code}`;
}