"""Read-only daily aggregates over the shared Prisma submission history."""
from alembic import op

revision = "001_profile_activity"
down_revision = None
branch_labels = depends_on = None


def upgrade():
    op.execute("""
        CREATE VIEW woc_profile_activity AS
        SELECT s."userId" AS user_id, s."createdAt"::date AS day,
               p.id AS problem_id, p."topicSlug" AS topic, p.difficulty::text AS difficulty,
               count(*) AS submissions, bool_or(s.status = 'ACCEPTED') AS solved
        FROM "Submission" s JOIN "Problem" p ON p.id = s."problemId"
        GROUP BY s."userId", s."createdAt"::date, p.id
    """)


def downgrade():
    op.execute("DROP VIEW woc_profile_activity")
