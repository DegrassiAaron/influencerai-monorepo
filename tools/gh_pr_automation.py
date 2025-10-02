#!/usr/bin/env python3
import base64
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

OWNER = os.environ.get("GH_OWNER", "DegrassiAaron")
REPO = os.environ.get("GH_REPO", "influencerai-monorepo")
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
BRANCH = os.environ.get("GH_BRANCH", "feature/WEB-01-auth")
BASE = os.environ.get("GH_BASE", "main")
API = "https://api.github.com"

FILES = [
    "apps/web/middleware.ts",
    "apps/web/src/__tests__/login.test.tsx",
    "apps/web/src/app/api/session/login/route.ts",
    "apps/web/src/app/api/session/logout/route.ts",
    "apps/web/src/app/api/session/status/route.ts",
    "apps/web/src/app/login/page.tsx",
    "apps/web/src/contexts/AuthContext.tsx",
    "apps/web/src/hooks/useAuth.ts",
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/providers.tsx",
    "apps/web/src/__tests__/home.test.tsx",
    "apps/web/package.json",
    "get-installation-token.mjs",
]

def gh(path: str, method: str = "GET", body: dict | None = None, accept: str = "application/vnd.github+json"):
    if not TOKEN:
        raise SystemExit("GH_TOKEN is required")
    url = f"{API}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": accept,
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(req) as resp:
            return resp.getcode(), resp.read()
    except HTTPError as e:
        return e.code, e.read()

def main():
    # 1) resolve base sha
    code, body = gh(f"/repos/{OWNER}/{REPO}/git/ref/heads/{BASE}")
    if code != 200:
        print("Failed to resolve base ref", code, body.decode(), file=sys.stderr)
        sys.exit(1)
    base_sha = json.loads(body)["object"]["sha"]

    # 2) ensure branch ref exists (from base)
    code, body = gh(f"/repos/{OWNER}/{REPO}/git/refs", method="POST", body={"ref": f"refs/heads/{BRANCH}", "sha": base_sha})
    if code not in (200, 201):
        # 422 ref exists may happen
        msg = body.decode()
        if "Reference already exists" in msg:
            pass
        else:
            print("Create ref failed", code, msg, file=sys.stderr)
            sys.exit(1)

    # 3) create tree with our files (content inline)
    tree_items = []
    for rel in FILES:
        p = Path(rel)
        if not p.exists():
            # skip missing files gracefully
            continue
        content = p.read_text(encoding="utf-8")
        tree_items.append({
            "path": rel,
            "mode": "100644",
            "type": "blob",
            "content": content,
        })
    code, body = gh(f"/repos/{OWNER}/{REPO}/git/trees", method="POST", body={"base_tree": base_sha, "tree": tree_items})
    if code not in (200, 201):
        print("Create tree failed", code, body.decode(), file=sys.stderr)
        sys.exit(1)
    tree_sha = json.loads(body)["sha"]

    # 4) create commit
    code, body = gh(f"/repos/{OWNER}/{REPO}/git/commits", method="POST", body={
        "message": "WEB-01: implement web authentication, session middleware, login UI, and tests",
        "tree": tree_sha,
        "parents": [base_sha],
    })
    if code not in (200, 201):
        print("Create commit failed", code, body.decode(), file=sys.stderr)
        sys.exit(1)
    commit_sha = json.loads(body)["sha"]

    # 5) update ref to point to our commit
    code, body = gh(f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}", method="PATCH", body={"sha": commit_sha, "force": True})
    if code not in (200):
        print("Update ref failed", code, body.decode(), file=sys.stderr)
        sys.exit(1)

    # 6) create PR
    code, body = gh(f"/repos/{OWNER}/{REPO}/pulls", method="POST", body={
        "title": "WEB-01: Implementare autenticazione e sessione",
        "head": BRANCH,
        "base": BASE,
        "body": "Implementa login (/login), salvataggio token HttpOnly via route handler, middleware di protezione e AuthProvider + test.",
    })
    if code != 201:
        print("Create PR failed", code, body.decode(), file=sys.stderr)
        sys.exit(1)
    pr = json.loads(body)
    pr_number = pr["number"]
    pr_url = pr["html_url"]
    print(pr_url)

    # 7) find issue WEB-01
    q = f"repo:{OWNER}/{REPO} is:issue WEB-01"
    code, body = gh(f"/search/issues?q={q.replace(' ', '+')}")
    issue_number = None
    if code == 200:
        items = json.loads(body).get("items", [])
        it = None
        for i in items:
            if "WEB-01" in i.get("title", ""):
                it = i
                break
        if not it and items:
            it = items[0]
        if it:
            issue_number = it["number"]

    # 8) update issue checkboxes and comment
    if issue_number:
        code, body = gh(f"/repos/{OWNER}/{REPO}/issues/{issue_number}")
        if code == 200:
            issue = json.loads(body)
            new_body = issue.get("body", "").replace("- [ ] ", "- [x] ")
            gh(f"/repos/{OWNER}/{REPO}/issues/{issue_number}", method="PATCH", body={"body": new_body})
            gh(f"/repos/{OWNER}/{REPO}/issues/{issue_number}/comments", method="POST", body={"body": f"PR creata: {pr_url}"})

    # 9) request review
    gh(f"/repos/{OWNER}/{REPO}/pulls/{pr_number}/requested_reviewers", method="POST", body={"reviewers": ["DegrassiAaron"]})

if __name__ == "__main__":
    main()

