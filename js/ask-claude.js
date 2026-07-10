// FinDaily ask-claude.js — builds the "Ask Claude" link from card context.
//
// MODE is the ONE line to change after the deep-link spike (deeplink_spike.html):
//   "web" → https://claude.ai/new?q=...   (documented; opens app via universal link
//            if iOS allows, otherwise claude.ai in the browser — works either way)
//   "app" → claude://new?q=...            (use ONLY if spike Test 1 passed)
const AskClaude = (() => {
  const MODE = "web"; // ← flip to "app" if spike Test 1 passes
  const MAX_CHARS = 600; // spike Test 3 verified 665-char URLs; keep headroom

  function buildQuestion(card, isNews) {
    const intro = "I'm learning finance with my daily app (complete beginner). ";
    const ask = " Please explain this more deeply, in plain English.";
    let ctx;
    if (isNews) {
      ctx = 'Today\'s news story: "' + card.headline + '" — ' + card.summary;
    } else {
      ctx = 'Today\'s term: "' + card.term + '" — ' + card.definition;
    }
    let q = intro + ctx + ask;
    if (q.length > MAX_CHARS) q = q.slice(0, MAX_CHARS - ask.length - 1) + "…" + ask;
    return q;
  }

  function url(card, isNews) {
    const q = encodeURIComponent(buildQuestion(card, !!isNews));
    return (MODE === "app" ? "claude://new?q=" : "https://claude.ai/new?q=") + q;
  }

  return { url, buildQuestion };
})();
if (typeof window !== "undefined") window.AskClaude = AskClaude;
if (typeof module !== "undefined") module.exports = AskClaude; // for tests only
