from flask import Blueprint, request, jsonify
from ..tines_client import send_to_tines

actions_bp = Blueprint("actions", __name__)

def _payload(request):
    data    = request.get_json() or {}
    target  = data.get("target", "").strip()
    case_id = data.get("case_id", "")
    email   = data.get("email", "")
    token   = data.get("token", "")
    return target, case_id, email, token

@actions_bp.route("/whois", methods=["POST"])
def whois():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No target provided"}), 400
    return jsonify(send_to_tines("whois", target, case_id, email, token))

@actions_bp.route("/ip_block", methods=["POST"])
def ip_block():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No target provided"}), 400
    return jsonify(send_to_tines("ip_block", target, case_id, email, token))

@actions_bp.route("/domain_block", methods=["POST"])
def domain_block():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No target provided"}), 400
    return jsonify(send_to_tines("domain_block", target, case_id, email, token))

@actions_bp.route("/user_info", methods=["POST"])
def user_info():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No target provided"}), 400
    return jsonify(send_to_tines("user_info", target, case_id, email, token))

@actions_bp.route("/hus", methods=["POST"])
def hus():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No target provided"}), 400
    return jsonify(send_to_tines("hus", target, case_id, email, token))

@actions_bp.route("/notify_teams", methods=["POST"])
def notify_teams():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No message provided"}), 400
    return jsonify(send_to_tines("notify_teams", target, case_id, email, token))

@actions_bp.route("/update_ticket", methods=["POST"])
def update_ticket():
    target, case_id, email, token = _payload(request)
    if not target:
        return jsonify({"error": "No note provided"}), 400
    return jsonify(send_to_tines("update_ticket", target, case_id, email, token))

@actions_bp.route("/stories", methods=["POST"])
def stories():
    _, _, email, token = _payload(request)
    return jsonify(send_to_tines("stories", "fetch", "", email, token))
