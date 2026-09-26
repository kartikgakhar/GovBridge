"""Signed short-lived API tokens and role checks for the prototype API."""

from __future__ import annotations

import os
from functools import wraps

from flask import g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from database import get_db_connection


_development_secret = "local-development-only-change-before-hosting"
_serializer = URLSafeTimedSerializer(
    os.environ.get("GOVBRIDGE_SECRET_KEY") or _development_secret,
    salt="govbridge-api-session-v1",
)
TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60


def issue_token(user_id: int, role: str) -> str:
    return _serializer.dumps({"user_id": int(user_id), "role": role.lower()})


def _load_current_user():
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        claims = _serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
        user_id, role = int(claims["user_id"]), str(claims["role"]).lower()
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        return None
    if role not in {"startup", "government"}:
        return None

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        db.close()
    if not user or str(user["role"]).lower() != role:
        return None
    return {"id": user_id, "role": role}


def require_api_user(*roles: str):
    """Require a valid server-issued bearer token, optionally with an allowed role."""
    allowed = {role.lower() for role in roles}

    def decorate(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            try:
                user = _load_current_user()
            except Exception:
                return jsonify({"error": "Authentication service unavailable."}), 503
            if user is None:
                return jsonify({"error": "Sign in again to continue."}), 401
            if allowed and user["role"] not in allowed:
                return jsonify({"error": "This account is not allowed to perform this action."}), 403
            g.api_user = user
            return view(*args, **kwargs)
        return wrapped
    return decorate


def token_user_id() -> int:
    return int(g.api_user["id"])


def token_user_role() -> str:
    return str(g.api_user["role"])
