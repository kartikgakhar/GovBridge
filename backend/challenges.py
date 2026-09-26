from decimal import Decimal, InvalidOperation
import json

from flask import Blueprint, jsonify, request

from database import get_db_connection
from api_security import require_api_user, token_user_id


challenges = Blueprint("challenges", __name__)


@challenges.route("/api/challenges", methods=["GET"])
def list_challenges():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT c.*, COUNT(p.id) AS proposal_count
               FROM challenges c LEFT JOIN proposals p ON p.challenge_id = c.id
               WHERE LOWER(c.status) = 'open'
               GROUP BY c.id ORDER BY c.created_at DESC"""
        )
        return jsonify({"challenges": cursor.fetchall()})
    finally:
        cursor.close()
        db.close()


@challenges.route("/api/challenges/<int:challenge_id>", methods=["GET"])
def get_challenge(challenge_id):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM challenges WHERE id = %s AND LOWER(status) = 'open'", (challenge_id,))
        challenge = cursor.fetchone()
        if not challenge:
            return jsonify({"message": "Challenge not found"}), 404
        return jsonify(challenge)
    finally:
        cursor.close()
        db.close()


@challenges.route("/api/challenges", methods=["POST"])
@require_api_user("government")
def create_challenge():
    data = request.get_json(silent=True) or {}
    required = ("department_id", "title")
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"error": "Required fields are missing.", "fields": missing}), 400
    if str(data.get("department_id")) != str(token_user_id()):
        return jsonify({"error": "You may only post challenges for your own department account."}), 403

    status = str(data.get("status", "Open")).title()
    if status not in {"Draft", "Open", "Closed"}:
        return jsonify({"error": "Status must be draft, open, or closed."}), 400
    if status == "Open" and not str(data.get("description", "")).strip():
        return jsonify({"error": "A published challenge needs a description."}), 400
    try:
        budget_min = Decimal(str(data["budget_min"])) if data.get("budget_min") not in (None, "") else None
        budget_max = Decimal(str(data["budget_max"])) if data.get("budget_max") not in (None, "") else None
        if any(amount is not None and amount < 0 for amount in (budget_min, budget_max)):
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({"error": "Budgets must be non-negative numbers."}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT organization_name, name FROM users
               WHERE id = %s AND LOWER(role) = 'government'""",
            (data["department_id"],),
        )
        department = cursor.fetchone()
        if not department:
            return jsonify({"error": "Government account not found."}), 404

        cursor.execute(
            """INSERT INTO challenges
               (title, department, category, location, budget_min, budget_max,
                description, current_situation, expected_solution, beneficiaries,
                timeline, tech_preference, eligibility, deadline, status,
                baseline, target, kpis, capability_criteria, evidence_requirements, created_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                       %s, %s, %s, %s, %s, %s)""",
            (
                str(data["title"]).strip(),
                str(data.get("department") or department.get("organization_name") or department["name"]).strip(),
                data.get("category"), data.get("location"), budget_min, budget_max,
                str(data.get("description", "")).strip(),
                data.get("current_situation"), data.get("expected_solution", data.get("expected_outcome")),
                data.get("beneficiaries"), data.get("timeline"), data.get("tech_preference"),
                data.get("eligibility"), data.get("deadline") or None, status,
                data.get("baseline"), data.get("target"),
                json.dumps(data.get("kpis", [])),
                json.dumps(data.get("capability_criteria", [])),
                json.dumps(data.get("evidence_requirements", [])), data["department_id"],
            ),
        )
        db.commit()
        return jsonify({"message": "Challenge created.", "challenge_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        db.close()
