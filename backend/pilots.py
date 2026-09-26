from flask import Blueprint, request
from database import get_db_connection
from api_security import require_api_user, token_user_id

pilots = Blueprint("pilots", __name__)


# ---------------- CREATE PILOT ----------------
@pilots.route("/api/pilots", methods=["POST"])
@require_api_user("government")
def create_pilot():

    data = request.json

    proposal_id = data["proposal_id"]
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    status = data.get("status", "Planned")
    kpi = data.get("kpi")
    result = data.get("result")

    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute(
        """SELECT c.created_by FROM proposals p JOIN challenges c ON c.id = p.challenge_id
           WHERE p.id = %s""",
        (proposal_id,),
    )
    challenge = cursor.fetchone()
    if not challenge or int(challenge[0]) != token_user_id():
        cursor.close()
        db.close()
        return {"error": "You may only create pilots for your department's challenges."}, 403

    query = """
        INSERT INTO pilots
        (
            proposal_id,
            start_date,
            end_date,
            status,
            kpi,
            result
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    values = (
        proposal_id,
        start_date,
        end_date,
        status,
        kpi,
        result
    )

    cursor.execute(query, values)
    db.commit()

    pilot_id = cursor.lastrowid

    cursor.close()
    db.close()

    return {
        "message": "Pilot created successfully!",
        "pilot_id": pilot_id
    }, 201


# ---------------- GET ALL PILOTS ----------------
@pilots.route("/api/pilots", methods=["GET"])
@require_api_user("government")
def get_pilots():

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT pi.* FROM pilots pi
        JOIN proposals p ON p.id = pi.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE c.created_by = %s ORDER BY pi.created_at DESC
    """

    cursor.execute(query, (token_user_id(),))

    result = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "pilots": result
    }


# ---------------- GET ONE PILOT ----------------
@pilots.route("/api/pilots/<int:pilot_id>", methods=["GET"])
@require_api_user("government")
def get_pilot(pilot_id):

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT pi.* FROM pilots pi
        JOIN proposals p ON p.id = pi.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE pi.id = %s AND c.created_by = %s
    """

    cursor.execute(query, (pilot_id, token_user_id()))

    pilot = cursor.fetchone()

    cursor.close()
    db.close()

    if pilot:
        return pilot

    return {
        "message": "Pilot not found"
    }, 404


# ---------------- UPDATE PILOT ----------------
@pilots.route("/api/pilots/<int:pilot_id>", methods=["PUT"])
@require_api_user("government")
def update_pilot(pilot_id):

    data = request.json

    status = data.get("status")
    kpi = data.get("kpi")
    result = data.get("result")
    end_date = data.get("end_date")

    db = get_db_connection()
    cursor = db.cursor()

    query = """
        UPDATE pilots
        SET status = %s,
            kpi = %s,
            result = %s,
            end_date = %s
        WHERE id = %s AND proposal_id IN (
            SELECT p.id FROM proposals p JOIN challenges c ON c.id = p.challenge_id
            WHERE c.created_by = %s
        )
    """

    values = (
        status,
        kpi,
        result,
        end_date,
        pilot_id,
        token_user_id()
    )

    cursor.execute(query, values)
    db.commit()
    updated = bool(cursor.rowcount)

    cursor.close()
    db.close()

    return {
        "message": "Pilot updated successfully!" if updated else "Pilot not found.",
        "updated": updated
    }
