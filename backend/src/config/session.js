import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './env.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_COOKIE_NAME = 'shopnest.sid';

// Shared by the session cookie and by logout (the cookie must be cleared with matching options).
export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
};

export const sessionStore = MongoStore.create({
  mongoUrl: env.mongoUri,
  collectionName: 'sessions',
  ttl: SESSION_MAX_AGE_MS / 1000,
  touchAfter: 24 * 60 * 60, // refresh the stored session at most once a day
});

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false, // visitors who never sign in get no cookie
  store: sessionStore,
  cookie: { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_MS },
});


// Ends every session that belongs to one user (used after a password reset).
export const destroyUserSessions = async (userId) => {
  const id = String(userId);
  const sessions = await sessionStore.collectionP;
  await sessions.deleteMany({
    $or: [{ 'session.userId': id }, { session: { $regex: `"userId":"${id}"` } }],
  });
};