/* Cars in stock: search, filters (brand, body, fuel, price, mileage, year,
   gearbox, new/used, city, seats, methane), sorting. The filters live in
   the address (cars.html?body=suv&priceMax=300), so a search can be shared,
   bookmarked or reloaded. On phones the filters open as a panel. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, card, mln, km, icon, num } = Site;
  let f = Calc.fromQuery(location.search);
  const PRICE_MAX = Math.ceil(Math.max(...DATA.CARS.map((c) => c.price)) / 100) * 100;
  const KM_MAX = 150000;
  const years = [...new Set(DATA.CARS.map((c) => c.year))].sort((a, b) => b - a);
  const cities = [...new Set(DATA.SHOWROOMS.map((s) => s.city))];

  // write the filters into the address without adding a history step per click
  function save() {
    const q = Calc.toQuery(f);
    history.replaceState(null, "", "cars.html" + (q ? "?" + q : ""));
  }
  function set(patch) { f = { ...f, ...patch }; save(); renderList(); }

  /* ---------- filter fields (drawn once per language, so focus is kept) ---------- */
  function checks(key, values, label) {
    return el("fieldset", { class: "filter-group" }, el("legend", { text: t("filter." + key) }),
      el("div", { class: "chip-row" }, values.map((v) => el("label", { class: "chip chip-radio" },
        el("input", { type: "checkbox", name: key, value: v, checked: f[key].includes(v),
          onchange: (e) => set({ [key]: e.target.checked ? [...f[key], v] : f[key].filter((x) => x !== v) }) }),
        el("span", { text: label(v) })))));
  }
  function radios(key, values) {
    return Site.choice({ name: key, legend: t("filter." + key), value: f[key],
      options: values.map((v) => [v, v === "any" ? t("filter.any") : t(key + "." + v)]),
      onChange: (v) => set({ [key]: v }) });
  }
  function select(key, options) {
    const id = "f-" + key;
    return el("div", { class: "field" }, el("label", { for: id, text: t("filter." + key) }),
      el("select", { id, class: "select", onchange: (e) => set({ [key]: isNaN(e.target.value) || e.target.value === "any" ? e.target.value : Number(e.target.value) }) },
        options.map(([v, text]) => el("option", { value: v, text, selected: String(f[key]) === String(v) }))));
  }
  function priceFields() {
    // two sliders; if they cross, the other one moves along
    const fmt = (v) => (v ? mln(v) : t("filter.any"));
    const lo = Site.slider({ id: "priceMin", label: t("filter.priceMin"), min: 0, max: PRICE_MAX, step: 10, value: f.priceMin, format: fmt,
      onInput: (v) => { if (f.priceMax && v > f.priceMax) syncSlider("priceMax", v); set({ priceMin: v }); } });
    const hi = Site.slider({ id: "priceMax", label: t("filter.priceMax"), min: 0, max: PRICE_MAX, step: 10, value: f.priceMax || PRICE_MAX, format: (v) => (v >= PRICE_MAX ? t("filter.any") : mln(v)),
      onInput: (v) => { const val = v >= PRICE_MAX ? 0 : v; if (val && f.priceMin > val) syncSlider("priceMin", val); set({ priceMax: val }); } });
    return el("fieldset", { class: "filter-group" }, el("legend", { text: t("filter.price") }), lo, hi);
  }
  function syncSlider(id, v) {
    const s = $(id);
    s.value = v;
    s.dispatchEvent(new Event("input"));
  }
  function renderFilters() {
    $("filterFields").replaceChildren(
      checks("brand", DATA.BRANDS, (b) => DATA.BRAND_NAMES[b]),
      checks("body", DATA.BODIES, (b) => t("body." + b)),
      priceFields(),
      Site.slider({ id: "kmMax", label: t("filter.kmMax"), min: 0, max: KM_MAX, step: 5000, value: f.kmMax || KM_MAX,
        format: (v) => (v >= KM_MAX ? t("filter.any") : t("filter.upToKm", { km: km(v) })), onInput: (v) => set({ kmMax: v >= KM_MAX ? 0 : v }) }),
      select("yearMin", [[0, t("filter.any")], ...years.map((y) => [y, t("filter.fromYear", { year: y })])]),
      radios("condition", ["any", "new", "used"]),
      checks("fuel", DATA.FUELS, (v) => t("fuel." + v)),
      radios("gearbox", ["any", "auto", "manual"]),
      select("city", [["any", t("filter.anyCity")], ...cities.map((c) => [c, t("city." + c)])]),
      select("seats", [[0, t("filter.any")], [5, t("filter.seatsMin", { n: 5 })], [7, t("filter.seatsMin", { n: 7 })]]),
      el("label", { class: "switch" }, el("input", { type: "checkbox", checked: f.methane, onchange: (e) => set({ methane: e.target.checked }) }), el("span", { text: t("filter.methane") })));
    $("sort").replaceChildren(...Object.keys({ recommended: 1, "price-asc": 1, "price-desc": 1, "km-asc": 1, "year-desc": 1, "power-desc": 1, "cost-asc": 1 })
      .map((s) => el("option", { value: s, text: t("sort." + s), selected: f.sort === s })));
    $("q").value = f.q;
    $("filtersClose").replaceChildren(icon("x", 20));
  }

  /* ---------- the list ---------- */
  function activeChips() {
    const chips = [];
    const add = (text, patch) => chips.push(el("button", { type: "button", class: "chip chip-active", "aria-label": t("filter.removeOne", { what: text }),
      onclick: () => { set(patch); renderFilters(); } }, el("span", { text }), icon("x", 14)));
    if (f.q) add(`“${f.q}”`, { q: "" });
    f.brand.forEach((b) => add(DATA.BRAND_NAMES[b], { brand: f.brand.filter((x) => x !== b) }));
    f.body.forEach((b) => add(t("body." + b), { body: f.body.filter((x) => x !== b) }));
    f.fuel.forEach((v) => add(t("fuel." + v), { fuel: f.fuel.filter((x) => x !== v) }));
    if (f.priceMin) add(t("filter.chipFrom", { sum: mln(f.priceMin) }), { priceMin: 0 });
    if (f.priceMax) add(t("filter.chipTo", { sum: mln(f.priceMax) }), { priceMax: 0 });
    if (f.kmMax) add(t("filter.upToKm", { km: km(f.kmMax) }), { kmMax: 0 });
    if (f.yearMin) add(t("filter.fromYear", { year: f.yearMin }), { yearMin: 0 });
    if (f.condition !== "any") add(t("condition." + f.condition), { condition: "any" });
    if (f.gearbox !== "any") add(t("gearbox." + f.gearbox), { gearbox: "any" });
    if (f.city !== "any") add(t("city." + f.city), { city: "any" });
    if (f.seats) add(t("filter.seatsMin", { n: f.seats }), { seats: 0 });
    if (f.methane) add(t("filter.methane"), { methane: false });
    return chips;
  }
  function renderList() {
    const list = Calc.sortCars(Calc.filterCars(f), f.sort);
    const chips = activeChips();
    $("activeFilters").replaceChildren(...chips);
    $("count").textContent = t("filter.count", { count: list.length });
    $("list").replaceChildren(...list.map((c) => card(c, { extra: f.sort === "cost-asc" ? costLine(c) : null })));
    $("empty").hidden = list.length > 0;
    $("emptyText").textContent = t("filter.emptyText");
    $("filtersToggle").replaceChildren(icon("sliders", 18), el("span", { text: chips.length ? t("filter.toggleN", { n: chips.length }) : t("filter.toggle") }));
    $("filtersDone").textContent = t("filter.show", { count: list.length });
  }
  // when sorting by running cost, show that cost on each card
  function costLine(c) {
    const cost = Calc.runningCost(c, { kmWeek: 300, methane: c.methane }).total;
    return el("p", { class: "card-note", text: t("card.cost", { sum: Site.money(cost) }) });
  }

  function render() { renderFilters(); renderList(); }

  /* ---------- events ---------- */
  let typing;
  $("q").addEventListener("input", (e) => { clearTimeout(typing); typing = setTimeout(() => set({ q: e.target.value.trim() }), 200); });
  $("sort").addEventListener("change", (e) => set({ sort: e.target.value }));
  const reset = () => { f = Calc.fromQuery(""); save(); render(); $("q").focus(); };
  $("reset").addEventListener("click", reset);
  $("reset2").addEventListener("click", reset);
  // phone: the filters open as a panel over the list
  const panel = $("filters"), toggle = $("filtersToggle");
  function openPanel(open) {
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) panel.querySelector("input, select, button").focus(); else toggle.focus();
  }
  toggle.addEventListener("click", () => openPanel(true));
  $("filtersClose").addEventListener("click", () => openPanel(false));
  $("filtersDone").addEventListener("click", () => openPanel(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) openPanel(false); });
  panel.addEventListener("submit", (e) => e.preventDefault());

  Site.start(render, { title: () => t("page.cars"), onChange: renderList });
})();
