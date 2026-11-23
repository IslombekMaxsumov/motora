/* Trade-in: estimate what your current car is worth (Calc.tradeIn) from the
   model, year, mileage and condition, explain each factor, and keep the
   estimate for the finance page, where it lowers the amount to borrow. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, mln, km, num } = Site;
  const last = Store.tradeIn();
  const f = last ? { ...last.input } : { model: "cobalt", otherName: "", otherPrice: "", year: 2020, km: 80000, condition: "good", accident: "no", owners: 1 };
  let result = last ? last.value : null;

  function fieldError(id) { return el("p", { id: id + "Err", class: "field-error", "aria-live": "polite" }); }
  function renderForm() {
    const years = Array.from({ length: DATA.THIS_YEAR - 1995 + 1 }, (_, i) => DATA.THIS_YEAR - i);
    const other = f.model === "other";
    const stage = (n, title, ...fields) => el("fieldset", { class: "stage" },
      el("legend", { class: "stage-title" }, el("span", { class: "stage-num", text: String(n) }), el("span", { text: title })),
      el("div", { class: "stage-fields" }, fields));
    $("tradeForm").replaceChildren(
      stage(1, t("trade.stage1"),
      el("div", { class: "field" }, el("label", { for: "tModel", text: t("trade.model") }),
        el("select", { id: "tModel", class: "select", onchange: (e) => { f.model = e.target.value; renderForm(); $("tModel").focus(); } },
          DATA.TRADE_MODELS.map((m) => el("option", { value: m.id, text: m.name, selected: f.model === m.id })),
          el("option", { value: "other", text: t("trade.other"), selected: other }))),
      other && el("div", { class: "field" }, el("label", { for: "tOtherName", text: t("trade.otherName") }),
        el("input", { id: "tOtherName", class: "input", type: "text", maxlength: 60, autocomplete: "off", value: f.otherName, "aria-describedby": "tOtherNameErr", oninput: (e) => { f.otherName = e.target.value; } }),
        fieldError("tOtherName")),
      other && el("div", { class: "field" }, el("label", { for: "tOtherPrice", text: t("trade.otherPrice") }),
        el("input", { id: "tOtherPrice", class: "input", type: "number", inputmode: "decimal", min: 20, max: 5000, value: f.otherPrice, "aria-describedby": "tOtherPriceHint tOtherPriceErr", oninput: (e) => { f.otherPrice = e.target.value; } }),
        el("p", { id: "tOtherPriceHint", class: "hint", text: t("trade.otherPriceHint") }), fieldError("tOtherPrice")),
      el("div", { class: "field" }, el("label", { for: "tYear", text: t("trade.year") }),
        el("select", { id: "tYear", class: "select", onchange: (e) => { f.year = Number(e.target.value); } }, years.map((y) => el("option", { value: y, text: String(y), selected: f.year === y })))),
      el("div", { class: "field" }, el("label", { for: "tKm", text: t("trade.km") }),
        el("input", { id: "tKm", class: "input", type: "number", inputmode: "numeric", min: 0, max: 1000000, step: 1000, value: f.km, "aria-describedby": "tKmErr", oninput: (e) => { f.km = e.target.value; } }),
        fieldError("tKm"))),
      stage(2, t("trade.stage2"),
      Site.choice({ name: "condition", legend: t("trade.condition"), value: f.condition,
        options: ["excellent", "good", "fair", "poor"].map((c) => [c, t("trade.cond." + c)]), onChange: (v) => { f.condition = v; renderHint(); } }),
      el("p", { class: "hint", id: "condHint" }),
      Site.choice({ name: "accident", legend: t("trade.accident"), value: f.accident, options: [["no", t("trade.no")], ["yes", t("trade.yes")]], onChange: (v) => { f.accident = v; } }),
      el("div", { class: "field" }, el("label", { for: "tOwners", text: t("trade.owners") }),
        el("select", { id: "tOwners", class: "select", onchange: (e) => { f.owners = Number(e.target.value); } },
          [1, 2, 3].map((n) => el("option", { value: n, text: n === 3 ? t("trade.owners3") : String(n), selected: f.owners === n }))))),
      el("button", { type: "submit", class: "btn", text: t("trade.estimate") }));
    renderHint();
  }
  function renderHint() { $("condHint").textContent = t("trade.condHint." + f.condition); }

  function base() {
    if (f.model === "other") return Number(f.otherPrice);
    return DATA.TRADE_MODELS.find((m) => m.id === f.model).price;
  }
  const carName = () => (f.model === "other" ? f.otherName.trim() : DATA.TRADE_MODELS.find((m) => m.id === f.model).name);

  // check every field; show the errors next to them and focus the first one
  function validate() {
    const errors = {};
    const kmNum = f.km === "" ? NaN : Number(f.km);
    const c = Calc.checkTradeIn({ year: f.year, km: kmNum });
    if (c.km) errors.tKm = t("trade.kmError");
    if (f.model === "other") {
      if (f.otherName.trim().length < 2) errors.tOtherName = t("trade.nameError");
      const p = Number(f.otherPrice);
      if (!(p >= 20 && p <= 5000)) errors.tOtherPrice = t("trade.priceError");
    }
    ["tKm", "tOtherName", "tOtherPrice"].forEach((id) => {
      const input = $(id);
      if (!input) return;
      input.setAttribute("aria-invalid", String(Boolean(errors[id])));
      $(id + "Err").textContent = errors[id] || "";
    });
    const first = Object.keys(errors)[0];
    if (first) $(first).focus();
    return !first;
  }

  function renderResult() {
    const box = $("tradeResult");
    if (!result) {
      box.replaceChildren(stage3(), el("h2", { id: "tradeResultTitle", class: "visually-hidden", text: t("trade.resultTitle") }), el("p", { class: "hint", text: t("trade.empty") }));
      return;
    }
    const kept = Store.tradeIn();
    const isKept = kept && kept.value.mid === result.mid && kept.name === carName();
    const factor = (x) => {
      const sign = x.pct > 0 ? "+" : "";
      const text = x.key === "age" ? t("trade.f.age", { count: x.age }) : x.key === "km" ? t("trade.f.km", { expected: km(result.expectedKm) }) : t("trade.f." + x.key, { cond: t("trade.cond." + f.condition) });
      // a bar from the middle: right for more, left for less (50% = the full width of one side)
      const w = Math.min(50, Math.abs(x.pct));
      return el("li", { class: "factor " + (x.pct > 0 ? "is-up" : x.pct < 0 ? "is-down" : "is-zero") },
        el("span", { class: "factor-text", text }),
        el("span", { class: "factor-bar", "aria-hidden": "true" }, el("span", { style: x.pct < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%` })),
        el("strong", { class: "num", text: `${sign}${x.pct}%` }));
    };
    // newer cars you could move to, and what you would pay on top
    const options = DATA.CARS.filter((c) => c.price >= result.mid && c.year > f.year).sort((a, b) => a.price - b.price).slice(0, 4);
    box.replaceChildren(
      stage3(),
      el("h2", { id: "tradeResultTitle", class: "trade-car", text: t("trade.resultFor", { car: carName(), year: f.year }) }),
      el("p", { class: "eyebrow", text: t("trade.range") }),
      el("p", { class: "pay-big", text: `${mln(result.low)} – ${mln(result.high)}` }),
      el("p", { text: t("trade.likely", { sum: mln(result.mid) }) }),
      el("h3", { text: t("trade.how") }),
      el("ul", { class: "factor-list" }, el("li", { class: "factor is-base" }, el("span", { class: "factor-text", text: t("trade.f.base") }), el("span"), el("strong", { class: "num", text: mln(base()) })), result.factors.map(factor),
        el("li", { class: "factor is-result" }, el("span", { class: "factor-text", text: t("trade.f.result") }), el("span"), el("strong", { class: "num", text: mln(result.mid) }))),
      el("div", { class: "trade-actions" },
        isKept
          ? el("p", { class: "hint" }, t("trade.kept"), " ", el("a", { href: "finance.html", text: t("trade.toFinance") }))
          : el("button", { type: "button", class: "btn", text: t("trade.use"), onclick: keep }),
        kept && el("button", { type: "button", class: "btn btn-ghost", text: t("trade.forget"), onclick: forget })),
      el("h3", { text: t("trade.options") }),
      el("ul", { class: "budget-cars" }, options.map((c) => el("li", null,
        el("a", { href: "car.html?id=" + c.id, text: `${Site.carTitle(c)} ${c.trim}` }), " ",
        el("span", { class: "hint", text: t("trade.difference", { sum: mln(c.price - result.mid) }) })))),
      el("p", { class: "hint", text: t("trade.note") }));
  }
  function stage3() {
    return el("p", { class: "stage-title" }, el("span", { class: "stage-num", text: "3" }), el("span", { text: t("trade.stage3") }));
  }
  function keep() {
    Store.setTradeIn({ name: carName(), input: { ...f }, value: result, date: new Date().toISOString() });
    Core.toast(t("trade.keptToast"), { label: t("trade.toFinance"), onClick: () => { location.href = "finance.html"; } });
  }
  function forget() {
    const before = Store.tradeIn();
    Store.setTradeIn(null);
    Core.toast(t("trade.forgotten"), { label: t("toast.undo"), onClick: () => Store.setTradeIn(before) });
  }

  $("tradeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    result = Calc.tradeIn({ base: base(), year: f.year, km: Number(f.km), condition: f.condition, accident: f.accident === "yes", owners: f.owners });
    renderResult();
    $("tradeResultTitle").setAttribute("tabindex", "-1");
    $("tradeResultTitle").focus();
  });

  function render() { renderForm(); renderResult(); }
  Site.start(render, { title: () => t("page.tradein"), onChange: renderResult });
})();
