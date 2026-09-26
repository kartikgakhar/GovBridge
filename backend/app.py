import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import Error as MySQLError

from auth import auth
from challenges import challenges
from proposals import proposals
from evaluations import evaluations
from pilots import pilots
from milestones import milestones
from recommendations import recommendations
from startup_profiles import startup_profiles
from database import get_db_connection
from rate_limiting import limiter


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # No uploads; reject oversized API requests.

APP_ENV = os.environ.get("GOVBRIDGE_ENV", "development").strip().lower()
if APP_ENV == "production":
    allowed_origins = [origin.strip() for origin in
                       os.environ.get("GOVBRIDGE_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
    if not allowed_origins:
        raise RuntimeError("Set GOVBRIDGE_ALLOWED_ORIGINS to the exact HTTPS frontend origin(s).")
    # Fail closed until the prototype's remaining production-readiness work is complete.
    raise RuntimeError(
        "Production deployment is blocked pending a complete authorization audit, shared rate-limit storage, "
        "persistent implementation of prototype workflows, and a capacity review."
    )
elif APP_ENV == "share":
    if not os.environ.get("GOVBRIDGE_SECRET_KEY", "").strip():
        raise RuntimeError("Set a private GOVBRIDGE_SECRET_KEY before starting a shared preview.")
    if not os.environ.get("GOVBRIDGE_GOV_SIGNUP_CODE", "").strip():
        raise RuntimeError("Set GOVBRIDGE_GOV_SIGNUP_CODE to protect Government account registration.")
    configured_origins = [origin.strip() for origin in
                          os.environ.get("GOVBRIDGE_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
    allowed_origins = configured_origins or [r"http://(localhost|127\.0\.0.1)(:\d+)?$"]
else:
    # Local VS Code Live Server only. Set an exact allowlist before any hosted use.
    allowed_origins = [r"http://(localhost|127\.0\.0\.1)(:\d+)?$"]

CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
limiter.init_app(app)


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("X-Robots-Tag", "noindex, nofollow, noarchive")
    if APP_ENV in {"production", "share"} and request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.errorhandler(MySQLError)
def handle_database_error(_error):
    return jsonify({"error": "Database connection failed. Check MySQL and its connection settings."}), 503


# ---------------- HOME ----------------
@app.route("/")
def home():
    return "GovBridge API is running."


# ---------------- TEST DATABASE ----------------
@app.route("/api/test-db")
def test_db():
    if APP_ENV in {"production", "share"}:
        return jsonify({"error": "Not found."}), 404
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT DATABASE()")
        result = cursor.fetchone()
        return jsonify({"connected": True, "database": result[0]})
    finally:
        cursor.close()
        db.close()


# ---------------- AUTHENTICATION ----------------
app.register_blueprint(auth)


# ---------------- CHALLENGES ----------------
app.register_blueprint(challenges)


# ---------------- PROPOSALS ----------------
app.register_blueprint(proposals)


# ---------------- EVALUATIONS ----------------
app.register_blueprint(evaluations)


# ---------------- PILOTS ----------------
app.register_blueprint(pilots)


# ---------------- MILESTONES ----------------
app.register_blueprint(milestones)
app.register_blueprint(recommendations)
app.register_blueprint(startup_profiles)


# ---------------- START SERVER ----------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
