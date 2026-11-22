/* Everything the visitor saves, kept in localStorage (Core.store):
   saved cars, the compare list (up to 3), recently viewed cars, test drive
   bookings, the last trade-in estimate and the calculator settings.
   Store.onChange(fn) runs fn after every change (also from other tabs). */
(function () {
  "use strict";
  const S = Core.store;
  const listeners = [];
  const changed = () => listeners.forEach((fn) => fn());
  const list = (key) => S.getJSON(key, []).filter((id) => DATA.car(id)); // forget cars that are no longer in stock
  const MAX_COMPARE = 3;

  /* ---------- saved ---------- */
  const saved = () => list("saved");
  const isSaved = (id) => saved().includes(id);
  function toggleSaved(id) {
    const now = saved();
    const on = !now.includes(id);
    S.setJSON("saved", on ? [id, ...now] : now.filter((x) => x !== id));
    changed();
    return on;
  }

  /* ---------- compare ---------- */
  const comparing = () => list("compare");
  const isComparing = (id) => comparing().includes(id);
  // returns "added", "removed" or "full"
  function toggleCompare(id) {
    const now = comparing();
    if (now.includes(id)) { S.setJSON("compare", now.filter((x) => x !== id)); changed(); return "removed"; }
    if (now.length >= MAX_COMPARE) return "full";
    S.setJSON("compare", [...now, id]);
    changed();
    return "added";
  }
  function clearCompare() {
    const before = comparing();
    S.setJSON("compare", []);
    changed();
    return () => { S.setJSON("compare", before); changed(); };
  }

  /* ---------- recently viewed (no change event: it would redraw the page being viewed) ---------- */
  const recent = () => list("recent");
  function viewed(id) { S.setJSON("recent", [id, ...recent().filter((x) => x !== id)].slice(0, 8)); }

  /* ---------- test drive bookings ---------- */
  const bookings = () => S.getJSON("bookings", []).filter((b) => DATA.car(b.car));
  function addBooking(b) {
    // a short code to show at the showroom, e.g. TD-4K7P
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "TD-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const booking = { ...b, code, created: new Date().toISOString() };
    S.setJSON("bookings", [...bookings(), booking]);
    changed();
    return booking;
  }
  function cancelBooking(code) {
    const before = bookings();
    S.setJSON("bookings", before.filter((b) => b.code !== code));
    changed();
    return () => { S.setJSON("bookings", before); changed(); };
  }

  /* ---------- settings of the calculators ---------- */
  const COST_DEFAULTS = { kmWeek: 300, methane: false, homeCharging: true, kasko: false, prices: {} };
  const costPrefs = () => ({ ...COST_DEFAULTS, ...S.getJSON("costPrefs", {}) });
  const setCostPrefs = (p) => S.setJSON("costPrefs", { ...costPrefs(), ...p });
  const financePrefs = () => S.getJSON("finance", {});
  const setFinancePrefs = (p) => S.setJSON("finance", { ...financePrefs(), ...p });
  const finderAnswers = () => S.getJSON("finder", null);
  const setFinderAnswers = (a) => S.setJSON("finder", a);

  /* ---------- trade-in (used by the finance page) ---------- */
  const tradeIn = () => S.getJSON("tradeIn", null);
  function setTradeIn(t) { S.setJSON("tradeIn", t); changed(); }

  window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith((window.APP_NS || "app") + ":")) changed(); });

  window.Store = {
    saved, isSaved, toggleSaved, comparing, isComparing, toggleCompare, clearCompare, MAX_COMPARE,
    recent, viewed, bookings, addBooking, cancelBooking,
    costPrefs, setCostPrefs, financePrefs, setFinancePrefs, finderAnswers, setFinderAnswers, tradeIn, setTradeIn,
    onChange: (fn) => listeners.push(fn),
  };
})();
