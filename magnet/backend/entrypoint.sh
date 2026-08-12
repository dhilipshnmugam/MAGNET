#!/bin/sh
set -e

echo "Starting Magnet backend..."

# Run database table creation via Python
python -c "
import asyncio
from app.database import engine, Base
# Import all models to register them
from app.models import *

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database tables created successfully.')

asyncio.run(create_tables())
"

echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
