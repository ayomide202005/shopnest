import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { sessionMiddleware } from './config/session.js';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// In production the server sits behind the host's proxy. Trusting it makes visitor IP addresses
// (used by the rate limiters) and secure cookies work correctly.
if (env.isProduction) app.set('trust proxy', env.trustProxyHops);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      const error = new Error('Origin not allowed by CORS');
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(
  express.json({
    limit: '1mb',
    // Paystack's webhook signature is calculated over the exact bytes it sent,
    // so for that one route we keep a copy of the raw body.
    verify: (req, res, buffer) => {
      if (req.originalUrl.startsWith('/api/payments/webhook')) req.rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sessionMiddleware);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;