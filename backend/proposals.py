import json
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

from database import get_db_connection
from api_security import require_api_user, token_user_id, token_user_role


proposals = Blueprint("proposals", __name__)


@proposals.route("/api/proposals", methods=["POST"])
@require_api_user("startup")
def create_proposal():
    data = request.get_json(silent=True) or {}
    try:
        challenge_id = int(data.get("challenge_id"))
        startup_id = int(data.get("startup_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid challenge_id and startup_id are required."}), 400
    if startup_id != token_user_id():
        return jsonify({"error": "You may only submit proposals for your own startup."}), 403

    title = str(data.get("solution_title", "")).strip()
    status = str(data.get("status", "Submitted")).title()
    if not title:
        return jsonify({"error": "Solution title is required."}), 400
    if status not in {"Draft", "Submitted"}:
        return jsonify({"error": "Status must be Draft or Submitted."}), 400
    if status == "Submitted" and not str(data.get("description", "")).strip():
        return jsonify({"error": "A submitted solution needs a description."}), 400

    try:
        estimated_cost = Decimal(str(data["estimated_cost"])) if data.get("estimated_cost") not in (None, "") else None
        if estimated_cost is not None and estimated_cost < 0:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({"error": "Estimated cost must be a non-negative number."}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND LOWER(role) = 'startup'", (startup_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Startup account not found."}), 404

        cursor.execute("SELECT id, status FROM challenges WHERE id = %s", (challenge_id,))
        challenge = cursor.fetchone()
        if not challenge:
            return jsonify({"error": "Challenge not found."}), 404
        if status == "Submitted" and str(challenge["status"]).lower() != "open":
            return jsonify({"error": "This challenge is not open for submissions."}), 409

        cursor.execute(
            "SELECT id FROM proposals WHERE challenge_id = %s AND startup_id = %s",
            (challenge_id, startup_id),
        )
        if cursor.fetchone():
            return jsonify({"error": "This startup already has a proposal for this challenge."}), 409

        cursor.execute(
            """INSERT INTO proposals
               (challenge_id, startup_id, solution_title, description, problem, usp, tech_stack,
                estimated_cost, implementation_plan, expected_impact, timeline, previous_projects,
                team_details, approach, prototype_status, testing_evidence, security_compliance,
                pilot_plan, evidence, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                challenge_id, startup_id, title, data.get("description"), data.get("problem"),
                data.get("usp"), data.get("tech_stack"), estimated_cost,
                data.get("implementation_plan"), data.get("expected_impact"), data.get("timeline"),
                data.get("previous_projects"), data.get("team_details"), data.get("approach"),
                data.get("prototype_status"), data.get("testing_evidence"),
                data.get("security_compliance"), data.get("pilot_plan"),
                json.dumps(data.get("evidence", [])), status,
            ),
        )
        db.commit()
        return jsonify({"message": "Proposal saved.", "proposal_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        db.close()


@proposals.get("/api/proposals")
@require_api_user("government")
def get_proposals():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT p.*, u.organization_name AS startup_name, c.title AS challenge_title
               FROM proposals p
               JOIN users u ON u.id = p.startup_id
               JOIN challenges c ON c.id = p.challenge_id
               WHERE c.created_by = %s
               ORDER BY p.submitted_at DESC""",
            (token_user_id(),),
        )
        return jsonify({"proposals": cursor.fetchall()})
    finally:
        cursor.close()
        db.close()


@proposals.get("/api/startups/<int:startup_id>/proposals")
@require_api_user("government", "startup")
def get_startup_proposals(startup_id):
    if token_user_role() == "startup" and startup_id != token_user_id():
        return jsonify({"error": "You may only view your own proposals."}), 403
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        ownership_clause = " AND c.created_by = %s" if token_user_role() == "government" else ""
        values = (startup_id, token_user_id()) if ownership_clause else (startup_id,)
        cursor.execute(
            f"""SELECT p.*, u.organization_name AS startup_name, c.title AS challenge_title
               FROM proposals p
               JOIN users u ON u.id = p.startup_id
               JOIN challenges c ON c.id = p.challenge_id
               WHERE p.startup_id = %s{ownership_clause} ORDER BY p.submitted_at DESC""",
            values,
        )
        return jsonify({"proposals": cursor.fetchall()})
    finally:
        cursor.close()
        db.close()


@proposals.get("/api/challenges/<int:challenge_id>/proposals")
@require_api_user("government")
def get_challenge_proposals(challenge_id):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT created_by FROM challenges WHERE id = %s", (challenge_id,))
        challenge_owner = cursor.fetchone()
        if not challenge_owner:
            return jsonify({"message": "Challenge not found."}), 404
        if int(challenge_owner["created_by"]) != token_user_id():
            return jsonify({"error": "You may only review proposals for your department's challenges."}), 403
        cursor.execute(
            """SELECT p.*, u.organization_name AS startup_name, c.title AS challenge_title
               FROM proposals p
               JOIN users u ON u.id = p.startup_id
               JOIN challenges c ON c.id = p.challenge_id
               WHERE p.challenge_id = %s ORDER BY p.submitted_at DESC""",
            (challenge_id,),
        )
        return jsonify({"proposals": cursor.fetchall()})
    finally:
        cursor.close()
        db.close()


@proposals.get("/api/proposals/<int:proposal_id>")
@require_api_user("government", "startup")
def get_proposal(proposal_id):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT p.*, u.organization_name AS startup_name, c.title AS challenge_title,
                      c.created_by AS challenge_owner_id
               FROM proposals p
               JOIN users u ON u.id = p.startup_id
               JOIN challenges c ON c.id = p.challenge_id WHERE p.id = %s""",
            (proposal_id,),
        )
        proposal = cursor.fetchone()
        if proposal:
            if token_user_role() == "startup" and int(proposal["startup_id"]) != token_user_id():
                return jsonify({"error": "You may only view your own proposals."}), 403
            if token_user_role() == "government" and int(proposal["challenge_owner_id"]) != token_user_id():
                return jsonify({"error": "You may only view proposals for your department's challenges."}), 403
            return jsonify(proposal)
        return jsonify({"message": "Proposal not found"}), 404
    finally:
        cursor.close()
        db.close()
