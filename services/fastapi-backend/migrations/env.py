from alembic import context
from database import engine

with engine().begin() as connection:
    context.configure(connection=connection, version_table="woc_fastapi_revision")
    with context.begin_transaction():
        context.run_migrations()
