"""
Regression guard for the trailing-slash bug that broke Trash + Notifications
in production on 2026-07-04.

Context: main.py sets `redirect_slashes=False` on the FastAPI app so that
mismatched-slash requests never trigger FastAPI's default auto-redirect
(which used Render's raw hostname and would have silently sent browsers
cross-origin, defeating the Vercel proxy / ITP cookie fix).

The tradeoff: any frontend call using the wrong slash now hard-404s instead
of "just working" via redirect. This test doesn't re-check the frontend
(that's what the api.ts interceptor does at runtime) — it documents,
route-by-route, which exact path each backend endpoint expects, so nobody
can quietly change a route's trailing slash again without a test catching
the mismatch.

If you add a new GET list-style endpoint (e.g. "/workspaces/", "/alerts/"),
add it to EXPECTED_EXACT_PATHS below.
"""

import pytest


# path, expected_status_for_unauthenticated_request
# 401 = route exists and requires auth (correct)
# 404 = would mean the route registration itself is broken
EXPECTED_EXACT_PATHS = [
    ("/api/auth/session-check", 401),
    ("/api/workspaces/", 401),
    ("/api/workspaces/trash", 401),
    ("/api/notifications/", 401),
]

# The "wrong" trailing-slash variant of each path above. These MUST 404,
# not silently redirect — if any of these ever returns 401 instead of 404,
# it likely means redirect_slashes flipped back to True somewhere, which
# would reopen the cross-origin redirect risk.
WRONG_SLASH_VARIANTS = [
    "/api/workspaces",
    "/api/notifications",
]


@pytest.mark.parametrize("path,expected_status", EXPECTED_EXACT_PATHS)
def test_route_exists_at_exact_expected_path(client, path, expected_status):
    resp = client.get(path)
    assert resp.status_code == expected_status, (
        f"{path} returned {resp.status_code}, expected {expected_status}. "
        f"If this is a 404, the route's trailing slash likely doesn't "
        f"match what api.ts's interceptor normalizes requests to."
    )


@pytest.mark.parametrize("path", WRONG_SLASH_VARIANTS)
def test_wrong_slash_variant_hard_404s_not_redirects(client, path):
    """
    Confirms redirect_slashes=False is actually in effect. A 307 here
    would mean FastAPI is auto-redirecting again — which uses Render's
    raw hostname in the Location header and would break the same-origin
    cookie setup this whole fix was for.
    """
    resp = client.get(path, follow_redirects=False)
    assert resp.status_code == 404, (
        f"{path} returned {resp.status_code} instead of 404 — if this is "
        f"a 307, redirect_slashes has been re-enabled somewhere and the "
        f"cross-origin cookie bug is back."
    )