// FinDaily ask-claude.js — EMBEDDED chat (Sai's decision, Jul 10 2026, after the
// deep-link spike failed: claude:// opens the iOS app but drops all text params).
//
// KEY HANDLING — the rules, for every future session:
//   * Sai pastes his Anthropic API key ON HIS DEVICE; it lives in localStorage ONLY.
//   * The key must NEVER appear in this public repo, in commits, or in any URL.
//   * There is no server. Do not invent one.
// Cost reality: Haiku ≈ $0.002 per question → a few cents/month at daily use.
// Sai sets a $5/month spend cap in the Anthropic Console as the hard floor under this.
const AskClaude = (() => {
  const MODEL = "claude-haiku-4-5-20251001"; // cheap + fast; fine for beginner Q&A
  const KEY_STORE = "findaily_api_key";
  const MAX_TOKENS = 1024;
  const SYSTEM =
    "You are the Ask button inside FinDaily, a daily card app teaching business and " +
    "finance to a smart complete beginner (engineering grad student). Plain English, " +
    "concrete numbers and examples, define any jargon the moment you use it. Default " +
    "to ~120 words; go longer only when asked. When the question includes a card or " +
    "news story, build directly on its framing rather than starting over.";

  const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; } };
  const setKey = k => localStorage.setItem(KEY_STORE, k.trim());
  const clearKey = () => localStorage.removeItem(KEY_STORE);

  function contextFor(card, isNews) {
    return isNews
      ? 'Today\'s news story: "' + card.headline + '" — ' + card.summary
      : 'Today\'s card: "' + card.term + '" — ' + card.definition +
        (card.example ? (" Example: " + card.example) : "");
  }

  // messages: [{role:"user"|"assistant", content:"..."}]
  async function send(messages) {
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": getKey(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, messages })
      });
    } catch (e) {
      throw { kind: "net", msg: "No connection — chat needs internet (cards don't)." };
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) throw { kind: "auth", msg: "API key rejected." };
      if (r.status === 429) throw { kind: "rate", msg: "Rate limited — wait a moment and retry." };
      if (r.status === 400 && data.error && /credit/i.test(data.error.message || ""))
        throw { kind: "credit", msg: "Out of API credits — top up in the Anthropic Console." };
      throw { kind: "other", msg: (data.error && data.error.message) || ("Error " + r.status) };
    }
    return data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
  }

  // Old behavior, kept as an escape hatch (shown in key-setup screen).
  function webUrl(card, isNews) {
    const q = "I'm learning finance (complete beginner). " + contextFor(card, isNews) +
              " Please explain this more deeply, in plain English.";
    return "https://claude.ai/new?q=" + encodeURIComponent(q.slice(0, 600));
  }

  // DEFAULT path (Sai's call, Jul 10 2026): no key stored → just open Claude.
  // iPhone: claude://new opens the Claude app (blank chat — iOS drops text params,
  // proven by the spike). Laptop: claude.ai tab WITH the question prefilled (works).
  function openDirect(card, isNews) {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) location.href = "claude://new";
    else window.open(webUrl(card, isNews), "_blank");
  }

  return { getKey, setKey, clearKey, contextFor, send, webUrl, openDirect, MODEL };
})();
if (typeof window !== "undefined") window.AskClaude = AskClaude;
if (typeof module !== "undefined") module.exports = AskClaude; // for tests only
