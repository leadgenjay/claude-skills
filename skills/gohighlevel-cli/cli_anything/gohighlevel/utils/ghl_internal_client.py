"""GoHighLevel internal API client for workflow creation.

Uses Firebase JWT auth against backend.leadconnectorhq.com.
Adapted from ghl-superspeed-v3-main/lib/engine.py (2026-03-25).

EXPERIMENTAL: Gated behind --experimental flag in CLI.
"""
from __future__ import annotations

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Optional

BASE_URL = "https://backend.leadconnectorhq.com"
CTX = ssl.create_default_context()

CHROME_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# Keys to strip from GET responses before PUT (avoids validation errors)
STRIP_KEYS = frozenset([
    "_id", "id", "__v", "createdAt", "updatedAt", "companyId", "locationId",
    "companyAge", "creationSource", "originType", "deleted",
    "isTriggerBucketMigrated", "permissionMeta",
])

_INTERNAL_WARNING_SHOWN = False


def _warn_internal_api_once() -> None:
    """Print a one-time stderr warning before the internal API is first used.

    The internal API authenticates with your full Firebase session token — your
    entire GHL login, not a scoped key — against GHL's unofficial backend. This
    fires once per process and covers BOTH the CLI's --experimental commands and
    the builders/ scripts (which use TokenManager directly). It is non-blocking;
    silence it with GHL_SUPPRESS_INTERNAL_WARNING=1.
    """
    global _INTERNAL_WARNING_SHOWN
    if _INTERNAL_WARNING_SHOWN:
        return
    _INTERNAL_WARNING_SHOWN = True
    if os.environ.get("GHL_SUPPRESS_INTERNAL_WARNING", "").strip():
        return
    print(
        "⚠ Internal GHL API: authenticating with your full Firebase session token\n"
        "  (your entire GHL login, not a scoped key) against the UNOFFICIAL\n"
        "  backend.leadconnectorhq.com. Run this only on YOUR OWN agency account —\n"
        "  never a client's. No SLA; the unofficial API may change or break without\n"
        "  notice. (suppress: GHL_SUPPRESS_INTERNAL_WARNING=1)",
        file=sys.stderr,
    )


class TokenManager:
    """Firebase refresh token management with auto-refresh.

    Token sources (in priority order):
    1. Cached token (if < 50 minutes old)
    2. Firebase refresh token (from GHL_FIREBASE_REFRESH_TOKEN env var)
    3. Direct Firebase token (from GHL_FIREBASE_TOKEN env var)
    """

    def __init__(self):
        self._token: Optional[str] = None
        self._token_time: float = 0

    def get_token(self) -> str:
        """Get a valid Firebase JWT token."""
        _warn_internal_api_once()
        # 1. Check if current token is still fresh (< 50 min)
        if self._token and (time.time() - self._token_time) < 3000:
            return self._token

        # 2. Try Firebase refresh token
        refresh_token = os.environ.get("GHL_FIREBASE_REFRESH_TOKEN", "").strip()
        if refresh_token:
            firebase_web_key = os.environ.get("GHL_FIREBASE_API_KEY", "").strip()
            if not firebase_web_key:
                print(
                    "Error: GHL_FIREBASE_REFRESH_TOKEN is set but "
                    "GHL_FIREBASE_API_KEY is missing.\n"
                    "Run the no-network DevTools helper in "
                    "docs/get-firebase-token.md and paste both values into .env.",
                    file=sys.stderr,
                )
                sys.exit(1)
            token = self._refresh_firebase(refresh_token, firebase_web_key)
            if token:
                self._token = token
                self._token_time = time.time()
                return token
            print(
                "Error: Firebase refresh token is set but token refresh failed.\n"
                "The refresh token may be revoked or expired.\n"
                "Run the no-network DevTools helper in "
                "docs/get-firebase-token.md to refresh both setup values.",
                file=sys.stderr,
            )
            sys.exit(1)

        # 3. Try direct Firebase token from env
        token = os.environ.get("GHL_FIREBASE_TOKEN", "").strip()
        if token:
            self._token = token
            self._token_time = time.time()
            return token

        print(
            "Error: No Firebase token available for internal API.\n"
            "Set GHL_FIREBASE_REFRESH_TOKEN (preferred) or GHL_FIREBASE_TOKEN.\n"
            "Run the no-network DevTools helper in docs/get-firebase-token.md.",
            file=sys.stderr,
        )
        sys.exit(1)

    def force_refresh(self) -> str:
        """Force token refresh (called on 401)."""
        self._token = None
        self._token_time = 0
        return self.get_token()

    def get_user_id(self) -> Optional[str]:
        """Extract the logged-in user's id from the Firebase JWT claims.

        The internal funnel-delete endpoint requires a userId; it is carried in
        the token's `user_id`/`sub` claim, so no extra API call is needed.
        """
        import base64

        token = self.get_token()
        try:
            payload = token.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload))
            return claims.get("user_id") or claims.get("sub")
        except Exception:
            return None

    def _refresh_firebase(
        self, refresh_token: str, firebase_web_key: str
    ) -> Optional[str]:
        """Exchange Firebase refresh token for a fresh ID token."""
        try:
            body = f"grant_type=refresh_token&refresh_token={refresh_token}"
            req = urllib.request.Request(
                "https://securetoken.googleapis.com/v1/token"
                f"?key={firebase_web_key}",
                data=body.encode(),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with urllib.request.urlopen(req, context=CTX, timeout=10) as r:
                data = json.loads(r.read())
                return data.get("id_token", "")
        except Exception:
            return None


class InternalGHLClient:
    """GHL internal API client (backend.leadconnectorhq.com).

    Uses Firebase JWT auth with token-id header (NOT Authorization: Bearer).
    """

    def __init__(self, token_mgr: TokenManager, location_id: str):
        self.token_mgr = token_mgr
        self.location_id = location_id
        self._call_count = 0

    @property
    def call_count(self) -> int:
        return self._call_count

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> Optional[dict]:
        """Make an API request with auto-retry on 401.

        extra_headers merges into the default header set. The forms/surveys/
        funnels internal services require {"Version": "2021-07-28"}; the workflow
        endpoints do not, so it is opt-in per call rather than always sent.
        """
        token = self.token_mgr.get_token()
        result = self._do_request(method, path, body, token, extra_headers)

        # Retry on auth failure
        if result is None:
            token = self.token_mgr.force_refresh()
            result = self._do_request(method, path, body, token, extra_headers)

        return result

    def _do_request(
        self,
        method: str,
        path: str,
        body: dict | None,
        token: str,
        extra_headers: dict[str, str] | None = None,
    ) -> Optional[dict]:
        self._call_count += 1
        safe_token = token.encode("ascii", "ignore").decode("ascii").strip()
        headers = {
            "token-id": safe_token,
            "channel": "APP",
            "source": "WEB_USER",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": CHROME_UA,
        }
        if extra_headers:
            headers.update(extra_headers)
        url = f"{BASE_URL}{path}"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, context=CTX, timeout=30) as resp:
                text = resp.read().decode()
                return json.loads(text) if text else {}
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                return None  # Signal retry
            error_body = e.read().decode() if e.fp else ""
            return {"_error": True, "code": e.code, "message": error_body[:200]}
        except Exception as ex:
            return {"_error": True, "message": str(ex)}

    def create_location_tag(self, tag: str) -> bool:
        """Create a tag at location level (required before using in triggers)."""
        result = self.request(
            "POST", f"/workflow/{self.location_id}/tags/create", {"tag": tag}
        )
        return bool(result and not result.get("_error"))

    # -- Forms / surveys / funnels (require the Version header) --------------
    # These services live behind backend.leadconnectorhq.com and reject the
    # workflow header set; they need token-id + Version together.

    _V = {"Version": "2021-07-28"}

    def create_form(self, name: str, form_data: dict | None = None) -> Optional[dict]:
        """Create a form with its full content in one POST. Returns the form dict.

        Unlike surveys, forms accept complete formData at create time — there is
        no update-by-id route, so re-POSTing would create a duplicate.
        """
        body = {"locationId": self.location_id, "name": name}
        if form_data is not None:
            body["formData"] = form_data
        r = self.request("POST", "/forms/", body, extra_headers=self._V)
        return (r or {}).get("form") if isinstance(r, dict) else r

    def get_form(self, form_id: str) -> Optional[dict]:
        r = self.request("GET", f"/forms/{form_id}", extra_headers=self._V)
        return (r or {}).get("form") if isinstance(r, dict) else r

    def delete_form(self, form_id: str) -> bool:
        r = self.request("DELETE", f"/forms/{form_id}", extra_headers=self._V)
        return bool(r and not (isinstance(r, dict) and r.get("_error")))

    def create_survey(self, name: str) -> Optional[dict]:
        """Create an empty survey shell, then wait until it is readable.

        The survey shell is NOT immediately readable/writable after create — a
        subsequent update_survey call races the backend and only partially
        persists. We poll get_survey until the record propagates (usually one
        retry) so the follow-up content write lands cleanly.
        """
        r = self.request("POST", "/surveys/", {"locationId": self.location_id, "name": name},
                         extra_headers=self._V)
        survey = (r or {}).get("survey") if isinstance(r, dict) else r
        if not survey or not survey.get("_id"):
            return survey
        survey_id = survey["_id"]
        for _ in range(10):
            if self.get_survey(survey_id):
                break
            time.sleep(0.5)
        return survey

    def update_survey(self, survey_id: str, name: str, form_data: dict) -> Optional[dict]:
        """Push full formData to a survey. Body must NOT include locationId."""
        return self.request("POST", f"/surveys/{survey_id}",
                            {"name": name, "formData": form_data}, extra_headers=self._V)

    def get_survey(self, survey_id: str) -> Optional[dict]:
        r = self.request("GET", f"/surveys/{survey_id}", extra_headers=self._V)
        return (r or {}).get("survey") if isinstance(r, dict) else r

    def delete_survey(self, survey_id: str) -> bool:
        r = self.request("DELETE", f"/surveys/{survey_id}", extra_headers=self._V)
        return bool(r and not (isinstance(r, dict) and r.get("_error")))

    def create_funnel(self, name: str, funnel_type: str = "funnel") -> Optional[dict]:
        """Create a funnel shell. Add pages with create_funnel_step_page()."""
        return self.request("POST", "/funnels/funnel/create",
                            {"locationId": self.location_id, "name": name, "type": funnel_type},
                            extra_headers=self._V)

    def delete_funnel(self, funnel_id: str, user_id: str | None = None) -> bool:
        uid = user_id or self.token_mgr.get_user_id()
        r = self.request("POST", "/funnels/funnel/delete",
                        {"locationId": self.location_id, "funnelId": funnel_id, "userId": uid},
                        extra_headers=self._V)
        return bool(r and not (isinstance(r, dict) and r.get("_error")))

    def list_funnel_pages(self, funnel_id: str, limit: int = 20) -> Optional[dict]:
        """List page records for a funnel (metadata only)."""
        return self.request(
            "GET",
            f"/funnels/page?locationId={self.location_id}&funnelId={funnel_id}&limit={limit}&offset=0",
            extra_headers=self._V,
        )

    def get_funnel_page(self, page_id: str) -> Optional[dict]:
        """Fetch a page record, including signed draft/live content URLs."""
        return self.request("GET", f"/funnels/page/{page_id}", extra_headers=self._V)

    def get_funnel(self, funnel_id: str) -> Optional[dict]:
        """Fetch one funnel record, including global-section artifact metadata."""
        result = self.request("GET", f"/funnels/funnel/fetch/{funnel_id}", extra_headers=self._V)
        if isinstance(result, dict) and isinstance(result.get("data"), dict):
            return result["data"]
        return result

    def save_global_sections(self, funnel_id: str, sections: list,
                             version: int) -> Optional[dict]:
        """Store a new global-section artifact for a funnel."""
        return self.request("POST", f"/funnels/builder/global-sections/{funnel_id}",
                            {"version": version, "sectionData": sections},
                            extra_headers=self._V)

    def create_funnel_step_page(self, funnel_id: str, step: dict) -> Optional[dict]:
        """Create a step and its initial blank page in one operation."""
        return self.request("POST", "/funnels/funnel/create-step",
                            {"step": step, "funnelId": funnel_id},
                            extra_headers=self._V)

    def save_funnel_page(
        self,
        page_id: str,
        funnel_id: str,
        page_data: dict,
        *,
        page_version: int = 1,
        publish: bool = False,
        manual_save: bool = True,
        meta: dict | None = None,
    ) -> Optional[dict]:
        """Save full builder-v2 page data as a draft or live version."""
        body = {
            "funnelId": funnel_id,
            "pageData": page_data,
            "pageVersion": page_version,
            "pageType": "live" if publish else "draft",
            "manualSave": manual_save,
            "integrations": {},
        }
        if meta is not None:
            body["meta"] = meta
        return self.request("POST", f"/funnels/builder/autosave/{page_id}", body,
                            extra_headers=self._V)
