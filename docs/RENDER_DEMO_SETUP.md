# Create the first admin on Render

The hosted demo initializer creates the first active Super Admin, any missing roles, and a sample property after migrations. It reuses an existing property and skips setup if the database already contains a user. It never updates a user's credentials.

1. Push the initializer to the branch connected to the Render service. Make sure the build command compiles the backend with `npm run build`.
2. In **Render → new-nexora-condotel-system → Environment**, set the variables below. Enter the initial password directly in Render and keep it private. Use a unique password of 12–128 characters.

   | Variable | Value for the current free demo |
   | --- | --- |
   | `DATABASE_URL` | `file:/tmp/nexora.db` |
   | `NEXORA_RUNTIME_DATABASE_URL` | `file:/tmp/nexora.db` |
   | `NEXORA_INITIAL_ADMIN_EMAIL` | Your private admin email address |
   | `NEXORA_INITIAL_ADMIN_PASSWORD` | Your chosen private password |

3. Set the **Start Command** in Render service settings to:

   ```sh
   npx prisma migrate deploy --config prisma7.config.ts && node dist/prisma/initialize-hosted-demo.js && node dist/main.js
   ```

4. Deploy the updated branch. On a fresh database, look for `NEXORA initial Super Admin created.` in the Render logs. Open the Admin Dashboard and sign in with the email and password from step 2.

Render Free can discard SQLite data on restart, redeploy, or inactivity. Keep the two initial admin variables configured if you want the account recreated automatically on a fresh demo database. If a database already contains users, changed environment credentials do not change their passwords. Keep real guest and booking data on persistent storage.

The Admin Dashboard and API use different sites on their default Vercel and Render domains. Refresh cookies use `SameSite=Strict`, so a successful login can still return to sign-in after a reload. For persistent sessions, serve the dashboard and API from HTTPS subdomains of the same site.
