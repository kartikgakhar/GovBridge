"""MySQL connection helper for the GovBridge Flask API."""

from __future__ import annotations

import os

import mysql.connector


def get_db_connection():
    """Open a connection using environment configuration, never a source secret."""
    if os.getenv("GOVBRIDGE_ENV", "development").strip().lower() in {"share", "production"}:
        db_user = os.getenv("GOVBRIDGE_DB_USER", "").strip()
        db_password = os.getenv("GOVBRIDGE_DB_PASSWORD", "")
        if not db_user or db_user.lower() == "root" or not db_password:
            raise RuntimeError(
                "Production requires a dedicated non-root MySQL account and GOVBRIDGE_DB_PASSWORD."
            )
    return mysql.connector.connect(
        host=os.getenv("GOVBRIDGE_DB_HOST", "127.0.0.1"),
        port=int(os.getenv("GOVBRIDGE_DB_PORT", "3306")),
        user=os.getenv("GOVBRIDGE_DB_USER", "root"),
        password=os.getenv("GOVBRIDGE_DB_PASSWORD", ""),
        database=os.getenv("GOVBRIDGE_DB_NAME", "govbridge"),
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        connection_timeout=5,
    )
