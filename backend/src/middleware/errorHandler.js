import { env } from '../config/env.js';

export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  if (isServerError) console.error(err);

  const body = {
    message:
      isServerError && env.isProduction ? 'Internal server error' : err.message || 'Something went wrong',
  };
  if (err.errorCode) body.code = err.errorCode;
  if (isServerError && !env.isProduction) body.stack = err.stack;

  return res.status(statusCode).json(body);
}