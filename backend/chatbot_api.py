"""Standalone GovBridge chatbot with optional Gemini free-tier AI and FAQ fallback."""

from __future__ import annotations

import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request
from flask_cors import CORS
from rate_limiting import limiter


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024
limiter.init_app(app)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = "gemini-3.7-flash"
CORS(
    app,
    resources={
        r"/api/chat": {
            "origins": ["null", re.compile(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$")]
        }
    },
)

@app.get("/api/chat/health")
def chat_health():
    mode = "gemini_free_tier" if GEMINI_API_KEY else "free_offline_faq"
    return jsonify({"status": "ok", "configured": True, "mode": mode})


def gemini_reply(messages: list[dict[str, str]]) -> str | None:
    """Use Gemini only when a key is configured; let the caller fall back on errors."""
    if not GEMINI_API_KEY:
        return None

    recent_messages = messages[-8:]
    while recent_messages and recent_messages[0]["role"] != "user":
        recent_messages = recent_messages[1:]
    contents = [
        {
            "role": "model" if item["role"] == "assistant" else "user",
            "parts": [{"text": item["content"]}],
        }
        for item in recent_messages
    ]
    body = {
        "systemInstruction": {
            "parts": [{
                "text": (
                    "You are GovBridge Assistant. Help users understand the GovBridge "
                    "government-startup innovation platform: challenges, startup applications, "
                    "DPIIT recognition field, evaluation, pilots, procurement, and outcomes. "
                    "Be concise and friendly. Reply in the user's language. Do not claim to "
                    "see their account or database. If unsure about an official rule, say so."
                )}
            ]
        },
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 500},
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    req = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
        parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        answer = "".join(part.get("text", "") for part in parts).strip()
        return answer or None
    except (HTTPError, URLError, TimeoutError, ValueError, IndexError, KeyError):
        # Quota/network/model errors use the local FAQ and never switch providers.
        return None


def local_faq_reply(question: str) -> str:
    q = question.casefold()
    hindi = bool(re.search(r"[\u0900-\u097f]", question)) or any(
        word in q for word in ("kaise", "kya", "hai", "krna", "btao", "batao", "karo", "mujhe")
    )

    if re.search(r"\b(hi|hello|hey|namaste|namaskar)\b", q):
        return "Namaste! Main GovBridge ka free help chatbot hoon. Challenges, startup applications, evaluation, pilots, procurement, ya outcomes ke baare mein poochho."
    if any(word in q for word in ("pilot", "proof of concept", "poc")):
        return (
            "GovBridge mein pilot ka flow: department challenge publish karta hai, startup solution submit karta hai, proposal evaluate hota hai, phir selected startup time-bound pilot chalata hai. Pilot ke KPIs aur evidence record hote hain; department outcome verify karke procurement ya scale ka faisla kar sakta hai."
            if hindi else
            "A GovBridge pilot follows this flow: a department publishes a challenge, startups submit solutions, proposals are evaluated, and a selected startup runs a time-bound pilot. KPIs and evidence are recorded; the department verifies the outcome before deciding on procurement or scale."
        )
    if any(word in q for word in ("startup", "apply", "application", "proposal", "submit", "solution")):
        return (
            "Startup ke liye: account mein Startup role chuno, Browse Challenges kholo, relevant open challenge dekho, phir Submit Solution se proposal aur supporting evidence bhejo. Application status My Proposals mein dikhta hai."
            if hindi else
            "For a startup: choose the Startup role, open Browse Challenges, select a relevant open challenge, then use Submit Solution to send a proposal and supporting evidence. Track its status in My Proposals."
        )
    if any(word in q for word in ("dpiit", "dipp", "recognition number", "certificate number")):
        return (
            "Signup mein DPIIT Certificate of Recognition Number optional hai. Sirf recognized startup ho toh certificate par diya number enter karo; nahi hai toh blank chhod sakte ho."
            if hindi else
            "The DPIIT Certificate of Recognition Number is optional in signup. Enter the number shown on your certificate if your startup is recognized; otherwise, leave it blank."
        )
    if any(word in q for word in ("challenge", "department", "government", "post")):
        return (
            "Government role se sign in karke Post Challenge kholo. Problem, expected outcome, timeline aur available budget jaise details bharo, phir challenge publish karo. Applications Submitted Solutions aur Evaluation screens par manage hoti hain."
            if hindi else
            "Sign in with the Government role and open Post Challenge. Add the problem, expected outcome, timeline, and available budget, then publish it. Manage applications in Submitted Solutions and Evaluation."
        )
    if any(word in q for word in ("evaluate", "evaluation", "score", "review")):
        return (
            "Government dashboard ke Evaluation section mein submitted proposals review hote hain. Reviewers published criteria ke against proposal score karke decision record karte hain."
            if hindi else
            "Submitted proposals are reviewed in the Government Evaluation section. Reviewers score each proposal against the published criteria and record a decision."
        )
    if any(word in q for word in ("procurement", "purchase", "scale", "deployment", "outcome")):
        return (
            "Pilot complete hone par department outcome aur KPI evidence verify karta hai. Successful ya partially successful verified outcome ke baad proposal Procurement mein ja sakta hai; proven solution ko baad mein Scale stage par mark kiya ja sakta hai."
            if hindi else
            "After a pilot, the department verifies the outcome and KPI evidence. A successful or partially successful verified outcome can move to Procurement; a proven solution can later move to Scale."
        )
    return (
        "Main free offline help mode mein hoon aur sirf GovBridge ke common workflows ke baare mein jawab de sakta hoon. Startup application, challenge posting, evaluation, pilot, procurement, ya DPIIT signup field ke baare mein poochho."
        if hindi else
        "I’m running in free offline help mode and can answer common questions about GovBridge workflows. Ask about startup applications, posting a challenge, evaluation, pilots, procurement, or the DPIIT signup field."
    )


@app.post("/api/chat")
@limiter.limit("8 per minute")
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages")
    if not isinstance(messages, list) or not 1 <= len(messages) <= 12:
        return jsonify({"error": "Send between 1 and 12 chat messages."}), 400

    clean_messages = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {"user", "assistant"}:
            return jsonify({"error": "Each message must have a user or assistant role."}), 400
        content = message.get("content")
        if not isinstance(content, str) or not content.strip() or len(content) > 2000:
            return jsonify({"error": "Messages must contain 1 to 2000 characters."}), 400
        clean_messages.append({"role": message["role"], "content": content.strip()})

    if clean_messages[-1]["role"] != "user":
        return jsonify({"error": "The last chat message must be from the user."}), 400

    answer = gemini_reply(clean_messages)
    if answer:
        return jsonify({"reply": answer, "mode": "gemini_free_tier"})
    mode = "free_offline_faq"
    if GEMINI_API_KEY:
        mode = "free_offline_faq_fallback"
    return jsonify({"reply": local_faq_reply(clean_messages[-1]["content"]), "mode": mode})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
