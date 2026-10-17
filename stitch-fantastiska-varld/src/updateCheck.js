const SCRIPT = 'script[type="module"][src]';
const INTERVAL_MS = 5 * 60 * 1000;

function scriptSrc(doc) {
  return doc.querySelector(SCRIPT)?.getAttribute('src') ?? null;
}

async function hasNewVersion(current) {
  try {
    const res = await fetch(location.pathname, { cache: 'no-store' });
    if (!res.ok) return false;
    const latest = scriptSrc(new DOMParser().parseFromString(await res.text(), 'text/html'));
    return latest !== null && latest !== current;
  } catch {
    return false;
  }
}

function showReloadButton() {
  if (document.getElementById('update-available')) return;
  const btn = document.createElement('button');
  btn.id = 'update-available';
  btn.textContent = '✨ Nytt i spelet! Tryck här';
  btn.onclick = () => location.reload();
  document.body.appendChild(btn);
}

export function startUpdateCheck() {
  if (!import.meta.env.PROD) return;
  const current = scriptSrc(document);
  if (!current) return;
  const check = async () => {
    if (await hasNewVersion(current)) showReloadButton();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') check();
  }, INTERVAL_MS);
  check();
}
