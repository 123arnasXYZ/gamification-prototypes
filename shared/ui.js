/* ============================================================
   ui.js - DOM overlay helpers shared by every prototype.

   The 3D canvas handles atmosphere and interaction; anything the
   learner has to *read* lives in the DOM so it stays crisp,
   selectable and screen-reader friendly.
   ============================================================ */

/** el('div.panel.clickable', { id: 'x' }, 'text' | [children]) */
export function el(spec, attrs = {}, children = null) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  if (typeof children === 'string') node.textContent = children;
  else if (Array.isArray(children)) children.filter(Boolean).forEach((c) => node.append(c));
  else if (children) node.append(children);
  return node;
}

/* ---------- Toasts ---------- */
let toastHost = null;
export function toast(message, kind = '', ms = 2600) {
  if (!toastHost) {
    toastHost = el('div.toasts');
    document.body.append(toastHost);
  }
  const t = el('div.toast' + (kind ? '.' + kind : ''), { role: 'status' }, message);
  toastHost.append(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 250);
  }, ms);
  return t;
}

/* ---------- Result modal ---------- */
/**
 * showResult({
 *   passed, title, summary,
 *   points: ['<b>Rx-2</b> was the outlier...'],
 *   actions: [{ label: 'Try again', kind: 'primary', onClick }]
 * })
 */
export function showResult({ passed = true, title, summary = '', points = [], actions = [] }) {
  const scrim = el('div.scrim', { role: 'dialog', 'aria-modal': 'true' });
  const modal = el('div.modal');

  modal.append(el('div.verdict.' + (passed ? 'pass' : 'fail'), {}, passed ? 'Complete' : 'Review needed'));
  modal.append(el('h1', {}, title));
  if (summary) modal.append(el('p', { style: 'color:var(--ink-dim);margin:0;font-size:14.5px' }, summary));
  if (points.length) {
    modal.append(el('ul', {}, points.map((p) => el('li', { html: p }))));
  }

  const bar = el('div.actions');
  const list = actions.length ? actions : [{ label: 'Close', kind: 'primary' }];
  for (const a of list) {
    bar.append(el('button.btn' + (a.kind ? '.' + a.kind : ''), {
      type: 'button',
      onclick: () => { close(); a.onClick?.(); },
    }, a.label));
  }
  modal.append(bar);
  scrim.append(modal);
  document.body.append(scrim);

  function close() { scrim.remove(); }
  return { close, scrim };
}

/* ---------- Loading veil ---------- */
export function hideLoading(selector = '.loading') {
  const n = document.querySelector(selector);
  if (!n) return;
  n.classList.add('hide');
  setTimeout(() => n.remove(), 450);
}

/* ---------- Stat counters ---------- */
/**
 * const stats = statBar(host, [
 *   { id: 'budget', label: 'Budget', value: 8, max: 10 },
 * ]);
 * stats.set('budget', 6);   // animates + flashes red/green
 */
export function statBar(host, defs) {
  const nodes = {};
  const wrap = el('div.stats');
  for (const d of defs) {
    const v = el('div.v', {}, String(d.value));
    const stat = el('div.stat', { 'data-id': d.id }, [
      el('div.k', {}, d.label),
      v,
    ]);
    let fill = null;
    if (d.max != null) {
      fill = el('i', { style: `width:${(d.value / d.max) * 100}%` });
      if (d.color) fill.style.background = d.color;
      stat.append(el('div.meter', {}, fill));
    }
    nodes[d.id] = { def: d, stat, v, fill, value: d.value };
    wrap.append(stat);
  }
  host.append(wrap);

  return {
    node: wrap,
    get(id) { return nodes[id].value; },
    set(id, value) {
      const n = nodes[id];
      if (!n) return;
      const dir = value > n.value ? 'flash-up' : value < n.value ? 'flash-down' : null;
      n.value = value;
      n.v.textContent = String(Math.round(value));
      if (n.fill) n.fill.style.width = `${Math.max(0, Math.min(1, value / n.def.max)) * 100}%`;
      if (dir) {
        n.stat.classList.add(dir);
        setTimeout(() => n.stat.classList.remove(dir), 700);
      }
    },
    add(id, delta) { this.set(id, nodes[id].value + delta); },
  };
}

/* ---------- Sliding reader panel ---------- */
/**
 * const reader = createReader(document.body);
 * reader.open({ eyebrow, title, bodyNodes: [...], actions: [...] });
 */
export function createReader(host = document.body) {
  const head = el('header');
  const body = el('div.body');
  const foot = el('footer');
  const panel = el('aside.reader', { 'aria-live': 'polite' }, [head, body, foot]);
  host.append(panel);

  return {
    node: panel,
    open({ eyebrow = '', title = '', bodyNodes = [], actions = [] }) {
      head.replaceChildren(
        ...(eyebrow ? [el('div.eyebrow', {}, eyebrow)] : []),
        el('h2', {}, title),
      );
      body.replaceChildren(...bodyNodes);
      foot.replaceChildren(...actions.map((a) => el('button.btn' + (a.kind ? '.' + a.kind : ''), {
        type: 'button',
        style: a.grow ? 'flex:1' : null,
        disabled: a.disabled || null,
        onclick: () => a.onClick?.(),
      }, a.label)));
      panel.classList.add('open');
    },
    close() { panel.classList.remove('open'); },
    get isOpen() { return panel.classList.contains('open'); },
  };
}

/** Definition list from an object or array of [label, value] pairs. */
export function rows(pairs, highlight = []) {
  const list = Array.isArray(pairs) ? pairs : Object.entries(pairs);
  return el('dl.rows', {}, list.flatMap(([k, v]) => [
    el('dt', {}, k),
    el('dd', { style: highlight.includes(k) ? 'color:var(--accent)' : null }, String(v)),
  ]));
}
