import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("magnet")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        duration = time.time() - start_time
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={duration:.4f}s "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        return response
