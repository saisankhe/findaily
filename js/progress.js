// FinDaily progress.js — all state lives in localStorage on this phone. No server.
// Review ladder (locked in plan): learn → +2d → +1w → +1mo → out of rotation.
// Skipped/swept terms: one spot-check at +1mo. Pass → gone. Fail → back to learning.

const Progress = (() => {
  const KEY = "findaily_v1";
  const INTERVALS = [2, 7, 30]; // days between reviews

  const today = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const daysBetween = (a, b) =>
    Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

  let state = null;

  function blank() {
    return {
      started: today(),
      sweepDone: false,
      terms: {},          // id -> {status, learnedOn, step, nextReview, spotCheck}
      streak: { count: 0, lastDay: null },
      daily: { date: today(), newDone: 0, reviewsDone: false }
    };
  }

  function load() {
    if (state) return state;
    try { state = JSON.parse(localStorage.getItem(KEY)) || blank(); }
    catch (e) { state = blank(); }
    // day rollover
    if (state.daily.date !== today()) {
      state.daily = { date: today(), newDone: 0, reviewsDone: false };
      save();
    }
    return state;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  // --- placement sweep ---
  function completeSweep(knownIds) {
    load();
    knownIds.forEach(id => {
      state.terms[id] = { status: "skipped", learnedOn: today(), spotCheck: addDays(today(), 30) };
    });
    state.sweepDone = true;
    save();
  }

  // --- new cards ---
  function nextNewCards(cards, limit) {
    load();
    const fresh = cards.filter(c => !state.terms[c.id]);
    return fresh.slice(0, limit);
  }
  function newRemainingToday() {
    load();
    return Math.max(0, 2 - state.daily.newDone);
  }
  function markLearned(id) {
    load();
    state.terms[id] = { status: "learning", learnedOn: today(), step: 0, nextReview: addDays(today(), INTERVALS[0]) };
    state.daily.newDone += 1;
    save();
  }
  function markSkipped(id) {
    load();
    state.terms[id] = { status: "skipped", learnedOn: today(), spotCheck: addDays(today(), 30) };
    save(); // skips do NOT consume a daily slot — next term swaps in
  }

  // --- reviews ---
  function dueReviews(cards) {
    load();
    const t = today();
    return cards.filter(c => {
      const s = state.terms[c.id];
      if (!s) return false;
      if (s.status === "learning" && s.nextReview <= t) return true;
      if (s.status === "skipped" && s.spotCheck && s.spotCheck <= t) return true;
      return false;
    });
  }
  function reviewResult(id, remembered) {
    load();
    const s = state.terms[id];
    if (!s) return;
    if (s.status === "skipped") { // spot-check
      if (remembered) { s.status = "mastered"; delete s.spotCheck; }
      else { s.status = "learning"; s.step = 0; s.nextReview = addDays(today(), INTERVALS[0]); delete s.spotCheck; }
    } else if (remembered) {
      s.step += 1;
      if (s.step >= INTERVALS.length) { s.status = "mastered"; delete s.nextReview; }
      else s.nextReview = addDays(today(), INTERVALS[s.step]);
    } else {
      s.step = 0;
      s.nextReview = addDays(today(), INTERVALS[0]);
    }
    save();
  }
  function markReviewsDone() { load(); state.daily.reviewsDone = true; save(); }

  // --- streak: ticks when today's loop is finished ---
  function completeDay() {
    load();
    const t = today();
    if (state.streak.lastDay === t) return state.streak.count;
    if (state.streak.lastDay && daysBetween(state.streak.lastDay, t) === 1) state.streak.count += 1;
    else state.streak.count = 1;
    state.streak.lastDay = t;
    save();
    return state.streak.count;
  }

  function stats(cards) {
    load();
    let learning = 0, done = 0;
    cards.forEach(c => {
      const s = state.terms[c.id];
      if (!s) return;
      if (s.status === "learning") learning += 1;
      else done += 1; // skipped or mastered
    });
    return { learning, done, total: cards.length, streak: state.streak.count };
  }

  return { load, save, today, completeSweep, nextNewCards, newRemainingToday,
           markLearned, markSkipped, dueReviews, reviewResult, markReviewsDone,
           completeDay, stats,
           _reset: () => { state = blank(); save(); } };
})();
if (typeof window !== "undefined") window.Progress = Progress;
if (typeof module !== "undefined") module.exports = Progress; // for tests only
