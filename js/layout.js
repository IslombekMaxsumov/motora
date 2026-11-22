/* Parts shared by every page: header (menu, language, theme), footer, car
   cards, photos, number and money formatting, and page start-up.
   A page calls  Site.start(render)  and `render` runs again when the
   language or the saved data change. Text from data goes in with textContent. */
(function () {
  "use strict";
  const { t } = Core;
  const page = document.body.dataset.page;
  const lang = () => Core.getLang();
  const LOCALE = { en: "en-GB", ru: "ru-RU", uz: "uz-Latn-UZ" };

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    });
    children.flat(Infinity).forEach((c) => c !== null && c !== undefined && c !== false && node.append(c));
    return node;
  }
  function svgEl(tag, attrs, ...children) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([k, v]) => v !== null && v !== undefined && v !== false && node.setAttribute(k, v));
    children.flat().forEach((c) => c && node.append(c));
    return node;
  }
  const $ = (id) => document.getElementById(id);

  /* ---------- icons (Lucide, ISC licence; fixed strings) ---------- */
  const ICONS = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
    calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
    garage: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    fuel: '<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  };
  function icon(name, size = 20) {
    const s = svgEl("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: "icon icon-" + name });
    s.innerHTML = ICONS[name] || "";
    return s;
  }

  /* ---------- formatting ---------- */
  function num(n, digits = 0) {
    try { return new Intl.NumberFormat(LOCALE[lang()], { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n); }
    catch (e) { return String(Math.round(n)); }
  }
  // so'm, rounded to the thousand: 3 923 000 so'm
  const money = (som) => t("money.som", { n: num(Math.round(som / 1000) * 1000) });
  // million so'm from the data: 158 mln so'm (or 1.29 bln)
  const mln = (m) => (m >= 1000 ? t("money.bln", { n: num(m / 1000, 2) }) : t("money.mln", { n: num(m, m < 10 ? 1 : 0) }));
  const km = (n) => t("unit.km", { n: num(n) });
  const brandName = (id) => DATA.BRAND_NAMES[id];
  const carTitle = (c) => c.title;
  // "2024 · 21 000 km · Automatic · Petrol"
  const carLine = (c) => [c.isNew ? t("car.new") : String(c.year), c.isNew ? null : km(c.km), t("gearbox." + c.gearbox), t("fuel." + c.m.fuel)].filter(Boolean).join(" · ");
  // the monthly payment shown on cards: default loan with 30% down for 36 months
  function fromMonthly(c) {
    const price = c.price * Calc.MLN;
    return Calc.loan({ price, down: price * 0.3, rate: DATA.FINANCE.rate, months: 36 }).monthly;
  }

  /* ---------- photos (js/photos.js, added later) ----------
     PHOTOS[model] = [{ sizes: [[w, file]…], alt: {en, ru, uz}, view }]. Until a
     model has photos, a plain plate with its name stands in. */
  function photos(c) { return (window.PHOTOS && PHOTOS[c.model]) || []; }
  function photo(c, opts = {}) {
    const list = photos(c);
    const p = list[opts.index || 0];
    const cls = "photo" + (opts.cls ? " " + opts.cls : "");
    if (!p) {
      return el("figure", { class: cls },
        el("div", { class: "photo-fallback", role: "img", "aria-label": t("photo.none", { name: carTitle(c) }) },
          el("span", { class: "photo-fallback-brand", "aria-hidden": "true", text: brandName(c.m.brand) }),
          el("span", { class: "photo-fallback-name", "aria-hidden": "true", text: c.m.name }),
          opts.view && el("small", { "aria-hidden": "true", text: t("photo.view." + opts.view) })));
    }
    return el("figure", { class: cls }, el("img", {
      src: (p.sizes.find((s) => s[0] >= 900) || p.sizes[p.sizes.length - 1])[1],
      srcset: p.sizes.map(([w, f]) => `${f} ${w}w`).join(", "),
      sizes: opts.sizes || "(min-width: 960px) 33vw, 100vw",
      alt: p.alt[lang()], loading: opts.eager ? "eager" : "lazy", decoding: "async",
      style: p.pos ? `object-position: ${p.pos}` : null,
    }));
  }

  /* ---------- save and compare buttons ---------- */
  function saveButton(c, withText) {
    const on = Store.isSaved(c.id);
    return el("button", {
      type: "button", class: "save-btn" + (withText ? " btn btn-ghost" : " icon-btn"), "aria-pressed": String(on), "data-save": c.id,
      "aria-label": withText ? null : t(on ? "save.remove" : "save.add", { name: carTitle(c) }),
      onclick: () => {
        const now = Store.toggleSaved(c.id);
        Core.toast(t(now ? "save.added" : "save.removed", { name: carTitle(c) }));
        refocus(`[data-save="${c.id}"]`);
      },
    }, icon("heart", 18), withText && el("span", { text: t(on ? "save.saved" : "save.save") }));
  }
  function compareButton(c, withText) {
    const on = Store.isComparing(c.id);
    return el("button", {
      type: "button", class: "compare-btn" + (withText ? " btn btn-ghost" : " icon-btn"), "aria-pressed": String(on), "data-compare": c.id,
      "aria-label": withText ? null : t(on ? "compare.remove" : "compare.add", { name: carTitle(c) }),
      onclick: () => {
        const r = Store.toggleCompare(c.id);
        if (r === "full") Core.toast(t("compare.full", { n: Store.MAX_COMPARE }), { label: t("compare.open"), onClick: () => { location.href = "garage.html#compare"; } });
        else Core.toast(t(r === "added" ? "compare.added" : "compare.removed", { name: carTitle(c) }), r === "added" ? { label: t("compare.open"), onClick: () => { location.href = "garage.html#compare"; } } : null);
        refocus(`[data-compare="${c.id}"]`);
      },
    }, icon("scale", 18), withText && el("span", { text: t(on ? "compare.inList" : "compare.compare") }));
  }
  // after a redraw, put keyboard focus back on the same (new) button
  function refocus(selector) {
    const again = document.querySelector(selector);
    if (again) again.focus();
  }

  /* ---------- car card ---------- */
  function badges(c) {
    return el("ul", { class: "badges" },
      c.isNew && el("li", { class: "badge badge-new", text: t("badge.new") }),
      c.m.fuel === "ev" && el("li", { class: "badge", text: t("fuel.ev") }),
      c.m.fuel === "phev" && el("li", { class: "badge", text: t("fuel.phev") }),
      c.methane && el("li", { class: "badge", text: t("badge.methane") }));
  }
  function card(c, opts = {}) {
    return el("article", { class: "car-card" },
      el("div", { class: "card-photo" }, photo(c, { sizes: opts.sizes || "(min-width: 960px) 30vw, (min-width: 640px) 45vw, 100vw" }), badges(c)),
      el("div", { class: "card-body" },
        el("h3", { class: "card-title" }, el("a", { href: "car.html?id=" + c.id, text: carTitle(c) }), el("span", { class: "card-trim", text: " " + c.trim })),
        el("p", { class: "card-line", text: carLine(c) }),
        el("p", { class: "card-price" }, el("strong", { text: mln(c.price) }),
          el("span", { class: "card-monthly", text: t("card.from", { sum: money(fromMonthly(c)) }) })),
        opts.extra || null,
        el("div", { class: "card-actions" }, saveButton(c), compareButton(c))));
  }

  /* ---------- small form helpers ---------- */
  // a range slider with a visible value; onInput(value) runs while dragging
  function slider({ id, label, min, max, step, value, format, onInput, hint }) {
    const out = el("output", { for: id, class: "slider-value", text: format(value) });
    const input = el("input", { type: "range", id, min, max, step, value, class: "slider",
      "aria-valuetext": format(value),
      oninput: (e) => { const v = Number(e.target.value); out.textContent = format(v); e.target.setAttribute("aria-valuetext", format(v)); onInput(v); } });
    return el("div", { class: "field slider-field" },
      el("div", { class: "slider-head" }, el("label", { for: id, text: label }), out), input,
      hint && el("p", { class: "hint", text: hint }));
  }
  // a group of radio "chips"
  function choice({ name, legend, options, value, onChange }) {
    return el("fieldset", { class: "choice" },
      el("legend", { text: legend }),
      el("div", { class: "chip-row" }, options.map(([v, text]) =>
        el("label", { class: "chip chip-radio" },
          el("input", { type: "radio", name, value: v, checked: String(v) === String(value), onchange: () => onChange(v) }),
          el("span", { text })))));
  }

  /* ---------- "add to calendar": a one-hour .ics event for a test drive ---------- */
  function icsLink(b) {
    const c = DATA.car(b.car);
    const room = DATA.SHOWROOMS.find((s) => s.id === c.showroom);
    const day = b.date.replace(/-/g, "");
    const h = Number(b.time.slice(0, 2));
    const stamp = (hour) => `${day}T${String(hour).padStart(2, "0")}0000`;
    const esc = (s) => String(s).replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
    const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Avtosalon demo//EN", "BEGIN:VEVENT",
      `UID:${b.code}@avtosalon.demo`, `DTSTAMP:${stamp(h)}`, `DTSTART:${stamp(h)}`, `DTEND:${stamp(h + 1)}`,
      `SUMMARY:${esc(t("drive.icsTitle", { car: c.title }))}`,
      `LOCATION:${esc(`${t("city." + room.city)}, ${room.address[lang()]}`)}`,
      `DESCRIPTION:${esc(t("drive.icsText", { code: b.code }))}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    return el("a", { class: "btn btn-ghost btn-small", download: `test-drive-${b.code}.ics`,
      href: "data:text/calendar;charset=utf-8," + encodeURIComponent(text) }, icon("calendar", 16), el("span", { text: t("drive.addCalendar") }));
  }

  /* ---------- header and footer ---------- */
  const NAV = [["home", "index.html", "home"], ["cars", "cars.html", "car"], ["finder", "finder.html", "compass"], ["finance", "finance.html", "calc"], ["garage", "garage.html", "garage"]];
  const ALSO = { car: "cars", tradein: "finance", testdrive: "garage" }; // pages without their own menu item
  function renderHeader() {
    const host = $("site-header");
    if (!host) return;
    const current = ALSO[page] || page;
    const nav = el("nav", { class: "site-nav", "data-i18n-aria": "nav.label" },
      el("ul", null, NAV.map(([key, href, ic]) =>
        el("li", null, el("a", { href, "aria-current": current === key ? "page" : null },
          icon(ic, 20), el("span", { "data-i18n": "page." + key }), key === "garage" ? el("span", { class: "nav-count", id: "garageCount" }) : null)))));
    const langs = el("div", { class: "seg", role: "group", "data-i18n-aria": "lang.label" },
      ["uz", "ru", "en"].map((code) => el("button", { type: "button", "data-lang": code, lang: code, text: code.toUpperCase() })));
    const theme = el("button", { type: "button", id: "themeToggle", class: "icon-btn" }, el("span", { class: "i-sun" }, icon("sun", 20)), el("span", { class: "i-moon" }, icon("moon", 20)));
    host.append(el("div", { class: "container header-bar" },
      el("a", { class: "brand", href: "index.html" }, el("span", { class: "brand-name", "data-i18n": "brand.name" })),
      nav,
      el("div", { class: "header-tools" }, langs, theme)));
    document.body.classList.add("has-tabbar");
  }
  // saved + compared cars, next to "My garage"
  function renderCount() {
    const c = $("garageCount");
    if (!c) return;
    const n = new Set([...Store.saved(), ...Store.comparing()]).size;
    c.textContent = n ? String(n) : "";
    c.setAttribute("aria-label", n ? t("garage.count", { count: n }) : "");
  }
  function renderFooter() {
    const host = $("site-footer");
    if (!host) return;
    host.replaceChildren(el("div", { class: "container footer-inner" },
      el("div", { class: "footer-brand" }, el("p", { class: "brand-name", text: t("brand.name") }), el("p", { text: t("footer.about") })),
      el("div", { class: "footer-col" }, el("h2", { text: t("footer.tools") }),
        el("ul", null, [["finder", "finder.html"], ["finance", "finance.html"], ["tradein", "tradein.html"], ["testdrive", "testdrive.html"]].map(([k, href]) => el("li", null, el("a", { href, text: t("page." + k) }))))),
      el("div", { class: "footer-col" }, el("h2", { text: t("footer.showrooms") }),
        el("ul", null, DATA.SHOWROOMS.map((s) => el("li", null, el("strong", { text: t("city." + s.city) }), " ", s.address[lang()])))),
      el("p", { class: "footer-hours", text: t("footer.hours") }),
      el("div", { class: "footer-bottom" }, el("p", { text: t("footer.demo") }), el("p", { text: t("footer.copy") }))));
  }

  /* ---------- start ---------- */
  let titleFn = null;
  function setTitle() {
    const part = titleFn ? titleFn() : "";
    document.title = part ? `${part} — ${t("brand.name")}` : t("meta.title");
  }
  function start(render, options = {}) {
    titleFn = options.title || null;
    renderHeader();
    Core.onLang(() => { renderFooter(); renderCount(); render(); setTitle(); });
    Store.onChange(() => { renderCount(); if (options.onChange) options.onChange(); else render(); });
    Core.init();
  }

  window.Site = { el, svgEl, $, icon, num, money, mln, km, brandName, carTitle, carLine, fromMonthly, photos, photo, saveButton, compareButton, badges, card, slider, choice, icsLink, setTitle, start, lang };
})();
