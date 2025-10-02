import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';

const APP_ID = process.env.GH_APP_ID; // es: 123456
const INSTALL_ID = process.env.GH_INSTALL_ID; // es: 987654321
let PEM_PATH = process.env.GH_APP_PEM; // path alla .pem oppure una cartella contenente un singolo .pem
const OWNER = process.env.GH_OWNER; // opzionale: owner della repo per autoselezione install
const REPO = process.env.GH_REPO;   // opzionale: nome repo per autoselezione install

if (!APP_ID) throw new Error('GH_APP_ID is required');
if (!INSTALL_ID) throw new Error('GH_INSTALL_ID is required');
if (!PEM_PATH) throw new Error('GH_APP_PEM is required');

if (!fs.existsSync(PEM_PATH)) {
  throw new Error(`GH_APP_PEM does not exist: ${PEM_PATH}`);
}

const stat = fs.lstatSync(PEM_PATH);
if (stat.isDirectory()) {
  const pemFiles = fs.readdirSync(PEM_PATH).filter(f => f.toLowerCase().endsWith('.pem'));
  if (pemFiles.length === 0) {
    throw new Error(`No .pem files found in directory: ${PEM_PATH}`);
  }
  if (pemFiles.length > 1) {
    throw new Error(`Multiple .pem files found in directory: ${PEM_PATH}\nSelect one and set GH_APP_PEM to its full path:\n- ${pemFiles.join('\n- ')}`);
  }
  PEM_PATH = path.join(PEM_PATH, pemFiles[0]);
}

if (!PEM_PATH.toLowerCase().endsWith('.pem')) {
  throw new Error(`GH_APP_PEM must point to a .pem file. Got: ${PEM_PATH}`);
}

const PRIVATE_KEY = fs.readFileSync(PEM_PATH, 'utf8');

const now = Math.floor(Date.now() / 1000);
const payload = { iat: now - 60, exp: now + 9 * 60, iss: APP_ID };
const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });

async function gh(pathname, init = {}) {
  const url = new URL(pathname, 'https://api.github.com');
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      ...(init.headers || {}),
    },
  });
  return res;
}

// Verifica App
const appRes = await gh('/app');
if (!appRes.ok) {
  const t = await appRes.text();
  throw new Error(`Failed to verify App via /app. Status ${appRes.status}. Body: ${t}`);
}
const appInfo = await appRes.json();
console.error(`App verified: id=${appInfo.id} slug=${appInfo.slug} name=${appInfo.name}`);

// Recupera installazioni dell'App
const installsRes = await gh('/app/installations');
if (!installsRes.ok) {
  const t = await installsRes.text();
  throw new Error(`Failed to list installations. Status ${installsRes.status}. Body: ${t}`);
}
const installs = await installsRes.json();
console.error(`Found ${installs.length} installation(s).`);

let installId = INSTALL_ID;
if (!installId) {
  if (OWNER && REPO) {
    const repoInstRes = await gh(`/repos/${OWNER}/${REPO}/installation`);
    if (repoInstRes.ok) {
      const data = await repoInstRes.json();
      installId = String(data.id);
      console.error(`Resolved installation by repo ${OWNER}/${REPO}: id=${installId}`);
    } else {
      const t = await repoInstRes.text();
      throw new Error(`Failed to resolve installation for ${OWNER}/${REPO}. Status ${repoInstRes.status}. Body: ${t}`);
    }
  } else if (installs.length === 1) {
    installId = String(installs[0].id);
    console.error(`Resolved single installation: id=${installId}`);
  } else {
    const list = installs.map(i => `${i.id}\t${i.account?.login}\t${i.target_type}`).join('\n');
    throw new Error(`GH_INSTALL_ID not provided and multiple installs found. Set GH_INSTALL_ID to one of:\n${list}`);
  }
}

// Convalida che l'install ID appartenga alla tua App
if (!installs.some(i => String(i.id) === String(installId))) {
  const list = installs.map(i => `${i.id}\t${i.account?.login}\t${i.target_type}`).join('\n');
  throw new Error(`Installation not found for this App: ${installId}. Available for this App:\n${list}`);
}

const res = await gh(`/app/installations/${installId}/access_tokens`, {
  method: 'POST',
});
if (!res.ok) { console.error(await res.text()); process.exit(1); }
const data = await res.json();
console.log(data.token);
