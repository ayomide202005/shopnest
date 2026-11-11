import { env } from './env.js';

// "ShopNest <shop@example.com>" -> "shop@example.com"
const addressOf = (from) => from?.match(/<([^>]+)>/)?.[1]?.trim() || from?.trim() || null;

// Where contact messages are delivered. Set CONTACT_EMAIL in backend/.env;
// if it is missing, messages go to the address the shop sends its emails from.
export const getContactInbox = () =>
  process.env.CONTACT_EMAIL?.trim() || env.smtp?.user || addressOf(env.emailFrom) || null;