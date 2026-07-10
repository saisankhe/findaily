// FinDaily app.js — screen flow: sweep (day 1) → new cards → news → review → done.
(() => {
  const CARDS = window.CURRICULUM.cards;
  const TERMS = CARDS.filter(c => c.type !== "history");
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  const stageName = n => (window.CURRICULUM.stages[String(n)] || "Stage " + n);
  const typeTag = c => c.type === "concept" ? '<span class="tag concept">Concept</span>'
                     : '<span class="tag term">Term · Stage ' + c.stage + "</span>";

  // ---------- card rendering ----------
  function cardHTML(c) {
    let h = typeTag(c) + "<h3>" + esc(c.term) + "</h3><p>" + esc(c.definition) + "</p>";
    if (c.example) h += "<p><b>Example:</b> " + esc(c.example) + "</p>";
    if (c.magnitude_anchor) h += '<div class="anchor"><b>Magnitude anchor:</b> ' + esc(c.magnitude_anchor) + "</div>";
    if (c.builds_on && c.builds_on.length) {
      const names = c.builds_on.map(id => { const b = CARDS.find(x => x.id === id); return b ? b.term : id; });
      h += '<div class="builds">Builds on: <b>' + names.map(esc).join("</b> · <b>") + "</b></div>";
    }
    return h;
  }

  function askBtn(card, isNews) {
    const b = el("button", "btn solid", "Ask Claude");
    b.onclick = () => openChat(card, isNews);
    return b;
  }

  // ---------- embedded chat (key lives in localStorage only — see ask-claude.js) ----------
  let chat = null;
  function openChat(card, isNews) {
    closeChat();
    const ov = el("div", "chat-ov");
    const panel = el("div", "chat-panel");
    ov.appendChild(panel);
    document.body.appendChild(ov);
    chat = { card, isNews, messages: [], ov, panel, busy: false };
    AskClaude.getKey() ? renderChatView() : renderKeySetup();
  }
  function closeChat() { if (chat) { chat.ov.remove(); chat = null; } }

  function chatHeader(title) {
    const h = el("div", "chat-head");
    h.appendChild(el("h3", null, title));
    const key = el("button", "mini", "key");
    key.onclick = () => { if (confirm("Replace the stored API key?")) { AskClaude.clearKey(); renderKeySetup(); } };
    const x = el("button", "chat-x", "✕");
    x.onclick = closeChat;
    h.append(key, x);
    return h;
  }

  function renderKeySetup() {
    const p = chat.panel; p.innerHTML = "";
    p.appendChild(chatHeader("Set up Ask Claude (one time)"));
    p.appendChild(el("p", "key-copy",
      "Chat runs on your own Anthropic API key, stored only on this device — never in the app's code."));
    p.appendChild(el("ol", "key-steps",
      "<li>Go to <b>console.anthropic.com</b> and sign in</li>" +
      "<li>Billing → buy <b>$5</b> of credits, and set a <b>$5 monthly spend limit</b></li>" +
      "<li>API Keys → Create Key → copy it</li>" +
      "<li>Paste it below</li>"));
    p.appendChild(el("p", "key-note",
      "Cost reality: about $0.002 per question — a few cents a month. The $5 cap is the ceiling."));
    const row = el("div", "chat-row");
    const inp = el("input", "chat-in");
    inp.type = "password"; inp.placeholder = "sk-ant-…";
    const save = el("button", "chat-send", "Save");
    save.onclick = () => {
      const v = inp.value.trim();
      if (!v) return;
      if (!v.startsWith("sk-ant-") && !confirm("That doesn't look like an Anthropic key (sk-ant-…). Save anyway?")) return;
      AskClaude.setKey(v);
      renderChatView();
    };
    row.append(inp, save);
    p.appendChild(row);
    const alt = el("a", "mini", "or open this question on claude.ai in the browser instead");
    alt.href = AskClaude.webUrl(chat.card, chat.isNews);
    alt.style.cssText = "display:block;text-align:center;margin-top:10px;color:var(--blue);font-size:12px;";
    p.appendChild(alt);
  }

  function renderChatView() {
    const p = chat.panel; p.innerHTML = "";
    p.appendChild(chatHeader("Ask Claude"));
    const ctx = AskClaude.contextFor(chat.card, chat.isNews);
    p.appendChild(el("div", "chat-ctx", esc(ctx.length > 110 ? ctx.slice(0, 110) + "…" : ctx)));
    const msgs = el("div", "chat-msgs");
    p.appendChild(msgs);
    if (!chat.messages.length) {
      const sugg = el("button", "chip-sugg", "Explain this more simply");
      sugg.onclick = () => sendMsg("Explain this more simply.");
      msgs.appendChild(sugg);
    }
    const row = el("div", "chat-row");
    const inp = el("input", "chat-in");
    inp.placeholder = "Ask anything about this…";
    inp.onkeydown = e => { if (e.key === "Enter") sendMsg(inp.value), inp.value = ""; };
    const send = el("button", "chat-send", "Send");
    send.onclick = () => { sendMsg(inp.value); inp.value = ""; };
    row.append(inp, send);
    p.appendChild(row);
    chat.ui = { msgs, inp, send };
    inp.focus();
  }

  function addBubble(cls, text) {
    const m = el("div", "msg " + cls);
    m.textContent = text;
    const sugg = chat.ui.msgs.querySelector(".chip-sugg");
    if (sugg) sugg.remove();
    chat.ui.msgs.appendChild(m);
    chat.ui.msgs.scrollTop = chat.ui.msgs.scrollHeight;
    return m;
  }

  async function sendMsg(text) {
    if (!chat || !text.trim() || chat.busy) return;
    const first = chat.messages.length === 0;
    chat.messages.push({ role: "user",
      content: first ? AskClaude.contextFor(chat.card, chat.isNews) + "\n\nMy question: " + text : text });
    addBubble("user", text.trim());
    const pend = addBubble("ai pending", "…");
    chat.busy = true; chat.ui.send.disabled = true;
    try {
      const reply = await AskClaude.send(chat.messages);
      chat.messages.push({ role: "assistant", content: reply });
      pend.textContent = reply;
      pend.classList.remove("pending");
    } catch (err) {
      chat.messages.pop(); // let the same question be retried
      pend.textContent = (err && err.msg) || "Something went wrong.";
      pend.classList.remove("pending"); pend.classList.add("err");
      if (err && err.kind === "auth") { AskClaude.clearKey(); setTimeout(() => chat && renderKeySetup(), 1500); }
    }
    chat.busy = false;
    if (chat && chat.ui) { chat.ui.send.disabled = false; chat.ui.msgs.scrollTop = chat.ui.msgs.scrollHeight; }
  }

  // ---------- screens ----------
  const main = () => $("#main");
  function show(node) { main().innerHTML = ""; main().appendChild(node); window.scrollTo(0, 0); refreshHeader(); }
  function refreshHeader() {
    const s = Progress.stats(TERMS);
    $("#streak").textContent = s.streak > 0 ? "🔥 " + s.streak : "";
    $("#tally").textContent = s.done + s.learning + "/" + s.total;
  }

  // Day-1 placement sweep
  function sweepScreen() {
    const box = el("div");
    box.appendChild(el("div", "card",
      "<h3>Welcome. One-time setup (~3 min)</h3><p>Check everything you <b>already know</b>. " +
      "It gets skipped so week one isn't spent on things like “revenue”. Not sure = leave unchecked. " +
      "Checked terms get one spot-check in a month — cheap insurance.</p>"));
    const list = el("div", "card");
    TERMS.forEach(c => {
      const row = el("label", "sweep-row");
      row.innerHTML = '<input type="checkbox" value="' + c.id + '"><span><b>' + esc(c.term) + "</b> — " +
        esc(c.definition.split(".")[0]) + ".</span>";
      list.appendChild(row);
    });
    box.appendChild(list);
    const go = el("button", "btn solid wide", "Start learning →");
    go.onclick = () => {
      const ids = [...list.querySelectorAll("input:checked")].map(i => i.value);
      Progress.completeSweep(ids);
      newCardsScreen();
    };
    box.appendChild(go);
    show(box);
  }

  // 2 new cards per day; skip swaps in the next instantly
  function newCardsScreen() {
    const remaining = Progress.newRemainingToday();
    if (remaining === 0) return newsScreen();
    const queue = Progress.nextNewCards(TERMS, 1);
    if (!queue.length) {
      const d = el("div", "card",
        "<h3>Queue empty 🎉</h3><p>You've been through every card built so far (Stage 1). " +
        "Stages 2–10 are coming in the next build sessions. Reviews keep working meanwhile.</p>");
      const b = el("button", "btn solid wide", "Continue →");
      b.onclick = newsScreen;
      d.appendChild(b);
      return show(d);
    }
    const c = queue[0];
    const box = el("div");
    box.appendChild(el("p", "stepline", "New today · " + (3 - remaining) + " of 2"));
    const card = el("div", "card", cardHTML(c));
    const row = el("div", "btnrow");
    const skip = el("button", "btn ghost", "I know this");
    skip.onclick = () => { Progress.markSkipped(c.id); newCardsScreen(); };
    const got = el("button", "btn solid", "Got it");
    got.onclick = () => { Progress.markLearned(c.id); newCardsScreen(); };
    row.append(skip, got);
    card.appendChild(row);
    card.appendChild(askBtn(c, false)).classList.add("asklink");
    box.appendChild(card);
    show(box);
  }

  // 3 news stories from data/news-latest.json (Phase 2 task overwrites it daily)
  function newsScreen() {
    fetch("data/news-latest.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => (window.NEWS_FALLBACK || null))
      .then(news => renderNews(news));
  }
  function renderNews(news) {
    const box = el("div");
    if (!news || !news.stories || !news.stories.length) {
      box.appendChild(el("div", "card",
        "<h3>No news yet</h3><p>The morning news task isn't set up yet (Phase 2). Terms and review work fine without it.</p>"));
    } else {
      const stale = news.date !== Progress.today();
      let badge = "";
      if (news.sample) badge = '<span class="badge">sample</span>';
      else if (stale) badge = '<span class="badge stale">stale — from ' + esc(news.date) + "</span>";
      box.appendChild(el("p", "stepline", "Today's stories · " + news.stories.length + " " + badge));
      news.stories.forEach(st => {
        const card = el("div", "card",
          '<span class="tag news">News</span><h3>' + esc(st.headline) + "</h3><p>" + esc(st.summary) + "</p>" +
          (st.who_benefits ? '<div class="whyline"><b>Who benefits:</b> ' + esc(st.who_benefits) + "</div>" : ""));
        if (st.jargon && st.jargon.length) {
          const tags = st.jargon.map(j => {
            const known = !!Progress.load().terms[j.id];
            return '<span class="' + (known ? "known" : "new") + '">' + esc(j.term) + (known ? " ✓" : " — new") + "</span>";
          }).join(" · ");
          card.appendChild(el("div", "jargon", "Jargon here: " + tags));
        }
        card.appendChild(askBtn(st, true)).classList.add("asklink");
        box.appendChild(card);
      });
    }
    const b = el("button", "btn solid wide", "On to review →");
    b.onclick = reviewScreen;
    box.appendChild(b);
    show(box);
  }

  // Spaced review: tap to reveal, then remembered / forgot
  function reviewScreen() {
    const due = Progress.dueReviews(TERMS);
    if (!due.length) return doneScreen(0);
    let i = 0, count = due.length;
    const next = () => { i += 1; i < due.length ? renderOne() : doneScreen(count); };
    const renderOne = () => {
      const c = due[i];
      const box = el("div");
      box.appendChild(el("p", "stepline", "Quick review · " + (i + 1) + " of " + due.length));
      const card = el("div", "card center", '<span class="tag term">Remember this?</span><h3>' + esc(c.term) + "</h3>");
      const reveal = el("button", "btn ghost wide", "Tap to reveal");
      reveal.onclick = () => {
        card.innerHTML = cardHTML(c);
        const row = el("div", "btnrow");
        const no = el("button", "btn ghost", "Forgot");
        no.onclick = () => { Progress.reviewResult(c.id, false); next(); };
        const yes = el("button", "btn solid", "Knew it");
        yes.onclick = () => { Progress.reviewResult(c.id, true); next(); };
        row.append(no, yes);
        card.appendChild(row);
      };
      card.appendChild(reveal);
      box.appendChild(card);
      show(box);
    };
    renderOne();
  }

  function doneScreen(reviewed) {
    Progress.markReviewsDone();
    const streak = Progress.completeDay();
    const s = Progress.stats(TERMS);
    const box = el("div");
    box.appendChild(el("div", "card center",
      "<h3>Done for today 🔥 " + streak + "</h3><p>" +
      (reviewed ? reviewed + " reviews cleared. " : "") +
      s.learning + " terms in rotation · " + s.done + " known · see you tomorrow with coffee.</p>"));
    refreshHeader();
    show(box);
  }

  // ---------- boot ----------
  Progress.load().sweepDone ? newCardsScreen() : sweepScreen();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
