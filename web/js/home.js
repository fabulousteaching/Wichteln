import { $, esc, api, storage, startSnow, toast, ask } from './common.js';
import { elfSvg, hillsSvg, mountGarland, mountStars } from './art.js';

function countNames() {
  const names = $('#names')
    .value.split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  $('#nameCount').textContent = names.length ? `${names.length} ${names.length === 1 ? 'Kind' : 'Kinder'}` : '';
  return names.length;
}

function renderRounds() {
  const list = storage.get('wichtel:rounds', []).filter((r) => storage.get(`wichtel:admin:${r.code}`));
  $('#myRounds').hidden = !list.length;
  $('#roundsList').innerHTML = list
    .map(
      (r) => `<li>
        <span class="r-title">${esc(r.title)}<small>Code ${esc(r.code)} · ${r.count ?? '?'} Kinder · ${new Date(r.created_at).toLocaleDateString('de-CH')}</small></span>
        <a class="btn btn-green btn-small" href="/lehrer/${encodeURIComponent(r.code)}">Öffnen</a>
        <button class="icon-btn" data-forget="${esc(r.code)}" title="Aus dieser Liste entfernen">✕</button>
      </li>`,
    )
    .join('');
}

async function init() {
  mountStars($('#stars'));
  mountGarland($('#garland'));
  startSnow($('#snow'), { density: 0.8 });
  $('#ground').innerHTML = hillsSvg({ fit: 'slice' });
  $('#heroElves').innerHTML = [0, 1, 3, 2, 5]
    .map((v, i) => `<div class="elf hopping" style="animation-delay:${i * 0.12}s">${elfSvg(v)}</div>`)
    .join('');
  document.querySelectorAll('#heroElves .elf').forEach((el, i) => {
    el.querySelector('svg').style.animationDelay = `${i * 0.13}s`;
  });

  renderRounds();
  $('#names').addEventListener('input', countNames);

  try {
    const cfg = await api('GET', '/api/config');
    $('#pwField').hidden = !cfg.password_required;
  } catch {
    /* egal */
  }

  $('#roundsList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-forget]');
    if (!btn) return;
    const ok = await ask({
      title: 'Aus der Liste entfernen?',
      text: 'Die Runde wird nicht gelöscht, nur auf diesem Gerät nicht mehr angezeigt. Ohne Lehrer-Link kommst du dann nicht mehr hinein.',
      ok: 'Entfernen',
    });
    if (!ok) return;
    const code = btn.dataset.forget;
    storage.set('wichtel:rounds', storage.get('wichtel:rounds', []).filter((r) => r.code !== code));
    storage.remove(`wichtel:admin:${code}`);
    renderRounds();
  });

  $('#kidForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#kidCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length >= 4) location.href = `/k/${code}`;
    else toast('Bitte den Code von der Wandtafel eingeben.', { type: 'error' });
  });

  $('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const count = countNames();
    if (count < 3) {
      const ok = await ask({
        title: count ? 'Erst wenige Kinder' : 'Noch keine Kinder',
        text: 'Für die Auslosung braucht es mindestens 3 Kinder. Du kannst die Namen auch später noch hinzufügen.',
        ok: 'Trotzdem erstellen',
        cancel: 'Namen eintragen',
      });
      if (!ok) return;
    }
    const btn = $('#createBtn');
    btn.disabled = true;
    try {
      const res = await api('POST', '/api/rounds', {
        body: { title: $('#title').value, names: $('#names').value, hint: $('#hint').value, password: $('#password').value },
      });
      storage.set(`wichtel:admin:${res.code}`, res.admin_token);
      const list = storage.get('wichtel:rounds', []);
      list.unshift({ code: res.code, title: $('#title').value || 'Unsere Klasse', created_at: Date.now(), count });
      storage.set('wichtel:rounds', list.slice(0, 30));
      location.href = `/lehrer/${res.code}#t=${encodeURIComponent(res.admin_token)}`;
    } catch (err) {
      toast(err.message, { type: 'error', ms: 6000 });
      btn.disabled = false;
    }
  });
}

init();
