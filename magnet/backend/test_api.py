import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.utils.security import create_access_token

async def test():
    token = create_access_token({"sub": "2e3da76d-cd1b-442d-90f2-0c1dacc0b278", "role": "department_admin"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test hod-self-dashboard
        r = await client.get("/api/v1/analytics/hod-self-dashboard", headers={"Authorization": f"Bearer {token}"})
        print(f"hod-self-dashboard: {r.status_code} {r.text[:200]}")

        # Test hod-dashboard
        r2 = await client.get("/api/v1/analytics/hod-dashboard?department_id=61dc2a41-b82f-4d1a-a407-a4dd012da8c8", headers={"Authorization": f"Bearer $token"})
        print(f"hod-dashboard: {r2.status_code} {r2.text[:200]}")

asyncio.run(test())
