from collections import defaultdict
import time
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self._last_cleanup = 0

    async def dispatch(self, request: Request, call_next):
        forwarded = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )
        now = time.time()
        window = 60

        self.requests.setdefault(client_ip, [])
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < window
        ]

        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Try again later.",
            )

        self.requests[client_ip].append(now)

        if now - self._last_cleanup > 60:
            self._last_cleanup = now
            self.requests = defaultdict(list, {
                k: [t for t in v if now - t < 120]
                for k, v in self.requests.items()
                if any(now - t < 120 for t in v)
            })

        response = await call_next(request)
        return response
