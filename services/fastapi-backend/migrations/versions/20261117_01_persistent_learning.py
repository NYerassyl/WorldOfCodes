"""Create persistent FastAPI learning tables and integrity constraints."""
from alembic import op
import sqlalchemy as sa

revision = "20261117_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('nickname', sa.String(length=20), nullable=False),
    sa.Column('password_hash', sa.String(length=256), nullable=False),
    sa.Column('bio', sa.String(length=280), server_default='', nullable=False),
    sa.Column('xp', sa.Integer(), server_default='0', nullable=False),
    sa.Column('coins', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('email = lower(email)', name='ck_user_email_normalized'),
    sa.CheckConstraint('xp >= 0 AND coins >= 0', name='ck_user_balances'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('lessons',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=80), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('level', sa.String(length=20), nullable=False),
    sa.Column('topic', sa.String(length=40), nullable=False),
    sa.Column('xp_reward', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('prerequisite_lesson_id', sa.Integer(), nullable=True),
    sa.Column('published', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("level IN ('beginner', 'intermediate', 'advanced')", name='ck_lesson_level'),
    sa.CheckConstraint('prerequisite_lesson_id <> id', name='ck_lesson_not_self'),
    sa.CheckConstraint('xp_reward BETWEEN 10 AND 100', name='ck_lesson_reward'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['prerequisite_lesson_id'], ['lessons.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lessons_author_id'), 'lessons', ['author_id'], unique=False)
    op.create_index(op.f('ix_lessons_prerequisite_lesson_id'), 'lessons', ['prerequisite_lesson_id'], unique=False)
    op.create_index(op.f('ix_lessons_topic'), 'lessons', ['topic'], unique=False)
    op.create_table('problems',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=80), nullable=False),
    sa.Column('prompt', sa.String(length=500), nullable=False),
    sa.Column('difficulty', sa.String(length=20), nullable=False),
    sa.Column('topic', sa.String(length=40), nullable=False),
    sa.Column('expected_answer', sa.String(length=120), nullable=False),
    sa.Column('xp_reward', sa.Integer(), nullable=False),
    sa.Column('coin_reward', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name='ck_problem_difficulty'),
    sa.CheckConstraint('xp_reward BETWEEN 5 AND 100 AND coin_reward BETWEEN 0 AND 50', name='ck_problem_rewards'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problems_author_id'), 'problems', ['author_id'], unique=False)
    op.create_index(op.f('ix_problems_difficulty'), 'problems', ['difficulty'], unique=False)
    op.create_index(op.f('ix_problems_topic'), 'problems', ['topic'], unique=False)
    op.create_table('trace_attempts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('exercise_id', sa.String(length=80), nullable=False),
    sa.Column('submitted_output', sa.Text(), nullable=False),
    sa.Column('correct', sa.Boolean(), nullable=False),
    sa.Column('attempt_number', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('attempt_number > 0', name='ck_trace_attempt_number'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trace_attempts_user_id'), 'trace_attempts', ['user_id'], unique=False)
    op.create_index('uq_trace_attempt_number', 'trace_attempts', ['user_id', 'exercise_id', 'attempt_number'], unique=True)
    op.create_table('comments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('problem_id', sa.Integer(), nullable=False),
    sa.Column('author_id', sa.Integer(), nullable=False),
    sa.Column('body', sa.String(length=2000), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('length(trim(body)) BETWEEN 1 AND 2000', name='ck_comment_body'),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_comments_author_id'), 'comments', ['author_id'], unique=False)
    op.create_index(op.f('ix_comments_problem_id'), 'comments', ['problem_id'], unique=False)
    op.create_table('completions',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('lesson_id', sa.Integer(), nullable=False),
    sa.Column('xp_awarded', sa.Integer(), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('xp_awarded >= 0', name='ck_completion_reward'),
    sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'lesson_id')
    )
    op.create_index(op.f('ix_completions_lesson_id'), 'completions', ['lesson_id'], unique=False)
    op.create_table('submissions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('problem_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('answer', sa.String(length=200), nullable=False),
    sa.Column('verdict', sa.String(length=20), nullable=False),
    sa.Column('rewarded', sa.Boolean(), nullable=False),
    sa.Column('xp_awarded', sa.Integer(), nullable=False),
    sa.Column('coins_awarded', sa.Integer(), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("(rewarded AND verdict = 'ACCEPTED') OR (NOT rewarded AND xp_awarded = 0 AND coins_awarded = 0)", name='ck_submission_reward_consistency'),
    sa.CheckConstraint("verdict IN ('ACCEPTED', 'WRONG_ANSWER')", name='ck_submission_verdict'),
    sa.CheckConstraint('xp_awarded >= 0 AND coins_awarded >= 0', name='ck_submission_rewards'),
    sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_problem_id'), 'submissions', ['problem_id'], unique=False)
    op.create_index('ix_submissions_user_created', 'submissions', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_submissions_user_id'), 'submissions', ['user_id'], unique=False)
    op.create_index('uq_submission_first_reward', 'submissions', ['user_id', 'problem_id'], unique=True, postgresql_where=sa.text('rewarded'))

def downgrade():
    op.drop_index('uq_submission_first_reward', table_name='submissions', postgresql_where=sa.text('rewarded'))
    op.drop_index(op.f('ix_submissions_user_id'), table_name='submissions')
    op.drop_index('ix_submissions_user_created', table_name='submissions')
    op.drop_index(op.f('ix_submissions_problem_id'), table_name='submissions')
    op.drop_table('submissions')
    op.drop_index(op.f('ix_completions_lesson_id'), table_name='completions')
    op.drop_table('completions')
    op.drop_index(op.f('ix_comments_problem_id'), table_name='comments')
    op.drop_index(op.f('ix_comments_author_id'), table_name='comments')
    op.drop_table('comments')
    op.drop_index('uq_trace_attempt_number', table_name='trace_attempts')
    op.drop_index(op.f('ix_trace_attempts_user_id'), table_name='trace_attempts')
    op.drop_table('trace_attempts')
    op.drop_index(op.f('ix_problems_topic'), table_name='problems')
    op.drop_index(op.f('ix_problems_difficulty'), table_name='problems')
    op.drop_index(op.f('ix_problems_author_id'), table_name='problems')
    op.drop_table('problems')
    op.drop_index(op.f('ix_lessons_topic'), table_name='lessons')
    op.drop_index(op.f('ix_lessons_prerequisite_lesson_id'), table_name='lessons')
    op.drop_index(op.f('ix_lessons_author_id'), table_name='lessons')
    op.drop_table('lessons')
    op.drop_table('users')
