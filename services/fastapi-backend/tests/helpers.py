def headers(user_id: int) -> dict[str, str]:
    return {"X-User-Id": str(user_id)}
