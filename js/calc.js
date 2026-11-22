/* All the maths of the showroom, as plain functions (no page code), so it
   can be tested in Node:  node --test tests/
   Money is in so'm unless a name says "mln" (million so'm, like the data). */
(function () {
  "use strict";
  const D = typeof window !== "undefined" && window.DATA ? window.DATA : require("./data.js");
  const MLN = 1e6;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- finance ---------- */
  // monthly payment of an annuity loan (the same amount every month)
  function payment(principal, ratePct, months) {
    if (principal <= 0 || months <= 0) return 0;
    const r = ratePct / 100 / 12;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  }
  // month-by-month balance, for the chart and the table
  function schedule(principal, ratePct, months, monthly, endBalance = 0) {
    const r = ratePct / 100 / 12;
    const rows = [];
    let balance = principal;
    for (let m = 1; m <= months; m++) {
      const interest = balance * r;
      const toPrincipal = monthly - interest;
      balance = Math.max(0, balance - toPrincipal);
      if (m === months) balance = endBalance; // rounding: the last month lands exactly
      rows.push({ month: m, interest, principal: toPrincipal, balance });
    }
    return rows;
  }
  // a bank loan: down payment and trade-in come off the price first
  function loan({ price, down = 0, tradeIn = 0, rate, months }) {
    const principal = Math.max(0, price - down - tradeIn);
    const monthly = payment(principal, rate, months);
    const paid = monthly * months;
    return { kind: "loan", principal, monthly, paid, interest: paid - principal, total: down + tradeIn + paid,
      rows: schedule(principal, rate, months, monthly) };
  }
  // a lease: lower monthly payments, and at the end you pay the residual to keep the car
  function lease({ price, down = 0, tradeIn = 0, rate, months, residualPct }) {
    const financed = Math.max(0, price - down - tradeIn);
    const buyout = Math.min(financed, price * residualPct / 100);
    const r = rate / 100 / 12;
    const monthly = r === 0 ? (financed - buyout) / months
      : ((financed - buyout / Math.pow(1 + r, months)) * r) / (1 - Math.pow(1 + r, -months));
    const paid = monthly * months;
    return { kind: "lease", principal: financed, monthly, buyout, paid, interest: paid + buyout - financed,
      total: down + tradeIn + paid + buyout, rows: schedule(financed, rate, months, monthly, buyout) };
  }
  // the other way round: what price can I afford for this much a month?
  function maxPrice({ monthly, down = 0, tradeIn = 0, rate, months }) {
    const r = rate / 100 / 12;
    const principal = r === 0 ? monthly * months : (monthly * (1 - Math.pow(1 + r, -months))) / r;
    return Math.max(0, principal) + down + tradeIn;
  }

  /* ---------- running costs ---------- */
  // opts: kmWeek, methane (run on gas), homeCharging, kasko (add full insurance), prices
  function runningCost(car, opts = {}) {
    const m = car.m || car;
    const P = { ...D.PRICES, ...(opts.prices || {}) };
    const kmWeek = Math.max(0, Number(opts.kmWeek) || 0);
    const kmMonth = (kmWeek * 52) / 12;
    const home = opts.homeCharging !== false;
    let energy = 0, litres = 0, m3 = 0, kwh = 0, eShare = 0;
    if (m.fuel === "ev") {
      kwh = (kmMonth * m.kwh100) / 100;
      energy = kwh * (home ? P.homeKwh : P.publicKwh);
      eShare = 1;
    } else if (m.fuel === "phev") {
      // charged at home every night: the first eRange km of each day are electric
      const perDay = kmWeek / 7;
      eShare = home ? (perDay === 0 ? 1 : Math.min(1, m.eRange / perDay)) : 0;
      kwh = (kmMonth * eShare * m.kwh100) / 100;
      litres = (kmMonth * (1 - eShare) * m.l100) / 100;
      energy = kwh * P.homeKwh + litres * P.petrol;
    } else if (opts.methane && m.gas) {
      m3 = (kmMonth * m.l100) / 100; // about 1 m³ of methane replaces 1 litre of petrol
      energy = m3 * P.methane;
    } else {
      litres = (kmMonth * m.l100) / 100;
      energy = litres * P.petrol;
    }
    const value = (car.price || m.price) * MLN;
    const insurance = (P.osago + (opts.kasko ? (value * P.kasko) / 100 : 0)) / 12;
    const service = kmMonth * P.service[m.service];
    const total = energy + insurance + service;
    return { kmMonth, energy, litres, m3, kwh, eShare, insurance, service, total, year: total * 12, perKm: kmMonth ? total / kmMonth : 0 };
  }

  /* ---------- trade-in ----------
     A rough market estimate from the new price, age, mileage and condition. */
  const CONDITION = { excellent: 1.05, good: 1, fair: 0.9, poor: 0.75 };
  function tradeIn({ base, year, km, condition = "good", accident = false, owners = 1 }) {
    const age = Math.max(0, D.THIS_YEAR - year);
    const ageF = Math.max(0.2, 0.92 * Math.pow(0.93, age));
    const expected = Math.max(1, age) * 15000; // about 15,000 km a year is normal
    const kmF = clamp(1 - 0.035 * ((km - expected) / 10000), 0.7, 1.08);
    const condF = CONDITION[condition] || 1;
    const accF = accident ? 0.88 : 1;
    const ownF = owners >= 3 ? 0.95 : 1;
    const mid = base * ageF * kmF * condF * accF * ownF;
    const pct = (f) => Math.round((f - 1) * 100);
    return {
      low: Math.round(mid * 0.94), mid: Math.round(mid), high: Math.round(mid * 1.06),
      expectedKm: expected,
      factors: [
        { key: "age", pct: pct(ageF), age },
        { key: "km", pct: pct(kmF) },
        { key: "condition", pct: pct(condF) },
        accident && { key: "accident", pct: pct(accF) },
        owners >= 3 && { key: "owners", pct: pct(ownF) },
      ].filter(Boolean),
    };
  }
  function checkTradeIn({ year, km }) {
    const errors = {};
    if (!Number.isInteger(year) || year < 1995 || year > D.THIS_YEAR) errors.year = "year";
    if (!Number.isFinite(km) || km < 0 || km > 1000000) errors.km = "km";
    return errors;
  }

  /* ---------- car finder ----------
     answers: budget (mln), people, roads (city|mixed|highway|rough), kmWeek,
     fuel (any|petrol|electric|gas), condition (any|new|used), auto (bool),
     priorities: up to two of running, space, comfort, power, warranty, price.
     Every car gets a score from 0 to 100 and the reasons behind it. */
  function find(answers, cars = D.CARS) {
    const a = { budget: 300, people: 2, roads: "mixed", kmWeek: 300, fuel: "any", condition: "any", auto: false, priorities: [], ...answers };
    const excluded = { budget: 0, seats: 0, gearbox: 0, condition: 0 };
    const pool = cars.filter((c) => {
      if (c.price > a.budget * 1.1) return excluded.budget++, false;
      if (c.m.seats < a.people) return excluded.seats++, false;
      if (a.auto && c.gearbox !== "auto") return excluded.gearbox++, false;
      if (a.condition === "new" && !c.isNew) return excluded.condition++, false;
      if (a.condition === "used" && c.isNew) return excluded.condition++, false;
      return true;
    });
    const costOf = (c) => runningCost(c, { kmWeek: a.kmWeek, methane: c.methane || (a.fuel === "gas" && c.m.gas) }).total;
    const costs = new Map(pool.map((c) => [c.id, costOf(c)]));
    const cheapest = Math.min(...costs.values());
    const sorted = [...costs.values()].sort((x, y) => x - y);
    const median = sorted[Math.floor(sorted.length / 2)];
    // on rough roads a low car is a real problem, so the road factor counts for more there
    const W = { price: 2, running: 1.5, roads: a.roads === "rough" ? 3 : 1.2, fuel: a.fuel === "any" ? 0 : 1.2, comfort: 0.7, space: 0.7, power: 0.4, warranty: 0.5 };
    a.priorities.forEach((p) => { if (W[p] !== undefined) W[p] *= 3; });

    const ranked = pool.map((c) => {
      const m = c.m;
      const p = c.price / a.budget;
      const power = Math.min(1, Math.log(m.hp) / Math.log(300));
      const left = Math.max(0, m.warranty - (D.THIS_YEAR - c.year));
      const roads = {
        city: (m.length <= 4500 ? 1 : 0.6) * 0.5 + (c.gearbox === "auto" ? 1 : 0.4) * 0.5,
        rough: m.clearance >= 180 ? 1 : m.clearance >= 160 ? 0.6 : 0.25,
        highway: 0.5 * (m.comfort / 5) + 0.5 * power,
      };
      roads.mixed = (roads.city + roads.rough + roads.highway) / 3;
      const s = {
        price: p <= 1 ? 0.75 + 0.25 * (1 - p) : Math.max(0, 0.5 * (1 - (p - 1) / 0.1)),
        running: cheapest / costs.get(c.id),
        roads: roads[a.roads] ?? roads.mixed,
        fuel: { any: 1, petrol: m.fuel === "petrol" ? 1 : 0.5, electric: m.fuel === "ev" ? 1 : m.fuel === "phev" ? 0.9 : 0.2, gas: c.methane || m.gas ? 1 : 0.3 }[a.fuel] ?? 1,
        comfort: m.comfort / 5,
        space: m.trunk ? Math.min(1, m.trunk / 600) : 0.6,
        power,
        warranty: left / 6,
      };
      const wSum = Object.values(W).reduce((x, y) => x + y, 0);
      const score = Math.round((100 * Object.keys(W).reduce((sum, k) => sum + W[k] * s[k], 0)) / wSum);
      const cost = costs.get(c.id);

      // reasons: the factors that help most, with real numbers
      const good = [], bad = [];
      const say = (list, key, vars, weight) => list.push({ key, vars: vars || {}, weight });
      if (s.price >= 0.75) say(good, (a.budget - c.price) >= 5 ? "price.left" : "price.fits", { left: a.budget - c.price }, W.price * s.price);
      else if (p > 1) say(bad, "price.over", { over: c.price - a.budget }, W.price);
      if (s.running >= 0.8) say(good, "running.cheap", { cost }, W.running * s.running);
      else if (cost > median * 1.5) say(bad, "running.costly", { cost }, W.running); // compared with a typical car here, not the cheapest
      if (a.roads === "rough") { if (s.roads >= 1) say(good, "roads.rough", { mm: m.clearance }, W.roads); else if (s.roads < 0.5) say(bad, "roads.low", { mm: m.clearance }, W.roads); }
      if (a.roads === "city" && s.roads >= 0.95) say(good, "roads.city", {}, W.roads);
      if (a.roads === "highway" && s.roads >= 0.75) say(good, "roads.highway", { hp: m.hp }, W.roads);
      if (a.fuel === "electric") { if (m.fuel !== "petrol") say(good, "fuel.electric", { km: m.eRange }, W.fuel); else say(bad, "fuel.petrolOnly", {}, W.fuel); }
      if (a.fuel === "gas") { if (c.methane) say(good, "fuel.hasGas", {}, W.fuel); else if (m.gas) say(good, "fuel.gasOk", {}, W.fuel * 0.9); else say(bad, "fuel.noGas", {}, W.fuel); }
      if (a.people > 5 && m.seats > 5) say(good, "space.seats", { n: m.seats }, W.space * 2);
      if (m.trunk && s.space >= 0.85) say(good, "space.trunk", { l: m.trunk }, W.space * s.space);
      else if (a.priorities.includes("space") && m.trunk && m.trunk < 420) say(bad, "space.small", { l: m.trunk }, W.space);
      if (m.comfort >= 4) say(good, "comfort.high", {}, W.comfort * s.comfort);
      if (m.hp >= 160) say(good, "power.high", { hp: m.hp }, W.power * s.power);
      if (left >= 3) say(good, "warranty.left", { years: left }, W.warranty * s.warranty);
      else if (a.priorities.includes("warranty") && left === 0) say(bad, "warranty.none", {}, W.warranty);
      good.sort((x, y) => y.weight - x.weight);
      bad.sort((x, y) => y.weight - x.weight);
      return { car: c, score, cost, reasons: good.slice(0, 3), buts: bad.slice(0, 2) };
    }).sort((x, y) => y.score - x.score || x.car.price - y.car.price);
    return { ranked, excluded, answers: a };
  }

  /* ---------- test drives ---------- */
  // a small, stable hash, so the "already booked" slots look the same on every visit
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function bookingDays(from = new Date(), count = 14) {
    const days = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      days.push({ iso: isoDate(d), date: d, closed: d.getDay() === D.HOURS.closedDay });
    }
    return days;
  }
  // every hour from opening to one hour before closing; some are taken by other people
  function slots(carId, dateIso, now = new Date(), bookings = []) {
    const [y, mo, da] = dateIso.split("-").map(Number);
    const day = new Date(y, mo - 1, da);
    if (day.getDay() === D.HOURS.closedDay) return [];
    const today = isoDate(now) === dateIso;
    const out = [];
    for (let h = D.HOURS.open; h < D.HOURS.close; h++) {
      const time = `${pad(h)}:00`;
      const mine = bookings.some((b) => b.car === carId && b.date === dateIso && b.time === time);
      let state = "free";
      if (mine) state = "mine";
      else if (today && h <= now.getHours()) state = "past";
      else if (hash(carId + dateIso + time) % 100 < 35) state = "taken";
      out.push({ time, state });
    }
    return out;
  }

  /* ---------- form checks ---------- */
  const OPERATORS = ["20", "33", "50", "55", "77", "88", "90", "91", "93", "94", "95", "97", "98", "99"];
  // "90 123 45 67", "+998901234567", "998 (90) 123-45-67" → "+998 90 123 45 67"; anything else → null
  function phone(input) {
    let d = String(input || "").replace(/\D/g, "");
    if (d.length === 9) d = "998" + d;
    if (d.length !== 12 || !d.startsWith("998") || !OPERATORS.includes(d.slice(3, 5))) return null;
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  // letters of any alphabet, spaces, apostrophes (O'g'il, Ғ) and hyphens; 2–60 characters
  function name(input) {
    const s = String(input || "").trim().replace(/\s+/g, " ");
    return s.length >= 2 && s.length <= 60 && /^\p{L}[\p{L} '’ʻʼ-]*$/u.test(s) ? s : null;
  }

  /* ---------- search ---------- */
  const FILTER_DEFAULTS = { q: "", brand: [], body: [], fuel: [], priceMin: 0, priceMax: 0, kmMax: 0, yearMin: 0, gearbox: "any", condition: "any", city: "any", seats: 0, methane: false, sort: "recommended" };
  const LIST_KEYS = ["brand", "body", "fuel"];
  function matchesText(c, q) {
    if (!q) return true;
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [c.title, c.trim, c.m.name, D.BRAND_NAMES[c.m.brand], ...(D.ALIASES[c.model] || []), ...(D.ALIASES[c.m.brand] || [])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  }
  function filterCars(f, cars = D.CARS) {
    const city = (c) => D.SHOWROOMS.find((s) => s.id === c.showroom).city;
    return cars.filter((c) =>
      matchesText(c, f.q) &&
      (!f.brand.length || f.brand.includes(c.m.brand)) &&
      (!f.body.length || f.body.includes(c.m.body)) &&
      (!f.fuel.length || f.fuel.includes(c.m.fuel)) &&
      (!f.priceMin || c.price >= f.priceMin) &&
      (!f.priceMax || c.price <= f.priceMax) &&
      (!f.kmMax || c.km <= f.kmMax) &&
      (!f.yearMin || c.year >= f.yearMin) &&
      (f.gearbox === "any" || c.gearbox === f.gearbox) &&
      (f.condition === "any" || (f.condition === "new") === c.isNew) &&
      (f.city === "any" || city(c) === f.city) &&
      (!f.seats || c.m.seats >= f.seats) &&
      (!f.methane || c.methane || c.m.gas));
  }
  const SORTS = {
    recommended: (x, y) => Number(y.isNew) - Number(x.isNew) || y.year - x.year || x.price - y.price,
    "price-asc": (x, y) => x.price - y.price,
    "price-desc": (x, y) => y.price - x.price,
    "km-asc": (x, y) => x.km - y.km || y.year - x.year,
    "year-desc": (x, y) => y.year - x.year || x.km - y.km,
    "power-desc": (x, y) => y.m.hp - x.m.hp,
    "cost-asc": (x, y) => runningCost(x, { kmWeek: 300, methane: x.methane }).total - runningCost(y, { kmWeek: 300, methane: y.methane }).total,
  };
  function sortCars(list, sort) { return [...list].sort(SORTS[sort] || SORTS.recommended); }
  // filters ⇄ URL, so a search can be shared or bookmarked
  function toQuery(f) {
    const p = new URLSearchParams();
    Object.entries(FILTER_DEFAULTS).forEach(([k, def]) => {
      const v = f[k];
      if (LIST_KEYS.includes(k)) { if (v.length) p.set(k, v.join(",")); }
      else if (v !== def && v !== "" && v !== false) p.set(k, v === true ? "1" : String(v));
    });
    return p.toString();
  }
  function fromQuery(search) {
    const p = new URLSearchParams(search);
    const f = { ...FILTER_DEFAULTS, brand: [], body: [], fuel: [] };
    const allowed = { brand: D.BRANDS, body: D.BODIES, fuel: D.FUELS };
    LIST_KEYS.forEach((k) => { if (p.get(k)) f[k] = p.get(k).split(",").filter((v) => allowed[k].includes(v)); });
    ["priceMin", "priceMax", "kmMax", "yearMin", "seats"].forEach((k) => { const n = Number(p.get(k)); if (Number.isFinite(n) && n > 0) f[k] = n; });
    if (["auto", "manual"].includes(p.get("gearbox"))) f.gearbox = p.get("gearbox");
    if (["new", "used"].includes(p.get("condition"))) f.condition = p.get("condition");
    if (D.SHOWROOMS.some((s) => s.city === p.get("city"))) f.city = p.get("city");
    if (SORTS[p.get("sort")]) f.sort = p.get("sort");
    f.q = (p.get("q") || "").slice(0, 60);
    f.methane = p.get("methane") === "1";
    return f;
  }

  /* ---------- compare ----------
     rows of values; "best" marks the better car in each row (only when they differ) */
  function compare(cars, kmWeek = 300) {
    const rows = [
      ["price", (c) => c.price, "low"],
      ["year", (c) => c.year, "high"],
      ["km", (c) => c.km, "low"],
      ["hp", (c) => c.m.hp, "high"],
      ["cost", (c) => runningCost(c, { kmWeek, methane: c.methane }).total, "low"],
      ["trunk", (c) => c.m.trunk || 0, "high"],
      ["seats", (c) => c.m.seats, "high"],
      ["clearance", (c) => c.m.clearance, "high"],
      ["airbags", (c) => c.m.airbags, "high"],
      ["warranty", (c) => Math.max(0, c.m.warranty - (D.THIS_YEAR - c.year)), "high"],
    ];
    return rows.map(([key, get, better]) => {
      const values = cars.map(get);
      const target = better === "low" ? Math.min(...values) : Math.max(...values);
      const differ = new Set(values).size > 1;
      return { key, values, best: values.map((v) => differ && v === target) };
    });
  }

  const api = { payment, loan, lease, maxPrice, runningCost, tradeIn, checkTradeIn, find, bookingDays, slots, isoDate, phone, name, filterCars, sortCars, toQuery, fromQuery, FILTER_DEFAULTS, compare, MLN };
  if (typeof window !== "undefined") window.Calc = api;
  if (typeof module !== "undefined") module.exports = api;
})();
