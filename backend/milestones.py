from flask import Blueprint, request
from database import get_db_connection
from api_security import require_api_user, token_user_id

milestones = Blueprint("milestones", __name__)


# ---------------- CREATE MILESTONE ----------------
@milestones.route("/api/milestones", methods=["POST"])
@require_api_user("government")
def create_milestone():

    data = request.json

    pilot_id = data["pilot_id"]
    title = data["title"]
    description = data.get("description")
    due_date = data.get("due_date")
    status = data.get("status", "Pending")
    payment_amount = data.get("payment_amount")

    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute(
        """SELECT c.created_by FROM pilots pi
           JOIN proposals p ON p.id = pi.proposal_id
           JOIN challenges c ON c.id = p.challenge_id
           WHERE pi.id = %s""",
        (pilot_id,),
    )
    challenge = cursor.fetchone()
    if not challenge or int(challenge[0]) != token_user_id():
        cursor.close()
        db.close()
        return {"error": "You may only add milestones to your department's pilots."}, 403

    query = """
        INSERT INTO milestones
        (
            pilot_id,
            title,
            description,
            due_date,
            status,
            payment_amount
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    values = (
        pilot_id,
        title,
        description,
        due_date,
        status,
        payment_amount
    )

    cursor.execute(query, values)
    db.commit()

    milestone_id = cursor.lastrowid

    cursor.close()
    db.close()

    return {
        "message": "Milestone created successfully!",
        "milestone_id": milestone_id
    }, 201


# ---------------- GET ALL MILESTONES ----------------
@milestones.route("/api/milestones", methods=["GET"])
@require_api_user("government")
def get_milestones():

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT m.* FROM milestones m
        JOIN pilots pi ON pi.id = m.pilot_id
        JOIN proposals p ON p.id = pi.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE c.created_by = %s ORDER BY m.created_at DESC
    """

    cursor.execute(query, (token_user_id(),))

    result = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "milestones": result
    }


# ---------------- GET MILESTONES FOR A PILOT ----------------
@milestones.route("/api/pilots/<int:pilot_id>/milestones", methods=["GET"])
@require_api_user("government")
def get_pilot_milestones(pilot_id):

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT m.* FROM milestones m
        JOIN pilots pi ON pi.id = m.pilot_id
        JOIN proposals p ON p.id = pi.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE m.pilot_id = %s AND c.created_by = %s
        ORDER BY m.due_date ASC
    """

    cursor.execute(query, (pilot_id, token_user_id()))

    result = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "milestones": result
    }


# ---------------- GET ONE MILESTONE ----------------
@milestones.route("/api/milestones/<int:milestone_id>", methods=["GET"])
@require_api_user("government")
def get_milestone(milestone_id):

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT m.* FROM milestones m
        JOIN pilots pi ON pi.id = m.pilot_id
        JOIN proposals p ON p.id = pi.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE m.id = %s AND c.created_by = %s
    """

    cursor.execute(query, (milestone_id, token_user_id()))

    milestone = cursor.fetchone()

    cursor.close()
    db.close()

    if milestone:
        return milestone

    return {
        "message": "Milestone not found"
    }, 404


# ---------------- UPDATE MILESTONE ----------------
@milestones.route("/api/milestones/<int:milestone_id>", methods=["PUT"])
@require_api_user("government")
def update_milestone(milestone_id):

    data = request.json

    status = data.get("status")
    completed_at = data.get("completed_at")

    db = get_db_connection()
    cursor = db.cursor()

    query = """
        UPDATE milestones
        SET status = %s,
            completed_at = %s
        WHERE id = %s AND pilot_id IN (
            SELECT pi.id FROM pilots pi
            JOIN proposals p ON p.id = pi.proposal_id
            JOIN challenges c ON c.id = p.challenge_id
            WHERE c.created_by = %s
        )
    """

    values = (
        status,
        completed_at,
        milestone_id,
        token_user_id()
    )

    cursor.execute(query, values)
    db.commit()
    updated = bool(cursor.rowcount)

    cursor.close()
    db.close()

    return {
        "message": "Milestone updated successfully!" if updated else "Milestone not found.",
        "updated": updated
    }
