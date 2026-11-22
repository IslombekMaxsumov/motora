/* Test drive booking (testdrive.html?car=c01): pick a car, a day in the
   next two weeks (closed on Sundays) and a free hour (some are already
   taken), then name, phone and licence. Checks every field, saves the
   booking and shows a confirmation with a code and an "add to calendar" file. */
(function () {
  "use strict";
  const { t } = Core;
  const { el, $, mln, icon } = Site;
  const fromUrl = DATA.car(new URLSearchParams(location.search).get("car"));
  const s = { car: (fromUrl || Calc.sortCars(DATA.CARS, "recommended")[0]).id, date: "", time: "", name: "", phone: "", licence: false };
  let done = null; // the booking just made

  const days = () => Calc.bookingDays(new Date(), 14);
  function firstOpenDay() {
    const d = days().find((x) => !x.closed && Calc.slots(s.car, x.iso, new Date(), Store.bookings()).some((sl) => sl.state === "free"));
    return d ? d.iso : "";
  }

  function render() {
    if (done) return renderDone();
    if (!s.date) s.date = firstOpenDay();
    const c = DATA.car(s.car);
    const room = DATA.SHOWROOMS.find((r) => r.id === c.showroom);
    const form = el("form", { id: "driveForm", class: "drive-form", novalidate: true, onsubmit: submit },
      el("div", { id: "errorSummary", class: "error-summary", tabindex: "-1", hidden: true }),
      el("div", { class: "field" }, el("label", { for: "dCar", text: t("drive.car") }),
        el("select", { id: "dCar", class: "select", onchange: (e) => { s.car = e.target.value; s.time = ""; s.date = ""; render(); $("dCar").focus(); } },
          Calc.sortCars(DATA.CARS, "price-asc").map((x) => el("option", { value: x.id, selected: x.id === s.car, text: `${Site.carTitle(x)} ${x.trim}, ${x.isNew ? t("car.new") : x.year} — ${mln(x.price)}` })))),
      el("p", { class: "drive-room" }, icon("pin", 18), el("span", { text: t("drive.where", { city: t("city." + room.city), address: room.address[Site.lang()] }) })),
      el("fieldset", { class: "choice", id: "dayGroup" }, el("legend", { text: t("drive.day") }),
        el("div", { class: "day-row" }, days().map((d) => {
          const free = !d.closed && Calc.slots(s.car, d.iso, new Date(), Store.bookings()).some((sl) => sl.state === "free");
          return el("label", { class: "day" + (free ? "" : " is-disabled") },
            el("input", { type: "radio", name: "day", value: d.iso, checked: s.date === d.iso, disabled: !free,
              onchange: () => { s.date = d.iso; s.time = ""; renderSlots(); } }),
            el("span", { class: "day-week", text: Core.formatDate(d.date, { weekday: "short" }) }),
            el("span", { class: "day-num", text: String(d.date.getDate()) }),
            el("span", { class: "day-month", text: Core.formatDate(d.date, { month: "short" }) }),
            !free && el("span", { class: "visually-hidden", text: d.closed ? t("drive.closed") : t("drive.full") }));
        }))),
      el("fieldset", { class: "choice", id: "timeGroup" }, el("legend", { text: t("drive.time") }), el("div", { id: "slots", class: "slot-row" }),
        el("p", { class: "hint", text: t("drive.slotHint") }), el("p", { id: "timeErr", class: "field-error", "aria-live": "polite" })),
      el("div", { class: "field" }, el("label", { for: "dName", text: t("drive.name") }),
        el("input", { id: "dName", class: "input", type: "text", autocomplete: "name", maxlength: 60, value: s.name, "aria-describedby": "dNameErr", oninput: (e) => { s.name = e.target.value; } }),
        el("p", { id: "dNameErr", class: "field-error", "aria-live": "polite" })),
      el("div", { class: "field" }, el("label", { for: "dPhone", text: t("drive.phone") }),
        el("input", { id: "dPhone", class: "input", type: "tel", autocomplete: "tel", inputmode: "tel", maxlength: 20, placeholder: "+998 90 123 45 67", value: s.phone, "aria-describedby": "dPhoneHint dPhoneErr",
          oninput: (e) => { s.phone = e.target.value; },
          onblur: (e) => { const ok = Calc.phone(e.target.value); if (ok) { e.target.value = ok; s.phone = ok; } } }),
        el("p", { id: "dPhoneHint", class: "hint", text: t("drive.phoneHint") }),
        el("p", { id: "dPhoneErr", class: "field-error", "aria-live": "polite" })),
      el("label", { class: "switch" },
        el("input", { id: "dLicence", type: "checkbox", checked: s.licence, "aria-describedby": "dLicenceErr", onchange: (e) => { s.licence = e.target.checked; } }),
        el("span", { text: t("drive.licence") })),
      el("p", { id: "dLicenceErr", class: "field-error", "aria-live": "polite" }),
      el("button", { type: "submit", class: "btn", text: t("drive.book") }),
      el("p", { class: "hint", text: t("drive.privacy") }));
    $("driveView").replaceChildren(form);
    renderSlots();
  }

  function renderSlots() {
    const list = s.date ? Calc.slots(s.car, s.date, new Date(), Store.bookings()) : [];
    $("slots").replaceChildren(...(list.length ? list.map((sl) => el("label", { class: "slot slot-" + sl.state },
      el("input", { type: "radio", name: "time", value: sl.time, checked: s.time === sl.time, disabled: sl.state !== "free",
        onchange: () => { s.time = sl.time; $("timeErr").textContent = ""; } }),
      el("span", { text: sl.time }),
      sl.state !== "free" && el("small", { text: t("drive.slot." + sl.state) }))) : [el("p", { class: "hint", text: t("drive.pickDay") })]));
  }

  // check everything, show each error by its field and a summary at the top
  function submit(e) {
    e.preventDefault();
    const errors = [];
    const mark = (id, errId, msg) => {
      const input = $(id);
      if (input) input.setAttribute("aria-invalid", String(Boolean(msg)));
      $(errId).textContent = msg || "";
      if (msg) errors.push([id, msg]);
    };
    const name = Calc.name(s.name), phone = Calc.phone(s.phone);
    const slot = s.date && s.time && Calc.slots(s.car, s.date, new Date(), Store.bookings()).find((x) => x.time === s.time);
    $("timeErr").textContent = "";
    if (!slot || slot.state !== "free") { $("timeErr").textContent = t("drive.timeError"); errors.push(["timeGroup", t("drive.timeError")]); }
    mark("dName", "dNameErr", name ? "" : t("drive.nameError"));
    mark("dPhone", "dPhoneErr", phone ? "" : t("drive.phoneError"));
    mark("dLicence", "dLicenceErr", s.licence ? "" : t("drive.licenceError"));
    const summary = $("errorSummary");
    if (errors.length) {
      summary.hidden = false;
      summary.replaceChildren(el("h2", { text: t("drive.errors", { count: errors.length }) }),
        el("ul", null, errors.map(([, msg]) => el("li", { text: msg }))));
      summary.focus();
      return;
    }
    done = Store.addBooking({ car: s.car, date: s.date, time: s.time, name, phone });
    renderDone();
  }

  function renderDone() {
    const c = DATA.car(done.car);
    const room = DATA.SHOWROOMS.find((r) => r.id === c.showroom);
    const [y, m, d] = done.date.split("-").map(Number);
    $("driveView").replaceChildren(el("section", { class: "drive-done", "aria-labelledby": "doneTitle" },
      el("h2", { id: "doneTitle", tabindex: "-1", text: t("drive.doneTitle") }),
      el("p", { class: "pay-big", text: done.code }),
      el("p", { text: t("drive.doneText", { car: `${Site.carTitle(c)} ${c.trim}`, date: Core.formatDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long" }), time: done.time }) }),
      el("p", { class: "hint", text: `${t("city." + room.city)}, ${room.address[Site.lang()]}` }),
      el("p", { class: "hint", text: t("drive.doneBring") }),
      el("div", { class: "booking-actions" }, Site.icsLink(done),
        el("a", { class: "btn btn-ghost btn-small", href: "garage.html#drives", text: t("drive.toGarage") }),
        el("button", { type: "button", class: "btn btn-ghost btn-small", text: t("drive.another"), onclick: () => { done = null; s.time = ""; render(); } }))));
    $("doneTitle").focus();
  }

  Site.start(render, { title: () => t("page.testdrive"), onChange: () => { if (!done) render(); } });
})();
