from datetime import datetime, timezone
from sqlalchemy import or_, and_, select, text
from sqlalchemy.orm import joinedload

from comment_models import ProblemComment
from errors import DomainError


def require_problem(session, problem_id):
    # Match the site's public catalog visibility, including unpublished courses.
    found = session.scalar(text('''
        SELECT p.id FROM "Problem" p
        LEFT JOIN "Lesson" l ON l.id=p."lessonId"
        LEFT JOIN "Topic" t ON t.id=l."topicId"
        LEFT JOIN "Course" c ON c.id=t."courseId"
        WHERE p.id=:id AND p."isPublished" AND (p."lessonId" IS NULL OR c."isPublished")
    '''), {"id": problem_id})
    if found is None:
        raise DomainError(404, "PROBLEM_NOT_FOUND", "Problem does not exist.")


def output(comment):
    def utc(value):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return dict(id=comment.id, problemId=comment.problem_id, body=comment.body,
                author=dict(id=comment.author.id, nickname=comment.author.nickname, avatarUrl=comment.author.avatar_url),
                createdAt=utc(comment.created_at), updatedAt=utc(comment.updated_at))


def list_comments(session, problem_id, limit, before):
    require_problem(session, problem_id)
    stmt = select(ProblemComment).options(joinedload(ProblemComment.author)).where(ProblemComment.problem_id == problem_id)
    if before:
        anchor = session.get(ProblemComment, before)
        if anchor is None or anchor.problem_id != problem_id:
            raise DomainError(400, "INVALID_CURSOR", "Comment cursor does not belong to this problem.")
        stmt = stmt.where(or_(ProblemComment.created_at < anchor.created_at,
                               and_(ProblemComment.created_at == anchor.created_at, ProblemComment.id < anchor.id)))
    rows = list(session.scalars(stmt.order_by(ProblemComment.created_at.desc(), ProblemComment.id.desc()).limit(limit + 1)))
    page = rows[:limit]
    return dict(comments=[output(c) for c in page], nextCursor=page[-1].id if len(rows) > limit else None)


def create_comment(session, problem_id, player_id, body):
    require_problem(session, problem_id)
    comment = ProblemComment(problem_id=problem_id, author_id=player_id, body=body)
    session.add(comment)
    session.flush()
    return output(comment)


def owned_comment(session, problem_id, comment_id, player_id):
    require_problem(session, problem_id)
    comment = session.scalar(select(ProblemComment).where(ProblemComment.id == comment_id, ProblemComment.problem_id == problem_id).with_for_update())
    if comment is None:
        raise DomainError(404, "COMMENT_NOT_FOUND", "Comment does not exist on this problem.")
    if comment.author_id != player_id:
        raise DomainError(403, "FORBIDDEN", "Only the author can change this comment.")
    return comment


def update_comment(session, problem_id, comment_id, player_id, body):
    comment = owned_comment(session, problem_id, comment_id, player_id)
    comment.body = body
    comment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.flush()
    return output(comment)


def delete_comment(session, problem_id, comment_id, player_id):
    session.delete(owned_comment(session, problem_id, comment_id, player_id))
    session.flush()
