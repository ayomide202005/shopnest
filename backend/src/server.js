import { env } from './config/env.js'; // must stay first: loads and validates environment variables
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import { startOrderJanitor } from './jobs/orderJanitor.js';

let server;
let stopJanitor;
let shuttingDown = false;

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${reason}. Shutting down...`);

  // Do not hang forever if a connection refuses to close.
  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after 10 seconds.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    stopJanitor?.();
    if (server) {
      server.closeIdleConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  } finally {
    process.exit(exitCode);
  }
}

async function start() {
  try {
    await connectDB(); // logs a clear explanation before throwing
  } catch {
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    console.log(`ShopNest API running on http://localhost:${env.port} (${env.nodeEnv})`);
    stopJanitor = startOrderJanitor();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.port} is already in use. Stop the other process or change PORT in backend/.env.`,
      );
    } else {
      console.error('Server error:', error);
    }
    shutdown('Server failed to start', 1);
  });
}

process.on('SIGINT', () => shutdown('SIGINT received'));
process.on('SIGTERM', () => shutdown('SIGTERM received'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  shutdown('Unhandled rejection', 1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('Uncaught exception', 1);
});

start();