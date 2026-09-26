from flask import Blueprint, request
from database import get_db_connection
from api_security import require_api_user, token_user_id

evaluations = Blueprint("evaluations", __name__)


# ---------------- CREATE EVALUATION ----------------
@evaluations.route("/api/evaluations", methods=["POST"])
@require_api_user("government")
def create_evaluation():

    data = request.json

    proposal_id = data["proposal_id"]
    score = data["score"]
    comments = data.get("comments")

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
        return {"error": "You may only evaluate proposals for your department's challenges."}, 403

    query = """
        INSERT INTO evaluations
        (
            proposal_id,
            expert_id,
            score,
            comments
        )
        VALUES (%s, %s, %s, %s)
    """

    values = (
        proposal_id,
        token_user_id(),
        score,
        comments
    )

    cursor.execute(query, values)
    db.commit()

    evaluation_id = cursor.lastrowid

    cursor.close()
    db.close()

    return {
        "message": "Evaluation submitted successfully!",
        "evaluation_id": evaluation_id
    }, 201


# ---------------- GET ALL EVALUATIONS ----------------
@evaluations.route("/api/evaluations", methods=["GET"])
@require_api_user("government")
def get_evaluations():

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT e.* FROM evaluations e
        JOIN proposals p ON p.id = e.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE c.created_by = %s ORDER BY e.created_at DESC
    """

    cursor.execute(query, (token_user_id(),))

    result = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "evaluations": result
    }


# ---------------- GET EVALUATIONS FOR A PROPOSAL ----------------
@evaluations.route("/api/proposals/<int:proposal_id>/evaluations", methods=["GET"])
@require_api_user("government")
def get_proposal_evaluations(proposal_id):

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT e.* FROM evaluations e
        JOIN proposals p ON p.id = e.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE e.proposal_id = %s AND c.created_by = %s
        ORDER BY e.created_at DESC
    """

    cursor.execute(query, (proposal_id, token_user_id()))

    result = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "evaluations": result
    }


# ---------------- GET ONE EVALUATION ----------------
@evaluations.route("/api/evaluations/<int:evaluation_id>", methods=["GET"])
@require_api_user("government")
def get_evaluation(evaluation_id):

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    query = """
        SELECT e.*, c.created_by AS challenge_owner_id
        FROM evaluations e
        JOIN proposals p ON p.id = e.proposal_id
        JOIN challenges c ON c.id = p.challenge_id
        WHERE e.id = %s AND c.created_by = %s
    """

    cursor.execute(query, (evaluation_id, token_user_id()))

    evaluation = cursor.fetchone()

    cursor.close()
    db.close()

    if evaluation:
        return evaluation

    return {
        "message": "Evaluation not found"
    }, 404
