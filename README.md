# Gamification prototypes (Three.js)

Four small interactive learning mechanics built on Three.js, designed to be dropped into a
WordPress page as an `<iframe>`. There is **no build step** — the browser loads ES modules
directly and Three.js comes from a CDN via an import map.

```
serve.py                       dev server with caching disabled
index.html                     carousel shell — one prototype at a time, with its write-up
overview.html                  grid view of all four
assets/
  controller_full.png          effort rating artwork
  controller_empty.png
shell/
  content.js                   the pitch text shown around each prototype in the carousel
shared/
  engine.js                    Three.js setup: renderer, camera, lights, picking, tweens
  ui.js                        DOM overlay helpers: panels, toasts, stat counters, results
  style.css                    the shared design system (tokens + components)
  embed.js                     postMessage bridge to the hosting page
prototypes/
  01-investigator-desk/        index.html · main.js · content.js
  02-decision-deck/
  03-defence-waves/
  04-photo-hunt/
```

Every prototype follows the same shape: `index.html` holds the DOM overlay, `main.js` builds the
scene and the rules, and **`content.js` holds every word the learner reads**. Re-topic a prototype
by editing `content.js` alone.

---

## Running it locally

Because the prototypes use ES modules, **opening `index.html` from the filesystem will not work**.
A `file://` page cannot load its module script at all, so you get a blank or half-drawn page that
never seems to change no matter what you edit. It has to be served over http.

```bash
python serve.py
```

Then open <http://localhost:8123/>. Leave that terminal open — the site is only up while the
command is running, and closing the window or rebooting stops it.

`serve.py` is the stock Python static server with caching switched off. Plain
`python -m http.server` sends no `Cache-Control` header, which lets Chrome cache your JS and CSS
heuristically — you edit a file, reload, and keep seeing the old version for minutes. If you ever
fall back to `python -m http.server 8123`, expect that and hard-refresh with **Ctrl+F5**.

Append `?debug` to a prototype URL to expose its scene and state on `window` for poking at from
the console (`window.__desk`, `__deck`, `__def`, `__hunt`).

---

## Putting one in WordPress

1. Upload the whole project folder over FTP/SFTP or your host's file manager, e.g. to
   `/wp-content/uploads/prototypes/`. Keep the folder structure — the prototypes reference
   `../../shared/` by relative path.
2. In the page or post, add a **Custom HTML** block.

**The whole carousel** — all four with their write-ups and prev/next arrows:

```html
<iframe
  src="/wp-content/uploads/prototypes/"
  width="100%" height="860"
  style="border:0; border-radius:12px; display:block"
  title="Gamification prototypes"
  loading="lazy"></iframe>
```

Add a hash to open a specific one, e.g. `.../prototypes/#photo-hunt`. The carousel needs more
height than a bare prototype because it stacks a header, the frame and the notes — **820–900px**
is comfortable. Learners can press **Hide notes** to give the prototype the full height, and the
arrow keys work as well as the arrows.

**A single prototype** on its own, with no shell around it:

```html
<iframe
  src="/wp-content/uploads/prototypes/prototypes/01-investigator-desk/"
  width="100%" height="640"
  style="border:0; border-radius:12px; display:block"
  title="Prescription review activity"
  loading="lazy"></iframe>
```

A height of **600–720px** works well on desktop; below about 520px the overlay panels start to
crowd the scene.

### Reacting to completion

Each prototype posts messages to the parent page. Add this to the same Custom HTML block to
unlock a "next" button, mark a lesson complete, or push a score into your LMS:

```html
<script>
window.addEventListener('message', function (e) {
  if (!e.data || e.data.source !== 'gamified-prototype') return;

  switch (e.data.type) {
    case 'ready':    /* scene is interactive */ break;
    case 'progress': /* e.data.fraction is 0..1 */ break;
    case 'complete':
      // e.data.passed  -> boolean
      // e.data.score   -> 0..1
      // e.data.id      -> which prototype
      console.log('finished', e.data.id, e.data.passed, e.data.score);
      break;
    case 'restart':  /* learner started over */ break;
  }
});
</script>
```

The `id` values are `investigator-desk`, `decision-deck`, `defence-waves` and `photo-hunt`.

### If your WordPress host blocks direct file uploads

Two alternatives, both fine:

- Put the folder on any static host (Netlify, Cloudflare Pages, S3) and point the `iframe` at it.
  Cross-origin embedding works — the `postMessage` bridge already targets `*`.
- Use a plugin that serves a static folder from the media library.

---

## Editing the content

| Prototype | What `content.js` controls |
|---|---|
| `01-investigator-desk` | Two modes (`medical` bottles, `compliance` emails) — the four items in each, which one is `faulty: true`, and the debrief for each |
| `02-decision-deck` | The scenario wording, the three meters and their starting values, and the three cards with their effects and feedback |
| `03-defence-waves` | The asset, the two controls and what each one `stops`, the two waves, the debrief |
| `04-photo-hunt` | The one hazard and its position, the three waypoints, and how much film |
| `shell/content.js` | The title, "the idea", "why it works" and the 1–5 effort rating shown around each prototype in the carousel |

A few rules the code depends on:

- **Desk:** each mode needs exactly one item with `faulty: true`. A mode's `kind` is either
  `bottle` (3D bottles you turn and zoom, stickered approved/rejected) or `paper` (flat printouts
  you stamp). Adding a mode to the `modes` array adds a button to the switch automatically.
- **Deck:** every key in a card's `effects` must match a resource `id`. A positive number is drawn
  green and a negative one red, so the sign alone tells the learner whether a choice helped.
- **Defence:** every `control.stops` value must match a key in `threatTypes`, and each wave's
  `threat` must use one of those same keys. A wave sends one kind of threat (`threat` plus a
  `count`), and `budget` should normally equal the number of waves — one control each.
- **Photo hunt:** `hazards[].spot` is a world position in metres; the scene builder reads it, so
  moving the hazard in `content.js` moves it in the 3D scene too. Every shutter press costs a
  shot, hit or miss, which is what makes `film` mean anything. `buildHazard()` draws one thing —
  the spill and its drum — so adding a second entry to `hazards` would draw a second spill until
  you give it its own geometry.

---

## Changing the look

Everything follows the slide deck: white ground, `#2757E2` blue, a mint accent for the
`// THE IDEA:` labels, and **Urbanist**. If the site has no internet access the font falls back to
Segoe UI / system-ui and everything else still holds up.

- **The shell** (`index.html`, `overview.html`) defines its own tokens at the top of its `<style>`
  block. Change `--blue` and `--mint` there. The effort rating uses the two PNGs in `assets/`.
- **The prototype overlays** use the same palette from `shared/style.css` — white panels floating
  over the 3D, blue headings, pill buttons. Change `--blue`, `--mint` and `--accent-2` on `:root`
  to re-skin all four at once.
- **The 3D scenes stay dark.** They are lit environments rather than UI, and the contrast is what
  makes the white panels readable. Their colours are hex constants at the top of each `main.js`.

The prototypes link the shared stylesheet as `style.css?v=2`. **Bump that number whenever you edit
`shared/style.css`**, otherwise returning visitors keep the old cached copy — plain static hosts
send no cache headers, so browsers cache it heuristically.

---

## Notes and known limits

- **Three.js is pinned** to `0.185.1` on jsDelivr in each prototype's import map. To vendor it
  locally instead, download `three.module.js` plus `examples/jsm/controls/OrbitControls.js` and
  point the import map at your own paths.
- **WebGL is required.** There is no 2D fallback; on a machine without WebGL the canvas stays
  blank while the DOM overlay still renders.
- **Backgrounded tabs pause.** Browsers suspend `requestAnimationFrame` in hidden tabs, so the
  defence waves freeze while the learner is on another tab and resume when they come back. The
  tween helper carries its own timer so no interaction can deadlock because of this.
- **Nothing is persisted.** State lives in memory only; a page reload starts over. If you need
  attempts recorded, capture the `complete` message on the WordPress side.
- **Resizing is handled three ways**, because no single one is reliable: a `ResizeObserver` on the
  container, a `window` resize listener, and a per-frame check in the render loop that compares the
  drawing buffer against the displayed size. The last one is the guarantee — inside an iframe the
  first two can be missed entirely. `devicePixelRatio` is re-read on every resize, so dragging the
  window to a screen with different scaling re-sharpens the canvas instead of leaving it blurry.
- **Scenes never crop.** Each fixed-layout prototype passes `fit: { width, height }` to
  `createStage` — the world-space box that must stay on screen. On a frame too narrow to show that
  width, the field of view widens instead of cutting content off at the edges.
- Touch works (drag to look/orbit, tap to select), but the overlay panels are laid out for
  screens wider than about 700px.
