/* My garage: saved cars, side-by-side comparison (the better value in each
   row is marked), test drive bookings (add to calendar, cancel with undo)
   and recently viewed cars. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, mln, money, km, num, icon } = Site;
  let kmWeek = Store.costPrefs().kmWeek;

  const empty = (text, href, label) => el("div", { class: "empty" }, el("p", { text }), el("a", { class: "btn", href, text: label }));

  function renderSaved() {
    const list = Store.saved().map(DATA.car);
    $("savedList").replaceChildren(list.length
      ? el("div", { class: "card-grid" }, list.map((c) => Site.card(c)))
      : empty(t("garage.savedEmpty"), "cars.html", t("garage.toCars")));
  }

  /* ---------- compare ---------- */
  const FORMAT = {
    price: (v) => mln(v), year: String, km: (v) => km(v), hp: (v) => t("spec.hp", { n: v }), cost: (v) => money(v),
    trunk: (v) => (v ? t("spec.litres", { n: num(v) }) : t("spec.cargo")), seats: String, clearance: (v) => t("spec.mm", { n: v }),
    airbags: String, warranty: (v) => t("garage.years", { count: v }),
  };
  function renderCompare() {
    const cars = Store.comparing().map(DATA.car);
    const box = $("compareView");
    if (cars.length < 2) {
      const saved = Store.saved().map(DATA.car).filter((c) => !Store.isComparing(c.id));
      box.replaceChildren(el("div", { class: "empty" },
        el("p", { text: cars.length ? t("garage.compareOne", { name: Site.carTitle(cars[0]) }) : t("garage.compareEmpty") }),
        saved.length ? el("div", { class: "chip-row" }, el("span", { class: "hint", text: t("garage.addSaved") }), saved.map((c) => Site.compareButton(c, true)))
          : el("a", { class: "btn", href: "cars.html", text: t("garage.toCars") })));
      return;
    }
    const tableHost = el("div", { class: "table-wrap", id: "cmpTable" });
    box.replaceChildren(
      Site.slider({ id: "cmpKm", label: t("cost.kmWeek"), min: 50, max: 2000, step: 50, value: kmWeek, format: (v) => km(v),
        onInput: (v) => { kmWeek = v; Store.setCostPrefs({ kmWeek: v }); fillTable(tableHost, cars); } }),
      tableHost,
      el("p", { class: "hint", text: t("garage.compareNote") }),
      el("button", { type: "button", class: "btn btn-ghost", text: t("garage.clearCompare"), onclick: () => {
        const undo = Store.clearCompare();
        Core.toast(t("garage.cleared"), { label: t("toast.undo"), onClick: undo });
      } }));
    fillTable(tableHost, cars);
  }
  // only the table is redrawn while the slider moves, so dragging is not interrupted
  function fillTable(host, cars) {
    const rows = Calc.compare(cars, kmWeek);
    const head = el("tr", null, el("td", null), cars.map((c) => el("th", { scope: "col" },
      el("a", { href: "car.html?id=" + c.id, text: `${Site.carTitle(c)} ${c.trim}` }),
      el("span", { class: "hint", text: " " + (c.isNew ? t("car.new") : c.year) }),
      el("button", { type: "button", class: "icon-btn", "aria-label": t("compare.remove", { name: Site.carTitle(c) }), onclick: () => { Store.toggleCompare(c.id); } }, icon("x", 16)))));
    const body = rows.map((r) => el("tr", null,
      el("th", { scope: "row", text: r.key === "cost" ? t("garage.costRow", { km: km(kmWeek) }) : t("compareRow." + r.key) }),
      r.values.map((v, i) => el("td", { class: r.best[i] ? "is-best" : null },
        FORMAT[r.key](v), r.best[i] ? el("span", { class: "best-mark" }, icon("check", 14), el("span", { class: "visually-hidden", text: t("garage.better") })) : null))));
    // how many rows each car wins
    const wins = cars.map((_, i) => rows.filter((r) => r.best[i]).length);
    host.replaceChildren(el("table", { class: "table compare-table" },
      el("caption", { class: "visually-hidden", text: t("garage.compare") }), el("thead", null, head), el("tbody", null, body),
      el("tfoot", null, el("tr", null, el("th", { scope: "row", text: t("garage.wins") }), wins.map((w) => el("td", { text: t("garage.winsValue", { count: w, total: rows.length }) }))))));
  }

  /* ---------- test drives ---------- */
  function renderDrives() {
    const list = Store.bookings().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const today = Calc.isoDate(new Date());
    if (!list.length) { $("driveList").replaceChildren(empty(t("garage.drivesEmpty"), "testdrive.html", t("garage.toDrive"))); return; }
    $("driveList").replaceChildren(el("ul", { class: "booking-list" }, list.map((b) => {
      const c = DATA.car(b.car);
      const room = DATA.SHOWROOMS.find((s) => s.id === c.showroom);
      const past = b.date < today;
      const [y, m, d] = b.date.split("-").map(Number);
      return el("li", { class: "booking" + (past ? " is-past" : "") },
        el("p", { class: "booking-when" }, el("strong", { text: Core.formatDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long" }) }), " ", b.time),
        el("p", null, el("a", { href: "car.html?id=" + c.id, text: `${Site.carTitle(c)} ${c.trim}` })),
        el("p", { class: "hint", text: `${t("city." + room.city)}, ${room.address[Site.lang()]}` }),
        el("p", { class: "hint", text: t("drive.codeLine", { code: b.code, name: b.name, phone: b.phone }) }),
        past ? el("p", { class: "badge", text: t("garage.past") }) : el("div", { class: "booking-actions" },
          Site.icsLink(b),
          el("button", { type: "button", class: "btn btn-danger-ghost btn-small", text: t("garage.cancel"), onclick: () => {
            const undo = Store.cancelBooking(b.code);
            Core.toast(t("garage.cancelled"), { label: t("toast.undo"), onClick: undo });
          } })));
    })));
  }

  function renderRecent() {
    const list = Store.recent().map(DATA.car);
    $("recentList").replaceChildren(list.length ? el("div", { class: "card-grid" }, list.map((c) => Site.card(c))) : el("p", { class: "hint", text: t("garage.recentEmpty") }));
  }

  function render() { renderSaved(); renderCompare(); renderDrives(); renderRecent(); }
  Site.start(render, { title: () => t("page.garage") });
})();
