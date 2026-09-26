# Security and deployment readiness

## Current status

GovBridge is still a local development prototype. The Flask app now limits request bodies, restricts development CORS to local origins, adds baseline response headers, hides the database check endpoint in shared/production mode, and rate-limits API, login, AI, and chatbot requests. The backend issues expiring signed login tokens and checks roles on database APIs; startup profiles, proposals, evaluations, pilots, and milestones check ownership where implemented. The frontend sends the token with API calls. A share mode requires a private signing key, a dedicated non-root MySQL account, and a department invitation code. Existing sessions without a server token are cleared and must sign in again.

Several dashboard workflows still use browser-local prototype data. The share setup is only for a short demo with synthetic data; it is not production hosting or a promise of availability. Do not use sensitive real proposals or personal data.

## Required before public deployment

1. Finish and review authorization for every private route and workflow, including evaluation, pilot and milestone ownership; the production startup block in `backend/app.py` must remain until that review is complete.
2. Host behind HTTPS on a managed platform using its production WSGI server. Do not expose Flask's development server.
3. Set `GOVBRIDGE_ENV=production`, `GOVBRIDGE_ALLOWED_ORIGINS` to the exact HTTPS frontend origin(s), and `GOVBRIDGE_DB_HOST`, `GOVBRIDGE_DB_PORT`, `GOVBRIDGE_DB_NAME`, `GOVBRIDGE_DB_USER`, and `GOVBRIDGE_DB_PASSWORD` in the host's secret settings. Use a dedicated MySQL user with only the permissions the app needs; never use `root` or commit secrets.
4. Keep MySQL private to the app/network; allow inbound database traffic only from the app host. Enable automated backups and verify restore before using real user data.
5. Configure a shared Redis-backed rate-limit store and hosting/WAF request/concurrency limits. The current `memory://` limiter state is only for one local process and is not shared between workers. For capacity, choose a managed database sized for the workload, cap worker and DB connection counts, serve frontend assets via a CDN, and run a load test before promising a traffic level.
6. Review logs and alerts for repeated login failures, server errors, resource saturation, and backup failures. Do not log passwords, API keys, or full private proposal content.

## Short-lived HTTPS preview

The root `Caddyfile` serves the static interface and reverse-proxies `/api/*` to Flask and `/chat/*` to the chatbot. It binds only to `127.0.0.1:8080`, so a Cloudflare Quick Tunnel can expose a temporary HTTPS URL without opening Flask or MySQL ports. Quick Tunnels are for short demos, have a 200 concurrent-request limit, and have no uptime guarantee; they are not production hosting.

Before enabling share mode, set `GOVBRIDGE_ENV=share`, a unique random `GOVBRIDGE_SECRET_KEY`, a unique `GOVBRIDGE_GOV_SIGNUP_CODE`, and a dedicated MySQL username/password in the server environment. Never put these values in frontend files or send them to invitees. Anyone who gets the temporary URL can reach the demo; `X-Robots-Tag` asks search engines not to index it but is not an access-control mechanism. Use synthetic data only and stop the tunnel when finished.

`GOVBRIDGE_ALLOWED_ORIGINS` accepts comma-separated origins, for example `https://govbridge.example`. Never put `*` there for a public site. CORS is a browser boundary, not a replacement for authentication.

## Local development

Leave `GOVBRIDGE_ENV` unset (or set it to `development`) while using VS Code Live Server and the local Flask API. The local origins remain allowed for that workflow. Production settings are intentionally stricter.
