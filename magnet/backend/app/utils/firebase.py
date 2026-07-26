from typing import List, Optional
from app.config import settings

_firebase_initialized = False
_firebase_app = None


def initialize_firebase():
    global _firebase_initialized, _firebase_app
    if _firebase_initialized:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    except Exception:
        _firebase_initialized = False


def send_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    if not _firebase_initialized:
        initialize_firebase()

    if not _firebase_initialized or not tokens:
        return {"success": False, "sent": 0, "failed": len(tokens)}

    try:
        from firebase_admin import messaging

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=tokens,
        )

        response = messaging.send_each_for_multicast(message)

        return {
            "success": True,
            "sent": response.success_count,
            "failed": response.failure_count,
        }
    except Exception:
        return {"success": False, "sent": 0, "failed": len(tokens)}


def send_single_push(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    result = send_push_notification([token], title, body, data)
    return result["sent"] > 0
