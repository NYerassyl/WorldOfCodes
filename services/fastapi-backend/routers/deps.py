from typing import Annotated

from fastapi import Depends, Header

from errors import DomainError


def require_user_id(
    x_user_id: Annotated[int | None, Header(alias="X-User-Id")] = None,
) -> int:
    if x_user_id is None:
        raise DomainError(
            401, "AUTH_REQUIRED", "Send the demo X-User-Id header with a user id."
        )
    return x_user_id


ActorId = Annotated[int, Depends(require_user_id)]
