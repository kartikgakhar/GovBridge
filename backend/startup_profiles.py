"""MySQL persistence for startup matching profiles."""

from flask import Blueprint, jsonify, request
from database import get_db_connection
from api_security import require_api_user, token_user_id

startup_profiles = Blueprint("startup_profiles", __name__)


@startup_profiles.route("/api/startups/<int:startup_id>/profile", methods=["GET", "PUT"])
@require_api_user("startup")
def startup_profile(startup_id):
    if startup_id != token_user_id():
        return jsonify({"error": "You may only access your own startup profile."}), 403
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE id = %s AND LOWER(role) = 'startup'", (startup_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Startup account not found."}), 404

        if request.method == "GET":
            cursor.execute(
                """SELECT industry, technology, capabilities, evidence, updated_at
                   FROM startup_profiles WHERE startup_id = %s""",
                (startup_id,),
            )
            profile = cursor.fetchone()
            return jsonify({"profile": profile or {
                "industry": "", "technology": "", "capabilities": "", "evidence": ""
            }})

        data = request.get_json(silent=True) or {}
        fields = {key: str(data.get(key, "")).strip() for key in
                  ("industry", "technology", "capabilities", "evidence")}
        limits = {"industry": 255, "technology": 2000, "capabilities": 4000, "evidence": 4000}
        if any(len(fields[key]) > limit for key, limit in limits.items()):
            return jsonify({"error": "One or more profile fields are too long."}), 400
        if not any(fields.values()):
            return jsonify({"error": "Fill in at least one startup profile field."}), 400

        cursor.execute(
            """INSERT INTO startup_profiles (startup_id, industry, technology, capabilities, evidence)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE industry = VALUES(industry), technology = VALUES(technology),
               capabilities = VALUES(capabilities), evidence = VALUES(evidence)""",
            (startup_id, fields["industry"], fields["technology"], fields["capabilities"], fields["evidence"]),
        )
        db.commit()
        return jsonify({"message": "Startup profile saved.", "profile": fields})
    finally:
        cursor.close()
        db.close()
