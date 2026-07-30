import uuid
from sqlalchemy import types, String


class GUID(types.TypeDecorator):
    """Platform-independent GUID/UUID type.
    Stores as CHAR(36) for SQLite, native UUID for PostgreSQL.
    """
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return str(value)
            if isinstance(value, str):
                try:
                    return str(uuid.UUID(value))
                except (ValueError, AttributeError):
                    return value
            return value
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return value
            try:
                return uuid.UUID(value)
            except (ValueError, AttributeError):
                return value
        return value

    def coerce_compared_value(self, op, value):
        return self
