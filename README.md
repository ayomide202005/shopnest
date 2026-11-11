# ShopNest

A single-owner e-commerce site. React + Vite + Tailwind on the front, Node + Express + MongoDB on the back, Paystack for payments.

## Requirements

- Node.js 20 or newer
- A MongoDB Atlas database (orders use transactions, which Atlas supports)
- A Gmail account with an app password (for emails)
- A Cloudinary account (for product images)
- A Paystack account (use the TEST secret key while developing)

## Setup

1. Backend

       cd backend
       npm install
       copy .env.example .env

   Fill in `.env` (see `.env.example` for every key). Never commit it. Never share the secret keys.

2. Frontend

       cd frontend
       npm install

   Create `frontend/.env` with `VITE_API_URL=http://localhost:5000/api` (use your backend port).

## Run

Backend (auto-restarts on changes, except `.env` changes: type `rs` then Enter):

    cd backend
    npm run dev

Frontend:

    cd frontend
    npm run dev

Open http://localhost:5173

## Create the admin account

There is no public admin signup, by design. From the backend folder run:

    npm run create-admin

and follow the prompts. Use a strong password and never share it.

## Store settings

Delivery fee, payment window and similar rules are in `backend/src/config/shop.js`. Money is stored in kobo (100 kobo = N1).

## Payments

Payments use Paystack. Use `sk_test_...` keys while developing. When the backend is deployed, add this webhook address in the Paystack dashboard (Settings > API Keys & Webhooks): `https://<your-backend-address>/api/payments/webhook`. Paystack cannot reach localhost, so locally a payment is confirmed when the customer returns to the site.

## Checks (frontend)

    npm run lint
    npm run build

## Project layout

- `backend/src` controllers, routes, models, middleware, validators, services, jobs
- `frontend/src` pages, components, services (API calls), context (auth and cart)
- `PROGRESS.md` what is built, what is tested, known issues