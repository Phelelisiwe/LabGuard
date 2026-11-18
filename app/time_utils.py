from datetime import datetime, timedelta, timezone


SA_TIMEZONE = timezone(timedelta(hours=2))


def sa_now() -> datetime:
    """Return the current South African Standard Time (UTC+2)."""
    return datetime.now(SA_TIMEZONE).replace(tzinfo=None)
