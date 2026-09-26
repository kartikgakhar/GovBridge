# GovBridge MySQL setup

The existing local `govbridge` database was inspected before changes. It already had the six core tables and sample records. Additive changes have added `password_hash`, `organization_name`, and `dpiit_recognition_number` to `users`; baseline, target, KPI, criteria, and evidence-requirement fields to `challenges`; and proposal detail/evidence fields to `proposals`. The old password column now allows `NULL`. Existing records were preserved. Legacy passwords are upgraded to hashes when their account next signs in.

## Existing local database

The current local database has already been migrated. **Do not run `schema.sql` against it.** `migrate_existing.sql` records the one-time additive change for reference; it has already been applied here.

`schema.sql` is only for creating a brand-new, empty database. It does not alter existing tables.

## Database connection configuration

The API reads these Windows environment variables (the defaults are local MySQL on `127.0.0.1:3306`, user `root`, database `govbridge`):

- `GOVBRIDGE_DB_HOST`
- `GOVBRIDGE_DB_PORT`
- `GOVBRIDGE_DB_USER`
- `GOVBRIDGE_DB_PASSWORD`
- `GOVBRIDGE_DB_NAME`

Set `GOVBRIDGE_DB_PASSWORD` to the password you use for your local MySQL account. Keep it private; do not put it in HTML, JavaScript, or chat. If your local MySQL root account has no password, leave this variable unset.

## Install and start the backend

In the VS Code terminal, run:

```powershell
Set-Location "E:\SIH main\GovBridge\backend"
python -m pip install -r requirements.txt
python app.py
```

Keep the terminal open. Visit `http://127.0.0.1:5000/api/test-db`; a successful response includes `"connected": true`. Signup and login API routes are `/api/register` and `/api/login`.

New passwords are stored as one-way hashes. Existing prototype passwords remain until each account signs in, when that account is upgraded automatically. The MySQL connection password stays in the Windows environment and is not kept in this repository.

The demo dashboards still use browser `localStorage`; their sample challenges, proposals, and pilot records have not been copied into MySQL yet.
