from datetime import date, timedelta
from types import SimpleNamespace

from profile_activity import summarize


def test_repeated_solves_streak_and_period_boundaries():
    today = date(2026, 11, 17)
    def row(age, accepted=True):
        return SimpleNamespace(day=today-timedelta(days=age), submissions=2, solved=accepted,
                               topic="loops", difficulty="EASY", problem_id="sum")
    result = summarize([row(2), row(1), row(29, False), row(30), row(59), row(60)], today)
    assert len(result.days) == 365
    assert result.year.submissions == 12
    assert result.year.solved == result.topics["loops"] == result.difficulties["EASY"] == 1
    assert result.current_streak == result.longest_streak == 2
    assert result.recent.submissions == 6 and result.previous.submissions == 4
    assert result.days[today].solved == 0
