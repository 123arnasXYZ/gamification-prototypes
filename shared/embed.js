/* ============================================================
   embed.js - the bridge to the page hosting the iframe.

   WordPress (or an LMS wrapper) can listen for these messages to
   unlock a "next" button, record completion, or push a score into
   SCORM/xAPI. Every message carries { source: 'gamified-prototype' }
   so the host can safely ignore anything else on the channel.
   ============================================================ */

const SOURCE = 'gamified-prototype';

function post(payload) {
  try {
    window.parent?.postMessage({ source: SOURCE, ...payload }, '*');
  } catch { /* not embedded, or blocked - harmless */ }
}

export function createBridge(id) {
  return {
    id,
    /** Fired once the scene is up and interactive. */
    ready() { post({ type: 'ready', id }); },
    /** Progress ticks: fraction 0..1 plus anything else worth logging. */
    progress(fraction, detail = {}) {
      post({ type: 'progress', id, fraction: Math.max(0, Math.min(1, fraction)), ...detail });
    },
    /** Terminal state: score is 0..1. */
    complete({ passed, score = null, detail = {} }) {
      post({ type: 'complete', id, passed, score, ...detail });
    },
    /** Learner hit "try again". */
    restart() { post({ type: 'restart', id }); },
  };
}

/* Convenience for the host page. Drop this in WordPress:

   window.addEventListener('message', (e) => {
     if (e.data?.source !== 'gamified-prototype') return;
     if (e.data.type === 'complete' && e.data.passed) unlockNextLesson();
   });
*/
