/* Car finder: a few questions about how you drive; every car in stock is
   scored (Calc.find) and the list updates while you answer. Shows the best
   car of each model first, with the reasons for and against it. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, mln, money, km, icon } = Site;
  const DEFAULT = { budget: 300, people: 2, roads: "mixed", kmWeek: 300, fuel: "any", condition: "any", auto: false, priorities: [] };
  let a = { ...DEFAULT, ...(Store.finderAnswers() || {}) };
  let showAll = false;
  let prevScores = new Map();
  const PRIORITIES = ["running", "space", "comfort", "power", "warranty", "price"];

  function set(patch) { a = { ...a, ...patch }; Store.setFinderAnswers(a); renderResults(); }

  function renderForm() {
    const c = (name, values, label) => Site.choice({ name, legend: t("finder.q." + name), value: a[name],
      options: values.map((v) => [v, t(label + v)]), onChange: (v) => set({ [name]: isNaN(v) ? v : Number(v) }) });
    const prio = el("fieldset", { class: "choice" },
      el("legend", { text: t("finder.q.priorities") }), el("p", { class: "hint", id: "prioHint", text: t("finder.prioHint") }),
      el("div", { class: "chip-row" }, PRIORITIES.map((p) => el("label", { class: "chip chip-radio" },
        el("input", { type: "checkbox", value: p, checked: a.priorities.includes(p), "aria-describedby": "prioHint",
          onchange: (e) => {
            const next = e.target.checked ? [...a.priorities, p] : a.priorities.filter((x) => x !== p);
            set({ priorities: next });
            lockPriorities();
          } }),
        el("span", { text: t("finder.prio." + p) })))));
    $("finderForm").replaceChildren(
      Site.slider({ id: "budget", label: t("finder.q.budget"), min: 80, max: 1500, step: 10, value: a.budget, format: (v) => t("finder.upTo", { sum: mln(v) }), formatEnd: mln, onInput: (v) => set({ budget: v }) }),
      c("people", [2, 5, 7, 8], "finder.people."),
      c("roads", ["city", "mixed", "highway", "rough"], "finder.roads."),
      Site.slider({ id: "kmWeek", label: t("finder.q.kmWeek"), min: 50, max: 2000, step: 50, value: a.kmWeek, format: (v) => km(v), onInput: (v) => set({ kmWeek: v }) }),
      c("fuel", ["any", "petrol", "electric", "gas"], "finder.fuel."),
      c("condition", ["any", "new", "used"], "finder.condition."),
      el("label", { class: "switch" }, el("input", { type: "checkbox", checked: a.auto, onchange: (e) => set({ auto: e.target.checked }) }), el("span", { text: t("finder.q.auto") })),
      prio,
      el("button", { type: "button", class: "btn btn-ghost", onclick: () => { a = { ...DEFAULT }; Store.setFinderAnswers(a); showAll = false; render(); }, text: t("finder.reset") }));
    lockPriorities();
  }
  // at most two priorities: the other boxes are switched off until one is removed
  function lockPriorities() {
    const full = a.priorities.length >= 2;
    document.querySelectorAll('#finderForm input[type="checkbox"][value]').forEach((b) => {
      if (!PRIORITIES.includes(b.value)) return;
      b.disabled = full && !b.checked;
      b.closest(".chip").classList.toggle("is-disabled", b.disabled);
    });
  }

  function match(r, i) {
    const c = r.car;
    const line = (list, cls, ic) => list.map((x) => el("li", { class: cls }, icon(ic, 16), el("span", { text: t("why." + x.key, fmtVars(x.vars)) })));
    // the meter starts at this car's previous score, so it can grow or shrink to the new one
    const before = prevScores.get(c.id) ?? r.score;
    const level = r.score >= 75 ? "high" : r.score >= 60 ? "mid" : "low";
    return el("li", { class: "match", "data-car": c.id },
      el("div", { class: "match-score", "aria-label": t("finder.score", { n: r.score }) },
        el("strong", { class: "num", "aria-hidden": "true", text: r.score + "%" }),
        el("span", { class: "meter meter-" + level, "aria-hidden": "true" }, el("span", { style: `width:${before}%`, "data-to": r.score }))),
      el("div", { class: "match-photo" }, Site.photo(c, { sizes: "160px" })),
      el("div", { class: "match-body" },
        el("h3", null, el("span", { class: "match-rank", text: i + 1 + ". " }), el("a", { href: "car.html?id=" + c.id, text: Site.carTitle(c) }), el("span", { class: "card-trim", text: " " + c.trim })),
        el("p", { class: "card-line", text: Site.carLine(c) + " · " + mln(c.price) }),
        el("ul", { class: "why" }, line(r.reasons, "why-good", "check"), line(r.buts, "why-bad", "x")),
        Site.ownLine(c, "own own-compact")));
  }
  const fmtVars = (v) => ({ ...v, left: v.left !== undefined ? mln(v.left) : "", over: v.over !== undefined ? mln(v.over) : "",
    cost: v.cost !== undefined ? money(v.cost) : "", km: v.km !== undefined ? km(v.km) : "" });

  function renderResults() {
    const r = Calc.find(a);
    // best car of each model first, then (if asked) all the others
    const seen = new Set();
    const best = r.ranked.filter((x) => !seen.has(x.car.model) && seen.add(x.car.model));
    const list = showAll ? r.ranked : best.slice(0, 5);
    const left = Object.entries(r.excluded).filter(([, n]) => n).map(([k, n]) => t("finder.out." + k, { count: n }));
    $("finderSummary").textContent = r.ranked.length
      ? t("finder.summary", { count: r.ranked.length, models: best.length }) + (left.length ? " " + t("finder.leftOut", { list: left.join(", ") }) : "")
      : t("finder.none") + (left.length ? " " + t("finder.leftOut", { list: left.join(", ") }) : "");
    // FLIP: remember where each result was, redraw, then slide them from there
    const list0 = $("finderList");
    const was = new Map([...list0.children].map((li) => [li.dataset.car, li.getBoundingClientRect().top]));
    list0.replaceChildren(...list.map(match));
    prevScores = new Map(list.map((x) => [x.car.id, x.score]));
    requestAnimationFrame(() => {
      list0.querySelectorAll(".meter span[data-to]").forEach((bar) => { bar.style.width = bar.dataset.to + "%"; });
      if (Site.calm()) return;
      [...list0.children].forEach((li) => {
        const top = was.get(li.dataset.car);
        if (top === undefined) return;
        const dy = top - li.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) return;
        li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 280, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
      });
    });
    const more = $("finderMore");
    more.hidden = r.ranked.length <= 5 && best.length === r.ranked.length;
    more.textContent = showAll ? t("finder.showBest") : t("finder.showAll", { count: r.ranked.length });
  }
  $("finderMore").addEventListener("click", () => { showAll = !showAll; renderResults(); });

  function render() { renderForm(); renderResults(); }
  Site.start(render, { title: () => t("page.finder"), onChange: () => {} });
})();
