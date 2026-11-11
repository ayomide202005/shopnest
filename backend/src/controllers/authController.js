import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js';
import {
  SESSION_COOKIE_NAME,
  destroyUserSessions,
  sessionCookieOptions,
} from '../config/session.js';

const httpError = (statusCode, message, errorCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
};

const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

const RESEND_RESPONSE =
  'If an account with that email exists and is not yet verified, we have sent a new verification email.';

const FORGOT_PASSWORD_RESPONSE =
  'If an account with that email exists, we have sent a password reset link.';

// Compared against when the email does not exist, so response time does not reveal it.
const DUMMY_HASH = await bcrypt.hash('not-a-real-password', 12);

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
});

const regenerateSession = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));

const saveSession = (req) =>
  new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

const destroySession = (req) => new Promise((resolve) => req.session.destroy(() => resolve()));

// POST /api/auth/signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw httpError(409, EMAIL_TAKEN_MESSAGE);
  }

  // Only these three fields are used, so a role can never come from the client.
  const user = new User({ name, email, password });
  const token = user.createEmailVerificationToken();

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) throw httpError(409, EMAIL_TAKEN_MESSAGE);
    throw error;
  }

  let emailSent = true;
  try {
    await sendVerificationEmail(user, token);
  } catch (error) {
    emailSent = false;
    console.error('Could not send verification email:', error.message);
  }

  return res.status(201).json({
    message: emailSent
      ? 'Account created. Please check your email to verify your account.'
      : 'Account created, but we could not send the verification email. Please use "Resend verification email".',
    emailSent,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

// POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  const user = await User.findOne({
    emailVerificationTokenHash: User.hashToken(req.body.token),
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw httpError(
      400,
      'This link is invalid or has expired. If you have already verified your email, you can sign in.',
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return res.json({ message: 'Email verified. You can now sign in.' });
};

// POST /api/auth/resend-verification
export const resendVerification = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Same answer for every case, sent before any email work, so timing does not give it away.
  res.json({ message: RESEND_RESPONSE });

  if (user && !user.isEmailVerified) {
    try {
      const token = user.createEmailVerificationToken();
      await user.save();
      await sendVerificationEmail(user, token);
    } catch (error) {
      console.error('Could not resend verification email:', error.message);
    }
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  // Always run exactly one bcrypt comparison, whether or not the user exists.
  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw httpError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  if (!user.isEmailVerified) {
    throw httpError(
      403,
      'Please verify your email address before signing in.',
      'EMAIL_NOT_VERIFIED',
    );
  }

  await regenerateSession(req); // new session ID at login (prevents session fixation)
  req.session.userId = user._id.toString();
  await saveSession(req); // make sure it is stored before the browser asks for /me

  return res.json({ message: 'Signed in successfully.', user: toPublicUser(user) });
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
  return res.json({ message: 'Signed out.' });
};

// GET /api/auth/me  (after requireAuth)
export const me = (req, res) => res.json({ user: toPublicUser(req.user) });

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Same answer whether or not the account exists, sent before any email work.
  res.json({ message: FORGOT_PASSWORD_RESPONSE });

  if (user) {
    try {
      const token = user.createPasswordResetToken();
      await user.save();
      await sendPasswordResetEmail(user, token);
    } catch (error) {
      console.error('Could not send password reset email:', error.message);
    }
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const user = await User.findOne({
    passwordResetTokenHash: User.hashToken(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw httpError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }

  user.password = req.body.password; // hashed automatically when saved
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.isEmailVerified = true; // they proved they own this email address
  await user.save();

  await destroyUserSessions(user._id); // sign the user out everywhere

  return res.json({ message: 'Password updated. You can now sign in with your new password.' });
};