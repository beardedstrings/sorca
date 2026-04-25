import requests
import hmac
import hashlib
import json
import os
from dotenv import load_dotenv

load_dotenv()

TINES_WEBHOOK_URL    = os.getenv("TINES_WEBHOOK_URL")
TINES_WEBHOOK_SECRET = os.getenv("TINES_WEBHOOK_SECRET")


def sign_payload(payload: dict) -> str:
    body = json.dumps(payload, separators=(",", ":"))
    signature = hmac.new(
        TINES_WEBHOOK_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature


def send_to_tines(action: str, target: str, case_id: str = "",
                  email: str = "", token: str = "") -> dict:
    if not TINES_WEBHOOK_URL or not TINES_WEBHOOK_SECRET:
        return {"error": "Tines credentials not configured. Check your .env file."}

    payload = {
        "action":   action,
        "target":   target,
        "case_id":  case_id,
        "email":    email,
        "token":    token,
    }

    signature = sign_payload(payload)

    headers = {
        "Content-Type": "application/json",
        "X-Signature":  signature,
    }

    try:
        response = requests.post(
            TINES_WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return {"error": "Request to Tines timed out."}
    except requests.exceptions.ConnectionError:
        return {"error": "Could not reach Tines. Check your webhook URL."}
    except Exception as e:
        return {"error": str(e)}
