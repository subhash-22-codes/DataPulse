"""
These tests prove three real issues found by reading workspaces.py
adversarially (looking for what breaks it, not just what it does),
rather than just documenting existing behavior.

HOW TO USE THIS FILE:
1. Run it now, BEFORE touching workspaces.py. test_bug_1 and test_bug_2
   variants should FAIL — that's the proof the bugs are real.
2. Apply the two one-line fixes (try/except around uuid.UUID()).
3. Run it again. Everything should pass.

test_bug_3 is NOT a pass/fail correctness bug — it documents a real
inconsistency (some endpoints return 404 for a nonexistent workspace,
others return blanket 403) so it's a deliberate decision point, not an
auto-fix. It's written to always pass, recording current behavior.
"""
import pytest
import uuid as uuid_lib


GARBAGE_ID = "not-a-uuid-at-all"


class TestBug1MissingUuidGuardInDeleteOtp:
    """
    request_delete_otp() does `ws_uuid = uuid.UUID(workspace_id)` with NO
    try/except — every sibling endpoint in the same file (confirm_delete_
    workspace, restore_workspace, delete_workspace_permanently) correctly
    wraps this in try/except ValueError -> HTTPException(400). This one
    doesn't, so a garbage workspace_id currently crashes with an unhandled
    ValueError (500) instead of a clean 400.
    """

    def test_garbage_workspace_id_should_400_not_crash(self, authed, csrf_headers):
        client, user = authed
        resp = client.post(
            f"/api/workspaces/{GARBAGE_ID}/request-delete-otp",
            headers=csrf_headers,
        )
        assert resp.status_code == 400, (
            f"Expected a clean 400 for a malformed workspace_id, got "
            f"{resp.status_code}. If this is 500, the missing try/except "
            f"around uuid.UUID(workspace_id) in request_delete_otp is "
            f"still there."
        )


class TestBug2MissingUuidCastBeforeDbFilter:
    """
    Six endpoints filter `Workspace.id == workspace_id` directly, passing
    the raw string straight into the SQL query instead of casting it to
    uuid.UUID() first (unlike get_workspace() and most other endpoints,
    which correctly do `ws_uuid = uuid.UUID(workspace_id)` before
    querying). Postgres raises "invalid input syntax for type uuid" for a
    non-UUID string bind parameter — an uncaught DB-level exception (500)
    instead of a clean 400.
    """

    @pytest.mark.parametrize(
        "method,path,needs_csrf",
        [
            ("get", f"/api/workspaces/{GARBAGE_ID}/incidents", False),
            (
                "post",
                f"/api/workspaces/{GARBAGE_ID}/incidents/{uuid_lib.uuid4()}/resolve",
                True,
            ),
            (
                "get",
                f"/api/workspaces/{GARBAGE_ID}/incidents/{uuid_lib.uuid4()}/events",
                False,
            ),
            ("get", f"/api/workspaces/{GARBAGE_ID}/table-metrics", False),
            (
                "get",
                f"/api/workspaces/{GARBAGE_ID}/column-metrics?column_name=some_col",
                False,
            ),
            ("get", f"/api/workspaces/{GARBAGE_ID}/columns", False),
        ],
    )
    def test_garbage_workspace_id_should_400_not_crash(
        self, authed, csrf_headers, method, path, needs_csrf
    ):
        client, user = authed
        headers = csrf_headers if needs_csrf else None

        resp = getattr(client, method)(path, headers=headers)

        assert resp.status_code == 400, (
            f"{method.upper()} {path} returned {resp.status_code}, expected "
            f"400. If this is 500, this endpoint is still comparing "
            f"Workspace.id to a raw string instead of casting with "
            f"uuid.UUID(workspace_id) first."
        )


class TestBug3AuthorizationErrorInconsistency:
    """
    NOT a pass/fail bug — this documents a real inconsistency for a
    deliberate decision, not an automatic fix.

    For a WELL-FORMED but NONEXISTENT workspace UUID:
    - list_incidents, get_table_metrics, get_column_metrics, list_columns
      correctly return 404 (workspace doesn't exist).
    - manual_resolve_incident, list_incident_events return a blanket 403
      even when the workspace doesn't exist at all — they can't
      distinguish "doesn't exist" from "exists but you're not a member."

    If you decide to standardize this later, these assertions will need
    updating together with the code change.
    """

    def test_list_incidents_404s_on_nonexistent_workspace(self, authed):
        client, user = authed
        fake_id = str(uuid_lib.uuid4())
        resp = client.get(f"/api/workspaces/{fake_id}/incidents")
        assert resp.status_code == 404

    def test_resolve_incident_403s_on_nonexistent_workspace(self, authed, csrf_headers):
        client, user = authed
        fake_ws_id = str(uuid_lib.uuid4())
        fake_incident_id = str(uuid_lib.uuid4())
        resp = client.post(
            f"/api/workspaces/{fake_ws_id}/incidents/{fake_incident_id}/resolve",
            headers=csrf_headers,
        )
        # Documenting CURRENT behavior: 403, not 404, even though the
        # workspace doesn't exist. This is the inconsistency.
        assert resp.status_code == 403