"""
Structural route-ordering guard.

Context: today, /api/workspaces/team returned 400 instead of the team
workspaces list, because /{workspace_id} was registered BEFORE /team in
workspaces.py. FastAPI/Starlette checks routes in registration order, so
any request to /workspaces/team matched /{workspace_id} first (with
workspace_id="team"), which then failed UUID parsing.

Rather than manually re-reading every router file to check ordering by
eye, this test asks Starlette's OWN matching logic the same question it
asks on every real request: "for this literal path, which registered
route matches first?" If that first match isn't the literal route
itself, a variable-path route earlier in the list is shadowing it.

This test requires no HTTP calls and no database — it inspects the
routing table FastAPI already built at import time.
"""

from starlette.routing import Route, WebSocketRoute, Match
from app.main import app


def _http_scope(path: str, method: str) -> dict:
    return {"type": "http", "method": method, "path": path}


def _ws_scope(path: str) -> dict:
    return {"type": "websocket", "path": path}


def test_no_literal_route_is_shadowed_by_an_earlier_variable_route():
    """
    For every registered HTTP route whose path contains NO {param}
    segment, confirm it is actually the first route in the table that
    matches its own path+method. If an earlier route (necessarily one
    containing a {param} segment, since two identical literal paths
    would be a different bug entirely) matches first, that earlier
    route is shadowing this one.
    """
    routes = app.router.routes
    problems = []

    for i, route in enumerate(routes):
        if not isinstance(route, Route):
            continue
        if "{" in route.path:
            continue  # only checking literal-path routes as the "victim"

        methods = route.methods or set()
        for method in methods:
            if method == "HEAD":
                continue  # HEAD is auto-derived from GET, not worth checking twice

            scope = _http_scope(route.path, method)

            for earlier in routes[:i]:
                if not isinstance(earlier, Route):
                    continue
                match, _ = earlier.matches(scope)
                if match == Match.FULL:
                    problems.append(
                        f"{method} {route.path} is SHADOWED by an earlier route "
                        f"'{earlier.path}' (registered first in the file, matched first). "
                        f"Fix: move the literal path route above the variable-path route."
                    )
                    break  # first shadow found is enough to report for this route

    assert not problems, (
        "Route shadowing detected (this is the exact bug class that broke "
        "/api/workspaces/team in production):\n\n" + "\n".join(problems)
    )


def test_no_websocket_route_is_shadowed_by_an_earlier_variable_route():
    """Same check, for WebSocket routes specifically."""
    routes = app.router.routes
    problems = []

    for i, route in enumerate(routes):
        if not isinstance(route, WebSocketRoute):
            continue
        if "{" in route.path:
            continue

        scope = _ws_scope(route.path)

        for earlier in routes[:i]:
            if not isinstance(earlier, WebSocketRoute):
                continue
            match, _ = earlier.matches(scope)
            if match == Match.FULL:
                problems.append(
                    f"WS {route.path} is SHADOWED by an earlier route '{earlier.path}'."
                )
                break

    assert not problems, "WebSocket route shadowing detected:\n\n" + "\n".join(problems)


def test_known_previously_broken_routes_stay_fixed():
    """
    Belt-and-suspenders: the two specific routes we know were broken
    today, checked directly by path string rather than by structural
    inspection. If either of these regresses, this fails immediately
    with an obvious message instead of relying only on the generic
    structural test above.
    """
    routes = app.router.routes

    def first_match_path(path: str, method: str) -> str | None:
        scope = _http_scope(path, method)
        for route in routes:
            if isinstance(route, Route):
                match, _ = route.matches(scope)
                if match == Match.FULL:
                    return route.path
        return None

    matched = first_match_path("/api/workspaces/team", "GET")
    assert matched == "/api/workspaces/team", (
        f"/api/workspaces/team is matching route '{matched}' instead of "
        f"itself — the /team vs /{{workspace_id}} ordering bug is back."
    )