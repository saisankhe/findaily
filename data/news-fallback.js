// SAMPLE news, shown ONLY when data/news-latest.json can't be fetched
// (e.g. previewing the app as a local file on the Mac). The Phase 2 morning
// task overwrites news-latest.json daily; hosted users never see this file.
window.NEWS_FALLBACK = {
  "date": "2026-07-09",
  "sample": true,
  "stories": [
    {
      "headline": "The Fed holds interest rates steady again",
      "summary": "The Federal Reserve — the referee of US borrowing costs — decided not to change interest rates this month. Loans, mortgages, and credit cards stay about as expensive as they were. Markets mostly shrugged, because everyone expected it: no surprise, no big price moves.",
      "who_benefits": "Savers keep earning decent interest on cash. Borrowers hoping for cheaper mortgages have to keep waiting.",
      "jargon": [
        { "id": "interest", "term": "interest" },
        { "id": "market", "term": "markets" }
      ]
    },
    {
      "headline": "A big chipmaker beats profit expectations",
      "summary": "A major semiconductor company reported higher profit than analysts predicted, and its stock jumped. The key rookie insight: the stock rose not because business is good, but because it was BETTER THAN EXPECTED. Markets price in predictions ahead of time — surprises are what move prices.",
      "who_benefits": "Shareholders and employees paid in stock. Competitors now face pressure to match performance or cut prices.",
      "jargon": [
        { "id": "profit", "term": "profit" },
        { "id": "stock", "term": "stock" },
        { "id": "shareholder", "term": "shareholders" }
      ]
    }
  ]
};
