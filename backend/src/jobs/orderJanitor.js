import { releaseExpiredOrders } from '../services/orderService.js';

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// Releases the stock held by unpaid orders whose time ran out. Returns a function that stops it.
export function startOrderJanitor() {
  const run = async () => {
    try {
      const released = await releaseExpiredOrders();
      if (released > 0) console.log(`Released ${released} expired unpaid order(s).`);
    } catch (error) {
      // A failed cleanup must never crash the server. It simply tries again next time.
      console.error('Order cleanup failed:', error.message);
    }
  };

  run();
  const timer = setInterval(run, INTERVAL_MS);
  timer.unref(); // does not keep the process alive on its own
  return () => clearInterval(timer);
}