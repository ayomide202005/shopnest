# ShopNest progress

Last updated: 2026-11-10

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Project setup (frontend, backend, health check) | Done |
| 2 | Authentication (signup, email verification, login, logout, password reset, roles, admin script) | Done |
| 3 | Products, categories, image upload, admin dashboard, storefront | Done |
| 4 | Cart, checkout, Paystack payment, customer orders | Done (see Tested) |
| 5 | Admin order management (orders list and detail, status updates, refunds, order statistics) | Done |
| 6 | Deployment (Vercel + Render), webhook setup, production hardening | Not started |

## Phase 4: what exists

Backend
- Cart: guests can price a cart (POST /api/cart/preview). Signed-in customers have a cart saved on the server (GET, PUT /api/cart, POST /api/cart/merge). The cart stores only product ids and quantities. Prices, stock and totals always come from the database.
- Orders: POST /api/orders builds an order from the saved cart in one database transaction (re-checks products, reserves stock, snapshots names and prices, empties the cart). Max 3 unpaid orders per customer. Order numbers look like SN-261106-K7M2QX. Customers can list, open and cancel (unpaid only) their own orders.
- Unpaid orders are cancelled automatically 30 minutes plus a 10 minute grace after they are placed, and their stock is returned (background job every 5 minutes).
- Paystack: the order's total from the database is used, never a browser amount. POST /api/payments/verify and the signed webhook POST /api/payments/webhook both ask Paystack directly what happened. Wrong amounts, duplicate payments and late payments are handled and flagged for refund.
- Store rules are in backend/src/config/shop.js (delivery fee, payment window, grace period, unpaid order limit).

Frontend
- Guest cart in the browser, merged into the account cart after sign-in. Cart, checkout (/checkout), payment result (/payment/callback), order page (/orders/:id), My orders (/orders).

## Phase 5: what exists

Backend (all under /api/admin, admins only)
- GET /orders: search (order number, customer name, email, phone), filter by status and refunds waiting, sort, pagination.
- GET /orders/:id: full order with customer, payment details and status history.
- PATCH /orders/:id/status: processing, shipped, delivered, cancelled. Allowed moves: paid to processing or cancelled; processing to shipped or cancelled; shipped to delivered; unpaid to cancelled. Delivered and cancelled are final. Each change only applies if the order is still in the status that was read. Cancelling a paid order returns the stock (database transaction) and flags the order for refund.
- POST /orders/:id/refund-resolved: the owner confirms the refund was made.
- GET /stats now includes order counts by status, refunds waiting, and sales (last 30 days and all time).

Frontend
- Admin: Orders list, order page with action buttons and refund box, Orders link in the sidebar, order and sales cards on the dashboard (cards link to filtered lists).

## Tested

Backend (scripts run against the real database, then deleted)
- Cart API: 10 of 10 passed (one random failure on the first run; see known issues).
- Payments with a pretend Paystack: 16 of 16 passed.
- Real Paystack (test key): key accepted, payment page created, unpaid payment reported as "abandoned".
- Orders: a 13-check script was written; its result was never reported.
- Admin orders API: no automated script. Tested by hand through the admin screens.

Frontend (by hand in the browser)
- Cart screens: passed, including merge on sign-in.
- A Paystack test-card payment through the site ended on "Payment received": passed.
- Other Step 4.5 browser checks: only the payment check was reported; the rest are not recorded.
- Admin order screens (list, filters, status moves, cancel, refund flag and resolve, dashboard cards): passed.
- Lint and build pass.

## Environment variables

backend/.env (never commit it): NODE_ENV, PORT, MONGODB_URI (must include the database name ShopNest), SESSION_SECRET, CLIENT_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, PAYSTACK_SECRET_KEY (sk_test_... for development, sk_live_... only in production)

frontend/.env: VITE_API_URL

## Known issues and notes

- Paystack's webhook cannot reach localhost. Locally, payments are confirmed through the return page. Before going live, add https://<backend-address>/api/payments/webhook under Settings > API Keys & Webhooks in Paystack.
- Refunds are made by hand in the Paystack dashboard. The site only tracks them.
- There is no contact page. The customer refund message says "contact the store".
- Customers get no email when an order is shipped or cancelled.
- Delivery fee is free (DELIVERY_FEE_KOBO in backend/src/config/shop.js).
- Orders use database transactions, so they need MongoDB Atlas (or a replica set).
- Rare timing failure right after a test-only login (seen twice in test scripts, never in the browser).
- Deleted product images stay on Cloudinary.
- No automated test suite.
- The project sits inside OneDrive, which can slow or conflict with node_modules.
- Leftover Vite starter files should be deleted.
- The home page trust strip still has placeholder text.