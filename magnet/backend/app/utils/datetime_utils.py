from datetime import datetime, date, timezone
from typing import Optional, Union


def utc_isoformat(value: Optional[Union[datetime, date]]) -> Optional[str]:
    """Serialize a datetime to ISO-8601, always annotated as UTC.

    The application stores timestamps using ``datetime.utcnow()`` (naive UTC).
    Naive values are therefore treated as UTC so the API responses carry an
    explicit UTC offset instead of an ambiguous, timezone-less string.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value.isoformat()
