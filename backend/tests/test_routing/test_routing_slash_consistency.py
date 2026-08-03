"""
Regression guard for the trailing-slash bug that broke Trash + Notifications
in production on 2026-07-04, and confirms the final standard adopted:
EVERY backend route has NO trailing slash. Ever. No exceptions.

Context: main.py sets `redirect_slashes=False` so mismatched-slash
requests never trigger FastAPI's default auto-redirect (which used
Render's raw hostname and would have silently sent browsers cross-origin,
defeating the Vercel proxy / ITP cookie fix). This means a wrong-slash
request hard-404s instead of "just working" via redirect - so every
route, everywhere, must follow one consistent rule.
"""

import pytest


# path, expected_status_for_unauthenticated_request
# 401 = route exists and requires auth (correct)
EXPECTED_EXACT_PATHS = [
    ("/api/auth/session-check", 401),
    ("/api/auth/ws-ticket", 401),
    ("/api/workspaces", 401),
    ("/api/workspaces/trash", 401),
    ("/api/workspaces/team", 401),
    ("/api/notifications", 401),
]

# The WRONG variant of each path (extra trailing slash). These MUST 404,
# not silently redirect or succeed - if any of these ever returns 401
# instead of 404, someone reintroduced a trailing slash on that route.
WRONG_SLASH_VARIANTS = [
    "/api/workspaces/",
    "/api/notifications/",
    "/api/auth/ws-ticket/",
]


@pytest.mark.parametrize("path,expected_status", EXPECTED_EXACT_PATHS)
def test_route_exists_at_exact_expected_path(client, path, expected_status):
    resp = client.get(path)
    assert resp.status_code == expected_status, (
        f"{path} returned {resp.status_code}, expected {expected_status}. "
        f"Every route in this app must have NO trailing slash - check the "
        f"@router decorator for this endpoint."
    )


@pytest.mark.parametrize("path", WRONG_SLASH_VARIANTS)
def test_trailing_slash_variant_hard_404s_not_redirects(client, path):
    """
    Confirms redirect_slashes=False is actually in effect AND that nobody
    added a trailing slash back onto a route. A 307 here would mean
    FastAPI is auto-redirecting again - which uses Render's raw hostname
    in the Location header and would break the same-origin cookie setup.
    A 401 here would mean someone re-added a trailing slash to this route.
    """
    resp = client.get(path, follow_redirects=False)
    assert resp.status_code == 404, (
        f"{path} returned {resp.status_code} instead of 404. If 307, "
        f"redirect_slashes has been re-enabled somewhere. If 401, someone "
        f"added a trailing slash back onto this route - remove it."
    )