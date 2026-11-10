"""Load the fixed, reviewed 50-exercise catalog. Never execute user code."""
from functools import lru_cache
import json
from pathlib import Path

from trace_models import TraceDifficulty

_ROOT = Path(__file__).resolve().parent / "trace" / "catalog"


@lru_cache(maxsize=1)
def load_catalog() -> tuple[dict, ...]:
    entries = []
    for level in range(1, 6):
        filename = _ROOT / f"level{level}.json"
        entries.extend(json.loads(filename.read_text(encoding="utf-8")))
    return tuple(entries)


@lru_cache(maxsize=1)
def by_id() -> dict[str, dict]:
    return {item["id"]: item for item in load_catalog()}


def public_summary(item: dict) -> dict:
    return {key: item[key] for key in ("id", "level", "difficulty", "topic", "title")}


def public_detail(item: dict) -> dict:
    return {
        **public_summary(item),
        "instructions": item["instructions"],
        "code": item["code"],
    }


def match_catalog(*, level: int | None, difficulty: TraceDifficulty | None, topic: str | None) -> list[dict]:
    return [
        public_summary(item)
        for item in load_catalog()
        if (level is None or item["level"] == level)
        and (difficulty is None or item["difficulty"] == difficulty.value)
        and (topic is None or item["topic"].casefold() == topic.casefold())
    ]
