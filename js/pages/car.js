/* One car (car.html?id=c01): photo gallery (arrows, thumbnails, keyboard,
   swipe), price and monthly payment, save / compare / test drive, the key
   facts, a running-cost calculator, full specs, the showroom and similar cars. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, mln, money, km, num, icon } = Site;
  const id = new URLSearchParams(location.search).get("id");
  const c = DATA.car(id);
  const VIEWS = ["front", "side", "interior"];
  let shown = 0; // gallery index

  /* ---------- gallery ---------- */
  function gallery() {
    const count = Math.max(VIEWS.length, Site.photos(c).length);
    const main = el("div", { class: "gallery-main", tabindex: "0", role: "group", "aria-roledescription": t("gallery.role"),
      "aria-label": t("gallery.label", { n: shown + 1, count }) },
      Site.photo(c, { index: shown, view: VIEWS[shown], eager: true, sizes: "(min-width: 960px) 640px, 100vw" }));
    const go = (i) => { shown = (i + count) % count; redrawGallery(); };
    main.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(shown + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(shown - 1); }
    });
    // swipe on touch screens
    let startX = null;
    main.addEventListener("pointerdown", (e) => { startX = e.clientX; });
    main.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(shown + (dx < 0 ? 1 : -1));
    });
    return el("section", { class: "gallery", id: "gallery", "aria-label": t("gallery.title") },
      main,
      el("button", { type: "button", class: "icon-btn gallery-prev", "aria-label": t("gallery.prev"), onclick: () => go(shown - 1) }, icon("left", 20)),
      el("button", { type: "button", class: "icon-btn gallery-next", "aria-label": t("gallery.next"), onclick: () => go(shown + 1) }, icon("right", 20)),
      el("div", { class: "gallery-thumbs" }, Array.from({ length: count }, (_, i) =>
        el("button", { type: "button", class: "thumb", "aria-pressed": String(i === shown), "aria-label": t("gallery.show", { view: t("photo.view." + (VIEWS[i] || "other")) }), onclick: () => go(i) },
          Site.photo(c, { index: i, view: VIEWS[i], sizes: "96px" })))));
  }
  function redrawGallery() {
    const old = $("gallery");
    const hadFocus = old.contains(document.activeElement) && document.activeElement.classList.contains("gallery-main");
    old.replaceWith(gallery());
    if (hadFocus) document.querySelector(".gallery-main").focus();
  }

  /* ---------- running costs ---------- */
  function costTool() {
    const prefs = Store.costPrefs();
    const m = c.m;
    const state = {
      kmWeek: prefs.kmWeek,
      methane: m.gas ? (c.methane || prefs.methane) : false,
      homeCharging: prefs.homeCharging,
      kasko: prefs.kasko,
      prices: { ...DATA.PRICES, ...prefs.prices },
    };
    const out = el("div", { class: "cost-result", "aria-live": "polite" });
    // the big total stays the same element, so it can count smoothly to its new value
    const totalNode = el("strong", { class: "num" });
    function update() {
      const r = Calc.runningCost(c, state);
      // the same driving in the other cars in stock, for a comparison
      const others = DATA.CARS.map((x) => Calc.runningCost(x, { ...state, methane: x.methane })).map((x) => x.total);
      const avg = others.reduce((a, b) => a + b, 0) / others.length;
      const diff = r.total - avg;
      const parts = [["energy", r.energy], ["insurance", r.insurance], ["service", r.service]];
      const used = r.litres ? t("cost.litres", { n: num(r.litres) }) : r.m3 ? t("cost.m3", { n: num(r.m3) }) : "";
      const kwh = r.kwh ? t("cost.kwh", { n: num(r.kwh) }) : "";
      out.replaceChildren(
        el("p", { class: "cost-label-top", text: t("cost.estimate") }),
        el("p", { class: "cost-total" }, totalNode, el("span", { text: " " + t("cost.perMonth") })),
        el("p", { class: "cost-sub", text: t("cost.sub", { km: km(Math.round(r.kmMonth)), perKm: t("money.som", { n: num(Math.round(r.perKm)) }), year: money(r.year) }) }),
        el("ul", { class: "cost-parts" }, parts.map(([k, v]) => el("li", null,
          el("span", { class: "cost-label", text: t("cost." + k) }),
          el("span", { class: "cost-bar", "aria-hidden": "true" }, el("span", { style: `width:${r.total ? Math.round((100 * v) / r.total) : 0}%` })),
          el("span", { class: "cost-value", text: money(v) })))),
        el("p", { class: "hint", text: [used, kwh].filter(Boolean).join(" + ") }),
        m.fuel === "phev" ? el("p", { class: "hint", text: t("cost.eShare", { pct: Math.round(r.eShare * 100) }) }) : "", // (replaceChildren would print "false")
        el("p", { class: "cost-compare", text: Math.abs(diff) < 50000 ? t("cost.average") : t(diff < 0 ? "cost.less" : "cost.more", { sum: money(Math.abs(diff)) }) }));
      Site.tween(totalNode, r.total, money);
      renderOwn(state);
      Store.setCostPrefs({ kmWeek: state.kmWeek, homeCharging: state.homeCharging, kasko: state.kasko,
        prices: Object.fromEntries(Object.entries(state.prices).filter(([k, v]) => typeof v === "number" && v !== DATA.PRICES[k])) });
    }
    const toggle = (key, text) => el("label", { class: "switch" },
      el("input", { type: "checkbox", checked: state[key], onchange: (e) => { state[key] = e.target.checked; update(); } }), el("span", { text }));
    const priceInput = (key) => el("div", { class: "field" },
      el("label", { for: "price-" + key, text: t("cost.price." + key) }),
      el("input", { id: "price-" + key, class: "input", type: "number", inputmode: "numeric", min: 0, step: 100, value: state.prices[key],
        oninput: (e) => { const v = Number(e.target.value); if (v >= 0) { state.prices[key] = v; update(); } } }));
    const priceKeys = m.fuel === "ev" ? ["homeKwh", "publicKwh"] : m.fuel === "phev" ? ["petrol", "homeKwh"] : m.gas ? ["petrol", "methane"] : ["petrol"];
    const tool = el("section", { class: "section cost-tool", "aria-labelledby": "costTitle" },
      el("h2", { id: "costTitle", text: t("cost.title") }),
      el("p", { text: t("cost.intro") }),
      el("div", { class: "cost-layout" },
        el("div", { class: "cost-inputs" },
          Site.slider({ id: "kmWeek", label: t("cost.kmWeek"), min: 50, max: 2000, step: 50, value: state.kmWeek, format: (v) => km(v), onInput: (v) => { state.kmWeek = v; update(); },
            hint: t("cost.kmHint") }),
          m.gas && toggle("methane", t("cost.methane")),
          m.fuel !== "petrol" && toggle("homeCharging", t("cost.home")),
          toggle("kasko", t("cost.kasko")),
          el("details", { class: "cost-prices" }, el("summary", { text: t("cost.prices") }), priceKeys.map(priceInput), el("p", { class: "hint", text: t("cost.pricesNote") }))),
        out));
    update();
    return tool;
  }

  /* ---------- MOTORA ownership cost: loan + running, follows the calculator ---------- */
  const ownNodes = {};
  function ownPanel() {
    ownNodes.total = el("strong", { class: "num" });
    ownNodes.loan = el("dd", { class: "num" });
    ownNodes.running = el("dd", { class: "num" });
    ownNodes.km = el("p", { class: "hint" });
    return el("section", { class: "own-panel", "aria-labelledby": "ownTitle" },
      el("h2", { id: "ownTitle", class: "own-title", text: t("own.title") }),
      el("p", { class: "own-big", "aria-live": "polite" }, ownNodes.total, el("span", { text: " " + t("own.month") })),
      el("dl", { class: "own-rows" },
        el("div", null, el("dt", { text: t("own.loan", { down: 30, months: 36, rate: DATA.FINANCE.rate }) }), ownNodes.loan),
        el("div", null, el("dt", null, el("a", { href: "#costTitle", text: t("own.running") })), ownNodes.running)),
      ownNodes.km,
      el("p", { class: "own-disclaimer", text: t("own.disclaimer") }));
  }
  function renderOwn(state) {
    if (!ownNodes.total) return;
    const o = Calc.ownership(c, state);
    Site.tween(ownNodes.total, o.total, Site.mlnShort);
    ownNodes.loan.textContent = money(o.loan);
    ownNodes.running.textContent = money(o.running);
    ownNodes.km.textContent = t("own.km", { km: km(state.kmWeek) });
  }

  /* ---------- specs ---------- */
  function specs() {
    const m = c.m;
    const room = DATA.SHOWROOMS.find((s) => s.id === c.showroom);
    const rows = [
      ["year", String(c.year)], ["km", km(c.km)], ["engine", t("spec.engineValue", { engine: m.engine, hp: m.hp })],
      ["gearbox", t("gearbox." + c.gearbox)], ["drive", t("drivetrain." + m.drive)], ["fuel", t("fuel." + m.fuel)],
      m.l100 && ["l100", t("spec.l100Value", { n: num(m.l100, 1) })],
      m.kwh100 && ["kwh100", t("spec.kwh100Value", { n: num(m.kwh100) })],
      m.eRange && ["eRange", km(m.eRange)],
      ["seats", String(m.seats)], ["trunk", m.trunk ? t("spec.litres", { n: num(m.trunk) }) : t("spec.cargo")],
      ["length", t("spec.mm", { n: num(m.length) })], ["clearance", t("spec.mm", { n: num(m.clearance) })],
      ["airbags", String(m.airbags)], ["warranty", t("spec.warrantyValue", { years: Math.max(0, m.warranty - (DATA.THIS_YEAR - c.year)), total: m.warranty })],
      ["colour", t("colour." + c.colour)], ["methane", c.methane ? t("spec.methaneYes") : m.gas ? t("spec.methaneCan") : t("spec.methaneNo")],
      ["showroom", `${t("city." + room.city)}, ${room.address[Site.lang()]}`],
    ].filter(Boolean);
    return el("section", { class: "section", "aria-labelledby": "specTitle" },
      el("h2", { id: "specTitle", text: t("spec.title") }),
      el("dl", { class: "spec-list" }, rows.map(([k, v]) => el("div", null, el("dt", { text: t("spec." + k) }), el("dd", { text: v })))));
  }

  function similar() {
    const list = DATA.CARS.filter((x) => x.id !== c.id && x.model !== c.model && (x.m.body === c.m.body || Math.abs(x.price - c.price) / c.price < 0.25))
      .sort((a, b) => Math.abs(a.price - c.price) - Math.abs(b.price - c.price)).slice(0, 3);
    return el("section", { class: "section", "aria-labelledby": "simTitle" },
      el("h2", { id: "simTitle", text: t("car.similar") }),
      el("div", { class: "card-grid" }, list.map((x) => Site.card(x))));
  }

  function render() {
    if (!c) {
      $("view").replaceChildren(el("div", { class: "empty" }, el("h1", { text: t("car.notFound") }), el("p", { text: t("car.notFoundText") }),
        el("a", { class: "btn", href: "cars.html", text: t("car.toList") })));
      return;
    }
    const monthly = Site.fromMonthly(c);
    $("crumbs").replaceChildren(el("ol", null,
      el("li", null, el("a", { href: "index.html", text: t("page.home") })),
      el("li", null, el("a", { href: "cars.html", text: t("page.cars") })),
      el("li", null, el("span", { "aria-current": "page", text: `${Site.carTitle(c)} ${c.trim}` }))));
    const own = ownPanel();
    $("view").replaceChildren(
      el("div", { class: "car-top" },
        gallery(),
        el("div", { class: "car-head" },
          Site.badges(c),
          el("h1", null, Site.carTitle(c), el("span", { class: "car-trim", text: " " + c.trim })),
          el("p", { class: "car-line", text: Site.carLine(c) }),
          el("p", { class: "car-price price", text: mln(c.price) }),
          el("p", { class: "car-monthly" }, t("car.monthly", { sum: money(monthly) }), " ", el("a", { href: "finance.html?car=" + c.id, text: t("car.toFinance") })),
          el("div", { class: "car-actions" },
            el("a", { class: "btn", href: "testdrive.html?car=" + c.id }, icon("calendar", 18), el("span", { text: t("car.testdrive") })),
            Site.saveButton(c, true), Site.compareButton(c, true)),
          own,
          el("p", { class: "car-about", text: c.m.about[Site.lang()] }),
          el("p", { class: "hint" }, t("car.tradeHint"), " ", el("a", { href: "tradein.html", text: t("car.toTrade") })))),
      costTool(),
      specs(),
      similar());
  }

  if (c) Store.viewed(c.id);
  // saving or comparing redraws only the buttons' states, not the calculator
  Site.start(render, {
    title: () => (c ? Site.carTitle(c) + " " + c.trim : t("car.notFound")),
    onChange: () => {
      if (!c) return;
      document.querySelectorAll(".car-actions .save-btn, .car-actions .compare-btn").forEach((b) => {
        const fresh = b.classList.contains("save-btn") ? Site.saveButton(c, true) : Site.compareButton(c, true);
        const focused = document.activeElement === b;
        b.replaceWith(fresh);
        if (focused) fresh.focus();
      });
      document.querySelectorAll(".card-actions").forEach((box) => {
        const link = box.closest(".car-card").querySelector(".card-title a");
        const other = DATA.car(new URL(link.href).searchParams.get("id"));
        box.replaceChildren(Site.saveButton(other), Site.compareButton(other));
      });
    },
  });
})();
