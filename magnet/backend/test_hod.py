import asyncio
from app.database import AsyncSessionLocal
from app.services import analytics_engine
from sqlalchemy import text

async def test():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT id FROM users WHERE email = 'hodcse@ksrct.ac.in'"))
        row = r.one()
        staff_id = row[0]
        print(f"staff_id: {staff_id}")
        try:
            result = await analytics_engine.hod_self_dashboard(db, staff_id)
            print(f"OK - channels: {len(result['channels'])}, events: {len(result['events'])}")
            print(f"engagement: {result['engagement']}")
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}")

asyncio.run(test())
