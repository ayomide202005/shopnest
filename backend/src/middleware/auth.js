import mongoose from 'mongoose';
import User from '../models/User.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const SIGN_IN_MESSAGE = 'Please sign in to continue.';

// Blocks the request unless a valid user is signed in. Sets req.user.
export const requireAuth = async (req, res, next) => {
  const userId = req.session?.userId;

  if (!userId) {
    return next(httpError(401, SIGN_IN_MESSAGE));
  }

  const user = mongoose.isValidObjectId(userId) ? await User.findById(userId) : null;

  if (!user) {
    // The session points to a user that no longer exists: end it.
    return req.session.destroy(() => next(httpError(401, SIGN_IN_MESSAGE)));
  }

  req.user = user;
  return next();
};

// Use after requireAuth: router.get('/x', requireAuth, requireRole('admin'), handler)
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to do this.'));
    }
    return next();
  };

export const requireAdmin = requireRole('admin');