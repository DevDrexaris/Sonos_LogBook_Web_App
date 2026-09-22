# Sono

Digital work record management system built with React/Vite and a PHP/PDO REST API.

## Local setup

1. Install Node.js and XAMPP. Copy `backend` to `C:\xampp\htdocs\logbook\backend`.
2. Create `backend/.env` from `backend/.env.example`. Keep database credentials server-side only.
3. Start Apache and MySQL in XAMPP. Import `database/schema.sql` in phpMyAdmin, then optionally `database/seed.sql` (the seeded admin password is `password`). Change it immediately.
4. Run `cd frontend`, `npm install`, copy `.env.example` to `.env`, and run `npm run dev`.
5. Open `http://localhost:5173`. The API default is `http://localhost/logbook/backend/api`.

## Google OAuth

Create a Web application OAuth client in Google Cloud Console. Set the authorized redirect URI to the value of `GOOGLE_REDIRECT_URI` and configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the PHP environment. Implement the provider callback at `api/auth/google.php` using the Google OAuth authorization-code flow; secrets never belong in Vite. The current normal account flow is fully functional without OAuth credentials.

## Production

Host the PHP `backend` on Apache or another PHP-compatible service, provision a cloud MySQL-compatible database, import `database/schema.sql`, and configure the backend environment variables. Set `APP_ORIGIN` to the Vercel domain and `VITE_API_URL` in Vercel to the public PHP API `/api` URL. Add the production Google redirect URI in Google Cloud. Configure HTTPS, secure session cookies, backups, and server-side error logging at the host.

## API

Auth endpoints live under `backend/api/auth`; log CRUD under `backend/api/logs`; admin endpoints under `backend/api/admin`. All database access uses PDO prepared statements, and authorization is checked in PHP for every protected operation.
