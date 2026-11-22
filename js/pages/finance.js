/* Finance: loan or lease for a car in stock (finance.html?car=c01) or any
   price. Down payment, term, rate and the trade-in estimate change the
   monthly payment live; a chart shows what you still owe each month, and a
   table has every payment. A second tool works backwards: what price fits
   a monthly budget? */
(function () {
  "use strict";
  const { t } = Core;
  const { el, svgEl, $, mln, money, num } = Site;
  const MLN = Calc.MLN;
  const saved = Store.financePrefs();
  const fromUrl = DATA.car(new URLSearchParams(location.search).get("car"));
  const s = {
    car: fromUrl ? fromUrl.id : saved.car && DATA.car(saved.car) ? saved.car : "",
    price: saved.price || 200,
    kind: saved.kind || "loan",
    downPct: saved.downPct ?? 30,
    months: saved.months || 36,
    rate: saved.rate ?? DATA.FINANCE.rate,
    leaseRate: saved.leaseRate ?? DATA.FINANCE.leaseRate,
    residual: saved.residual ?? DATA.FINANCE.residual,
    useTrade: saved.useTrade ?? true,
    income: saved.income || 0,
    budget: saved.budget || 4,      // mln so'm a month
    cash: saved.cash ?? 60,         // mln so'm down
  };
  const priceMln = () => (s.car ? DATA.car(s.car).price : s.price);
  const trade = () => (s.useTrade && Store.tradeIn() ? Store.tradeIn().value.mid : 0);
  function persist() {
    const { car, price, kind, downPct, months, rate, leaseRate, residual, useTrade, income, budget, cash } = s;
    Store.setFinancePrefs({ car, price, kind, downPct, months, rate, leaseRate, residual, useTrade, income, budget, cash });
  }

  /* ---------- form ---------- */
  function renderForm() {
    const ti = Store.tradeIn();
    const carSelect = el("div", { class: "field" },
      el("label", { for: "fCar", text: t("finance.car") }),
      el("select", { id: "fCar", class: "select", onchange: (e) => { s.car = e.target.value; renderForm(); update(); } },
        el("option", { value: "", text: t("finance.ownPrice") }),
        Calc.sortCars(DATA.CARS, "price-asc").map((c) => el("option", { value: c.id, selected: c.id === s.car,
          text: `${Site.carTitle(c)} ${c.trim}, ${c.isNew ? t("car.new") : c.year} — ${mln(c.price)}` }))));
    const priceField = !s.car && el("div", { class: "field" },
      el("label", { for: "fPrice", text: t("finance.price") }),
      el("input", { id: "fPrice", class: "input", type: "number", inputmode: "decimal", min: 10, max: 5000, step: 1, value: s.price, "aria-describedby": "fPriceErr",
        oninput: (e) => {
          const v = Number(e.target.value);
          const ok = v >= 10 && v <= 5000;
          e.target.setAttribute("aria-invalid", String(!ok));
          $("fPriceErr").textContent = ok ? "" : t("finance.priceError");
          if (ok) { s.price = v; update(); }
        } }),
      el("p", { id: "fPriceErr", class: "field-error", "aria-live": "polite" }));
    const rateKey = s.kind === "lease" ? "leaseRate" : "rate";
    $("financeForm").replaceChildren(
      carSelect, priceField,
      Site.choice({ name: "kind", legend: t("finance.kind"), value: s.kind, options: [["loan", t("finance.loan")], ["lease", t("finance.lease")]],
        onChange: (v) => { s.kind = v; renderForm(); update(); } }),
      el("p", { class: "hint", text: t("finance.kindHint." + s.kind) }),
      Site.slider({ id: "fDown", label: t("finance.down"), min: 0, max: 90, step: 5, value: s.downPct,
        format: (v) => `${v}% · ${mln((priceMln() * v) / 100)}`, onInput: (v) => { s.downPct = v; update(); } }),
      ti ? el("label", { class: "switch" },
        el("input", { type: "checkbox", checked: s.useTrade, onchange: (e) => { s.useTrade = e.target.checked; update(); } }),
        el("span", { text: t("finance.useTrade", { car: ti.name, sum: mln(ti.value.mid) }) }))
        : el("p", { class: "hint" }, t("finance.noTrade"), " ", el("a", { href: "tradein.html", text: t("finance.toTrade") })),
      Site.slider({ id: "fMonths", label: t("finance.months"), min: DATA.FINANCE.minTerm, max: DATA.FINANCE.maxTerm, step: 6, value: s.months,
        format: (v) => t("finance.monthsValue", { count: v, years: num(v / 12, 1) }), onInput: (v) => { s.months = v; update(); } }),
      el("div", { class: "field" },
        el("label", { for: "fRate", text: t("finance.rate") }),
        el("input", { id: "fRate", class: "input", type: "number", inputmode: "decimal", min: 0, max: 60, step: 0.5, value: s[rateKey], "aria-describedby": "fRateErr",
          oninput: (e) => {
            const v = Number(e.target.value);
            const ok = e.target.value !== "" && v >= 0 && v <= 60;
            e.target.setAttribute("aria-invalid", String(!ok));
            $("fRateErr").textContent = ok ? "" : t("finance.rateError");
            if (ok) { s[rateKey] = v; update(); }
          } }),
        el("p", { id: "fRateErr", class: "field-error", "aria-live": "polite" })),
      s.kind === "lease" && Site.slider({ id: "fResidual", label: t("finance.residual"), min: 10, max: 50, step: 5, value: s.residual,
        format: (v) => `${v}% · ${mln((priceMln() * v) / 100)}`, onInput: (v) => { s.residual = v; update(); }, hint: t("finance.residualHint") }),
      el("div", { class: "field" },
        el("label", { for: "fIncome", text: t("finance.income") }),
        el("input", { id: "fIncome", class: "input", type: "number", inputmode: "numeric", min: 0, step: 100000, value: s.income || "",
          placeholder: t("finance.incomePlaceholder"), oninput: (e) => { s.income = Math.max(0, Number(e.target.value) || 0); update(); } }),
        el("p", { class: "hint", text: t("finance.incomeHint") })));
  }

  /* ---------- result ---------- */
  function calc() {
    const price = priceMln() * MLN;
    const tradeIn = Math.min(trade() * MLN, price);
    const down = Math.min(price - tradeIn, (price * s.downPct) / 100);
    const args = { price, down, tradeIn, months: s.months };
    return s.kind === "lease"
      ? Calc.lease({ ...args, rate: s.leaseRate, residualPct: s.residual })
      : Calc.loan({ ...args, rate: s.rate });
  }
  function update() {
    persist();
    // the slider labels show amounts of the price, so refresh them when the price changes
    const label = (id, pct) => { const o = document.querySelector(`output[for="${id}"]`); if (o) o.textContent = `${pct}% · ${mln((priceMln() * pct) / 100)}`; };
    label("fDown", s.downPct);
    label("fResidual", s.residual);
    const r = calc();
    const price = priceMln() * MLN;
    const rows = [
      [t("finance.financed"), money(r.principal)],
      trade() > 0 && [t("finance.tradeUsed"), money(Math.min(trade() * MLN, price))],
      [t("finance.interest"), money(r.interest)],
      r.kind === "lease" && [t("finance.buyout"), money(r.buyout)],
      [t("finance.total"), money(r.total)],
    ].filter(Boolean);
    $("payment").replaceChildren(
      el("p", { class: "pay-label", text: t(r.kind === "lease" ? "finance.perMonthLease" : "finance.perMonth") }),
      el("p", { class: "pay-big", text: r.principal > 0 ? money(r.monthly) : t("finance.nothing") }),
      el("dl", { class: "pay-rows" }, rows.map(([k, v]) => el("div", null, el("dt", { text: k }), el("dd", { text: v })))),
      el("p", { class: "hint", text: t("finance.overpay", { pct: price ? Math.round(((r.total - price) / price) * 100) : 0 }) }));
    $("chart").replaceChildren(chart(r));
    $("scheduleTable").replaceChildren(table(r));
    afford(r);
    budgetTool();
  }

  // what you still owe after each month (a lease ends at the buyout price)
  function chart(r) {
    const W = 640, H = 240, L = 64, R = 12, T = 16, B = 34;
    const pts = [{ month: 0, balance: r.principal }, ...r.rows];
    const max = Math.max(r.principal, 1);
    const x = (m) => L + ((W - L - R) * m) / s.months;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ");
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", role: "img", "aria-label": t("finance.chartLabel", { start: mln(r.principal / MLN), months: s.months, end: mln((r.buyout || 0) / MLN) }) });
    [0, 0.5, 1].forEach((f) => {
      svg.append(svgEl("line", { x1: L, x2: W - R, y1: y(max * f), y2: y(max * f), class: "chart-grid" }),
        svgEl("text", { x: L - 8, y: y(max * f) + 4, "text-anchor": "end", class: "chart-text" }, document.createTextNode(mln((max * f) / MLN))));
    });
    for (let m = 0; m <= s.months; m += 12) {
      svg.append(svgEl("text", { x: x(m), y: H - 10, "text-anchor": "middle", class: "chart-text" }, document.createTextNode(t("finance.monthTick", { n: m }))));
    }
    svg.append(svgEl("path", { d: `${line} L${x(s.months)} ${y(0)} L${x(0)} ${y(0)} Z`, class: "chart-area" }), svgEl("path", { d: line, class: "chart-line" }));
    return el("figure", { class: "chart-figure" }, el("figcaption", { text: t("finance.chartTitle") }), svg);
  }
  function table(r) {
    return el("table", { class: "table" },
      el("thead", null, el("tr", null, ["month", "payment", "interestCol", "principalCol", "balance"].map((k) => el("th", { scope: "col", text: t("finance." + k) })))),
      el("tbody", null, r.rows.map((row) => el("tr", null,
        el("th", { scope: "row", text: String(row.month) }), el("td", { text: money(r.monthly) }), el("td", { text: money(row.interest) }),
        el("td", { text: money(row.principal) }), el("td", { text: money(row.balance) })))));
  }
  // payment as a share of income: up to 30% is comfortable, over 45% is risky
  function afford(r) {
    if (!s.income || !r.monthly) { $("afford").replaceChildren(); return; }
    const pct = Math.round((r.monthly / s.income) * 100);
    const level = pct <= 30 ? "ok" : pct <= 45 ? "careful" : "high";
    $("afford").replaceChildren(el("p", { class: "afford-" + level }, el("strong", { text: t("finance.share", { pct }) }), " ", t("finance.afford." + level)));
  }

  /* ---------- what can I afford? ---------- */
  let budgetBuilt = false;
  function budgetTool() {
    if (!budgetBuilt) {
      $("budgetTool").replaceChildren(
        el("div", { class: "budget-inputs" },
          Site.slider({ id: "bMonthly", label: t("finance.budgetMonthly"), min: 1, max: 30, step: 0.5, value: s.budget, format: (v) => mln(v), onInput: (v) => { s.budget = v; persist(); budgetResult(); } }),
          Site.slider({ id: "bCash", label: t("finance.budgetCash"), min: 0, max: 500, step: 10, value: s.cash, format: (v) => mln(v), onInput: (v) => { s.cash = v; persist(); budgetResult(); } }),
          el("p", { class: "hint", id: "budgetTerms" })),
        el("div", { id: "budgetResult", class: "budget-result", "aria-live": "polite" }));
      budgetBuilt = true;
    }
    budgetResult();
  }
  function budgetResult() {
    const rate = s.kind === "lease" ? s.leaseRate : s.rate;
    const maxSom = Calc.maxPrice({ monthly: s.budget * MLN, down: s.cash * MLN, tradeIn: trade() * MLN, rate, months: s.months });
    const max = maxSom / MLN;
    $("budgetTerms").textContent = t("finance.budgetTerms", { months: s.months, rate, trade: trade() ? mln(trade()) : "0" });
    const fits = Calc.sortCars(DATA.CARS.filter((c) => c.price <= max), "price-desc");
    $("budgetResult").replaceChildren(
      el("p", { class: "pay-label", text: t("finance.budgetMax") }),
      el("p", { class: "pay-big", text: mln(Math.floor(max)) }),
      el("p", null, fits.length ? t("finance.budgetFits", { count: fits.length }) : t("finance.budgetNone"), " ",
        fits.length ? el("a", { href: "cars.html?priceMax=" + Math.floor(max) + "&sort=price-desc", text: t("finance.budgetSee") }) : null),
      el("ul", { class: "budget-cars" }, fits.slice(0, 4).map((c) => el("li", null, el("a", { href: "finance.html?car=" + c.id,
        onclick: (e) => { e.preventDefault(); s.car = c.id; renderForm(); update(); scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); },
        text: `${Site.carTitle(c)} ${c.trim} — ${mln(c.price)}` })))));
  }

  function render() { budgetBuilt = false; renderForm(); update(); }
  Site.start(render, { title: () => t("page.finance"), onChange: () => { renderForm(); update(); } });
})();
