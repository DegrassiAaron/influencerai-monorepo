#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OWNER = process.env.GH_OWNER || 'DegrassiAaron';
const REPO = process.env.GH_REPO || 'influencerai-monorepo';
const BRANCH = process.env.GH_BRANCH || 'feature/WEB-01-auth';
const BASE = process.env.GH_BASE || 'main';

if (!TOKEN) throw new Error('GH_TOKEN is required');

const API = 'https://api.github.com';
async function gh(pathname, init = {}) {
  const url = new URL(pathname, API);
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return res;
}

async function main() {
  // 1) Base sha for base branch
  let res = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`);
  if (!res.ok) throw new Error(`Failed to resolve base ref: ${res.status} ${await res.text()}`);
  const ref = await res.json();
  const baseSha = ref.object?.sha;
  if (!baseSha) throw new Error('No base sha');
  console.error(`Base ${BASE} sha: ${baseSha}`);

  // 2) Create branch ref if missing
  res = await gh(`/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: baseSha }),
  });
  if (res.status === 422) {
    const t = await res.text();
    if (!/Reference already exists/i.test(t)) throw new Error(`Create ref failed: ${t}`);
    console.error('Branch ref already exists');
  } else if (!res.ok) {
    throw new Error(`Create ref failed: ${res.status} ${await res.text()}`);
  } else {
    console.error('Branch ref created');
  }

  // 3) Upload files via Contents API
  const files = [
    'apps/web/middleware.ts',
    'apps/web/src/__tests__/login.test.tsx',
    'apps/web/src/app/api/session/login/route.ts',
    'apps/web/src/app/api/session/logout/route.ts',
    'apps/web/src/app/api/session/status/route.ts',
    'apps/web/src/app/login/page.tsx',
    'apps/web/src/contexts/AuthContext.tsx',
    'apps/web/src/hooks/useAuth.ts',
    'apps/web/src/app/page.tsx',
    'apps/web/src/app/providers.tsx',
    'apps/web/src/__tests__/home.test.tsx',
    'apps/web/package.json',
    'get-installation-token.mjs',
  ];

  for (const f of files) {
    const abs = path.resolve(f);
    const content = await fs.readFile(abs);
    const b64 = content.toString('base64');
    // get sha if exists
    let sha = undefined;
    let m = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(f)}?ref=${encodeURIComponent(BRANCH)}`);
    if (m.ok) {
      const meta = await m.json();
      sha = meta.sha;
    }
    const body = { message: `chore: update ${f}`, content: b64, branch: BRANCH, ...(sha ? { sha } : {}) };
    const p = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(f)}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!p.ok) throw new Error(`PUT ${f} failed: ${p.status} ${await p.text()}`);
    console.error(`Updated ${f}`);
  }

  // 4) Create PR
  const prBody = {
    title: 'WEB-01: Implementare autenticazione e sessione',
    head: BRANCH,
    base: BASE,
    body: 'Implementa login (/login), salvataggio token HttpOnly via route handler, middleware di protezione e AuthProvider + test.',
  };
  res = await gh(`/repos/${OWNER}/${REPO}/pulls`, { method: 'POST', body: JSON.stringify(prBody) });
  if (!res.ok) throw new Error(`Create PR failed: ${res.status} ${await res.text()}`);
  const pr = await res.json();
  console.error(`Created PR #${pr.number} ${pr.html_url}`);

  // 5) Find issue WEB-01 and mark DoD checked
  let issueNum;
  let s = await gh(`/search/issues?q=${encodeURIComponent(`repo:${OWNER}/${REPO} is:issue WEB-01`)}`);
  if (s.ok) {
    const j = await s.json();
    const it = j.items?.find((x) => /\bWEB-01\b/.test(x.title)) || j.items?.[0];
    if (it) issueNum = it.number;
  }
  if (issueNum) {
    const ijRes = await gh(`/repos/${OWNER}/${REPO}/issues/${issueNum}`);
    if (ijRes.ok) {
      const issue = await ijRes.json();
      const updated = String(issue.body || '').replace(/^- \[ \] /gm, '- [x] ');
      await gh(`/repos/${OWNER}/${REPO}/issues/${issueNum}`, { method: 'PATCH', body: JSON.stringify({ body: updated }) });
      await gh(`/repos/${OWNER}/${REPO}/issues/${issueNum}/comments`, { method: 'POST', body: JSON.stringify({ body: `PR creata: ${pr.html_url}` }) });
      console.error(`Updated issue #${issueNum}`);
    }
  }

  // 6) Request review
  await gh(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/requested_reviewers`, { method: 'POST', body: JSON.stringify({ reviewers: ['DegrassiAaron'] }) });
  console.error(`Requested review from DegrassiAaron`);

  // Print PR URL for convenience
  console.log(pr.html_url);
}

main().catch((e) => { console.error(e); process.exit(1); });

