import re
from typing import Optional


def validate_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password must be at most 128 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    return True, None


def sanitize_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def validate_slug(slug: str) -> bool:
    return bool(re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", slug))


def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


def validate_image_type(content_type: str) -> bool:
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    return content_type in allowed


def validate_media_type(content_type: str) -> bool:
    allowed = {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-msvideo",
    }
    return content_type in allowed


def validate_file_size(size_bytes: int, max_mb: int = 10) -> bool:
    return size_bytes <= max_mb * 1024 * 1024
