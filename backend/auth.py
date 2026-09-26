from flask import Blueprint, jsonify, request
from database import get_db_connection
from mysql.connector import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash
from api_security import issue_token
from rate_limiting import limiter

auth = Blueprint("auth", __name__)


# ---------------- REGISTER ----------------
@auth.route("/api/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    role = str(data.get("role", "")).strip().lower()
    organization_name = str(data.get("organization_name", data.get("org", ""))).strip()
    dpiit_number = str(data.get("dpiit_recognition_number", data.get("dpiit", ""))).strip() or None
    if not name or not email or not organization_name or not dpiit_number or not isinstance(password, str):
        return jsonify({"error": "Name, email, startup name, DPIIT recognition number, and password are required."}), 400
    if len(organization_name) < 2 or len(organization_name) > 200:
        return jsonify({"error": "Startup / entity name must be between 2 and 200 characters."}), 400
    if email.endswith("@govbridge.demo"):
        return jsonify({"error": "Demo email accounts cannot be registered."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if role != "startup":
        return jsonify({"error": "Public registration is for startup accounts only."}), 403

    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            """INSERT INTO users
               (name, email, password, password_hash, role, organization_name, dpiit_recognition_number)
               VALUES (%s, %s, NULL, %s, %s, %s, %s)""",
            (name, email, generate_password_hash(password), role, organization_name,
             dpiit_number if role == "startup" else None),
        )
        db.commit()
        return jsonify({"message": "User registered successfully!", "user_id": cursor.lastrowid}), 201
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "An account with this email already exists."}), 409
    finally:
        cursor.close()
        db.close()


# ---------------- LOGIN ----------------
@auth.route("/api/login", methods=["POST"])
@limiter.limit("8 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    role = data.get("role")
    if not email or not isinstance(password, str) or not role:
        return jsonify({"error": "Email, password, and role are required."}), 400
    if email.endswith("@govbridge.demo"):
        return jsonify({"message": "Invalid email, password or role"}), 401

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT id, name, email, role, organization_name, password, password_hash
               FROM users WHERE email = %s AND LOWER(role) = %s""",
            (email, role.lower()),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": "Invalid email, password or role"}), 401
        stored_hash = user.get("password_hash")
        if stored_hash:
            valid_password = check_password_hash(stored_hash, password)
        else:
            # Existing prototype accounts used plaintext passwords. Upgrade that
            # account to a one-way hash on its next successful sign-in.
            valid_password = user.get("password") == password
            if valid_password:
                upgraded_hash = generate_password_hash(password)
                cursor.execute(
                    "UPDATE users SET password_hash = %s, password = NULL WHERE id = %s",
                    (upgraded_hash, user["id"]),
                )
                db.commit()
        if not valid_password:
            return jsonify({"message": "Invalid email, password or role"}), 401
        user.pop("password", None)
        user.pop("password_hash", None)
        user["role"] = user["role"].lower()
        return jsonify({"message": "Login successful!", "user": user,
                        "token": issue_token(user["id"], user["role"])})
    finally:
        cursor.close()
        db.close()
