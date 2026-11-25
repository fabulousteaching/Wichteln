// Gemeinsame Helfer für alle Seiten.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Text mit Zeilenumbrüchen → Liste der nicht-leeren Zeilen. */
export function lines(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.replace(/^[\s•\-*–]+/, '').trim())
    .filter(Boolean);
}

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(method, url, { body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Keine Verbindung. Ist das WLAN an?');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* leer */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Fehler ${res.status}`, data);
  return data;
}

// ---------------------------------------------------------------------------
// Speicher im Browser
// ---------------------------------------------------------------------------

export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* privater Modus o. ä. */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* egal */
    }
  },
};

// ---------------------------------------------------------------------------
// Live-Updates: Server-Sent Events + Sicherheitsnetz per Abfrage
// ---------------------------------------------------------------------------

export function liveUpdates(code, onChange, { pollMs = 12000 } = {}) {
  let es = null;
  let timer = null;
  let stopped = false;
  let pending = null;

  const trigger = (type) => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      if (!stopped) onChange(type);
    }, 120);
  };

  const connect = () => {
    if (!window.EventSource) return;
    es = new EventSource(`/api/rounds/${encodeURIComponent(code)}/events`);
    es.addEventListener('update', () => trigger('update'));
    es.addEventListener('drawn', () => trigger('drawn'));
    es.addEventListener('deleted', () => trigger('deleted'));
    es.onopen = () => trigger('reconnect');
  };

  connect();
  timer = setInterval(() => trigger('poll'), pollMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') trigger('visible');
  });

  return {
    stop() {
      stopped = true;
      es?.close();
      clearInterval(timer);
    },
  };
}

// ---------------------------------------------------------------------------
// Schneefall
// ---------------------------------------------------------------------------

export function startSnow(canvas, { density = 1 } = {}) {
  const ctx = canvas.getContext('2d');
  let flakes = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  const make = (anywhere) => {
    const r = Math.random() * 2.6 + 0.8;
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r,
      vy: r * 0.35 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      sway: Math.random() * 0.6 + 0.2,
      a: Math.random() * 0.5 + 0.45,
    };
  };
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(((w * h) / 9000) * density);
    const count = Math.min(reducedMotion ? 30 : 220, target);
    while (flakes.length < count) flakes.push(make(true));
    flakes.length = count;
  };
  resize();
  window.addEventListener('resize', resize);
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(50, now - last) / 16.7;
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (const f of flakes) {
      f.phase += 0.01 * dt;
      f.y += f.vy * dt * (reducedMotion ? 0.3 : 1);
      f.x += Math.sin(f.phase) * f.sway * 0.5 * dt;
      if (f.y > h + 10) Object.assign(f, make(false));
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Glitzer-Effekt
// ---------------------------------------------------------------------------

export function sparkle(x, y, { count = 14, spread = 90, parent = document.body, colors } = {}) {
  if (reducedMotion) return;
  const palette = colors || ['#ffd34e', '#ffffff', '#ff8a8a', '#9ee6ff', '#b6ff9e'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'sparkle';
    const size = 6 + Math.random() * 10;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.color = palette[i % palette.length];
    parent.appendChild(s);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.5 + Math.random() * 0.7);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20;
    s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) scale(1) rotate(90deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 30}px)) scale(.2) rotate(180deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' },
    ).finished.then(() => s.remove());
  }
}

// ---------------------------------------------------------------------------
// Meldungen und Dialoge
// ---------------------------------------------------------------------------

export function toast(message, { type = 'info', ms = 3500 } = {}) {
  let box = $('#toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

/**
 * Hübscher Dialog statt window.confirm.
 * @returns {Promise<boolean>}
 */
export function ask({ title, text = '', html = '', ok = 'OK', cancel = 'Abbrechen', danger = false, wide = false }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        <h2 class="modal-title">${esc(title)}</h2>
        ${text ? `<p class="modal-text">${esc(text)}</p>` : ''}
        ${html}
        <div class="modal-actions">
          ${cancel ? `<button type="button" class="btn btn-ghost" data-r="0">${esc(cancel)}</button>` : ''}
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(ok)}</button>
        </div>
      </div>`;
    const close = (result) => {
      overlay.classList.add('out');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    overlay.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(b.dataset.r === '1');
      else if (e.target === overlay && cancel) close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    setTimeout(() => $('[data-r="1"]', overlay)?.focus(), 50);
  });
}

/** Dialog mit Eingabefeld. @returns {Promise<string|null>} */
export function askText({ title, text = '', value = '', placeholder = '', ok = 'Speichern', maxLength = 60 }) {
  const id = `ask-${Math.random().toString(36).slice(2)}`;
  const promise = ask({
    title,
    text,
    ok,
    html: `<input class="input" id="${id}" maxlength="${maxLength}" placeholder="${esc(placeholder)}" value="${esc(value)}">`,
  });
  const input = document.getElementById(id);
  setTimeout(() => {
    input?.focus();
    input?.select();
  }, 60);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.closest('.modal').querySelector('[data-r="1"]').click();
  });
  return promise.then((confirmed) => (confirmed ? input.value : null));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
