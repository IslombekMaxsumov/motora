/* Home: quick search, newest cars, shop by body type, the tools, recently
   viewed cars and the showrooms. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, card, mln, icon } = Site;
  const BUDGETS = [150, 200, 300, 450, 600, 1000];

  function fillQuickSearch() {
    const keep = (sel) => sel.value;
    const body = $("qsBody"), price = $("qsPrice"), cond = $("qsCondition");
    const was = [keep(body), keep(price), keep(cond)];
    body.replaceChildren(el("option", { value: "", text: t("filter.anyBody") }), ...DATA.BODIES.map((b) => el("option", { value: b, text: t("body." + b) })));
    price.replaceChildren(el("option", { value: "", text: t("filter.anyPrice") }), ...BUDGETS.map((b) => el("option", { value: b, text: t("home.upTo", { sum: mln(b) }) })));
    cond.replaceChildren(el("option", { value: "", text: t("filter.anyCondition") }), ...["new", "used"].map((c) => el("option", { value: c, text: t("condition." + c) })));
    [body.value, price.value, cond.value] = was;
    updateCount();
  }
  // the button says how many cars match before you press it
  function updateCount() {
    const f = Calc.fromQuery(new URLSearchParams(new FormData($("quickSearch"))).toString());
    const n = Calc.filterCars(f).length;
    $("qsSubmit").textContent = t("home.show", { count: n });
    $("qsSubmit").disabled = n === 0;
  }

  function render() {
    fillQuickSearch();
    $("heroStats").textContent = t("home.stats", { cars: DATA.CARS.length, models: DATA.MODELS.length, rooms: DATA.SHOWROOMS.length });

    const newest = Calc.sortCars(DATA.CARS.filter((c) => c.isNew), "recommended");
    // one car per model, so the four cards are four different cars
    const seen = new Set();
    $("newList").replaceChildren(...newest.filter((c) => !seen.has(c.model) && seen.add(c.model)).slice(0, 4).map((c) => card(c)));

    $("bodyList").replaceChildren(...DATA.BODIES.map((b) => {
      const list = DATA.CARS.filter((c) => c.m.body === b);
      const from = Math.min(...list.map((c) => c.price));
      return el("li", null, el("a", { class: "tile", href: "cars.html?body=" + b },
        el("strong", { text: t("body." + b) }),
        el("span", { text: t("home.bodyCount", { count: list.length, from: mln(from) }) })));
    }));

    const TOOLS = [["finder", "finder.html", "compass"], ["finance", "finance.html", "calc"], ["tradein", "tradein.html", "swap"], ["testdrive", "testdrive.html", "calendar"]];
    $("toolList").replaceChildren(...TOOLS.map(([k, href, ic]) => el("li", null, el("a", { class: "tool", href },
      icon(ic, 24), el("strong", { text: t("page." + k) }), el("span", { text: t("tool." + k) })))));

    const recent = Store.recent().slice(0, 4).map(DATA.car);
    $("recentSection").hidden = recent.length === 0;
    $("recentList").replaceChildren(...recent.map((c) => card(c)));

    $("roomList").replaceChildren(...DATA.SHOWROOMS.map((s) => {
      const n = DATA.CARS.filter((c) => c.showroom === s.id).length;
      return el("li", { class: "room" },
        el("strong", { text: t("city." + s.city) }),
        el("span", { text: s.address[Site.lang()] }),
        el("span", { class: "hint", text: t("footer.hours") }),
        el("a", { href: "cars.html?city=" + s.city, text: t("home.roomCars", { count: n }) }));
    }));
  }

  $("quickSearch").addEventListener("change", updateCount);
  // drop the empty fields, so the address stays short: cars.html?body=suv
  $("quickSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    new FormData(e.target).forEach((v, k) => v && p.set(k, v));
    location.href = "cars.html" + (p.toString() ? "?" + p : "");
  });
  Site.start(render, { title: () => "" });
})();
