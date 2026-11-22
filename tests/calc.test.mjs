// Tests for the showroom maths (no browser needed):  node --test tests/calc.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const D = require("../js/data.js");
const C = require("../js/calc.js");
const near = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const MLN = 1e6;

test("the data is complete", () => {
  assert.equal(D.MODELS.length, 15);
  assert.equal(D.CARS.length, 32);
  for (const c of D.CARS) {
    assert.ok(c.m, c.id + " model");
    assert.ok(D.SHOWROOMS.some((s) => s.id === c.showroom), c.id + " showroom");
    assert.ok(D.COLOURS.includes(c.colour), c.id + " colour");
    assert.ok(c.m.gearbox.includes(c.gearbox), c.id + " gearbox");
    for (const l of ["en", "ru", "uz"]) assert.ok(c.m.about[l], c.m.id + " about " + l);
  }
  assert.equal(new Set(D.CARS.map((c) => c.id)).size, D.CARS.length, "ids are unique");
});

test("loan payment matches the annuity formula", () => {
  // 100 mln at 24% a year for 36 months: 3,923,285 so'm a month (checked by hand)
  near(C.payment(100 * MLN, 24, 36), 3923285);
  near(C.payment(120, 0, 12), 10, 1e-9); // no interest: just divide
  const l = C.loan({ price: 200 * MLN, down: 50 * MLN, tradeIn: 50 * MLN, rate: 24, months: 36 });
  assert.equal(l.principal, 100 * MLN);
  near(l.rows.at(-1).balance, 0);
  near(l.interest, 3923285 * 36 - 100 * MLN, 40);
  assert.ok(l.rows.every((r, i, a) => i === 0 || r.balance < a[i - 1].balance), "the balance goes down every month");
});

test("lease ends at the residual and costs less per month than a loan", () => {
  const args = { price: 300 * MLN, down: 60 * MLN, rate: 24, months: 36 };
  const le = C.lease({ ...args, residualPct: 30 });
  const lo = C.loan(args);
  assert.equal(le.buyout, 90 * MLN);
  near(le.rows.at(-1).balance, 90 * MLN);
  assert.ok(le.monthly < lo.monthly);
  assert.ok(le.total > lo.total, "but in total it costs a bit more");
});

test("max price is the inverse of the payment", () => {
  const price = C.maxPrice({ monthly: 3923285, down: 20 * MLN, rate: 24, months: 36 });
  near(price, 120 * MLN, 20);
});

test("running costs: petrol, methane, electric and plug-in hybrid", () => {
  const cobalt = D.car("c01"); // 7.2 l/100 km
  const p = C.runningCost(cobalt, { kmWeek: 300 });
  near(p.kmMonth, 1300, 0.01);
  near(p.litres, 93.6, 0.01);
  near(p.energy, 93.6 * D.PRICES.petrol, 0.01);
  const g = C.runningCost(cobalt, { kmWeek: 300, methane: true });
  assert.ok(g.energy < p.energy / 2, "methane is much cheaper");
  const han = C.runningCost(D.car("c23"), { kmWeek: 300 });
  near(han.kwh, 221, 0.01);
  assert.equal(han.litres, 0);
  // Song Plus: 110 km electric range, 300 km a week ≈ 43 km a day → all electric
  const song = C.runningCost(D.car("c21"), { kmWeek: 300 });
  assert.equal(song.eShare, 1);
  // 1400 km a week = 200 km a day → 55% electric
  near(C.runningCost(D.car("c21"), { kmWeek: 1400 }).eShare, 0.55, 0.001);
  // no charging at home: drives as a normal hybrid
  assert.equal(C.runningCost(D.car("c21"), { kmWeek: 300, homeCharging: false }).eShare, 0);
  // full insurance adds 1.5% of the price a year
  const k = C.runningCost(cobalt, { kmWeek: 300, kasko: true });
  near(k.insurance - p.insurance, (158 * MLN * 0.015) / 12, 0.01);
});

test("trade-in: older, more km and worse condition lower the value", () => {
  const base = { base: 158, year: 2022, km: 60000, condition: "good" };
  const v = C.tradeIn(base);
  assert.ok(v.low < v.mid && v.mid < v.high);
  assert.ok(C.tradeIn({ ...base, year: 2018 }).mid < v.mid);
  assert.ok(C.tradeIn({ ...base, km: 150000 }).mid < v.mid);
  assert.ok(C.tradeIn({ ...base, condition: "poor" }).mid < v.mid);
  assert.ok(C.tradeIn({ ...base, accident: true }).mid < v.mid);
  assert.equal(v.expectedKm, 60000); // 4 years × 15,000 km: no mileage change
  assert.equal(v.factors.find((f) => f.key === "km").pct, 0);
  assert.deepEqual(C.checkTradeIn({ year: 1990, km: -1 }), { year: "year", km: "km" });
  assert.deepEqual(C.checkTradeIn({ year: 2020, km: 50000 }), {});
});

test("finder: respects budget, seats and gearbox, and explains itself", () => {
  const r = C.find({ budget: 200, people: 5, roads: "city", kmWeek: 300, auto: true });
  assert.ok(r.ranked.length > 0);
  assert.ok(r.ranked.every((x) => x.car.price <= 220 && x.car.m.seats >= 5 && x.car.gearbox === "auto"));
  assert.ok(r.excluded.budget > 0);
  assert.ok(r.ranked.every((x, i, a) => i === 0 || a[i - 1].score >= x.score), "sorted by score");
  assert.ok(r.ranked[0].reasons.length > 0, "the top car has reasons");
  // a big family needs the 7- and 8-seaters
  const fam = C.find({ budget: 2000, people: 7 });
  assert.deepEqual([...new Set(fam.ranked.map((x) => x.car.model))].sort(), ["damas", "tahoe"]);
  // wants electric: an electric or hybrid car wins
  const ev = C.find({ budget: 600, people: 4, fuel: "electric", priorities: ["running"] });
  assert.ok(["ev", "phev"].includes(ev.ranked[0].car.m.fuel));
  // rough roads: high clearance wins
  const rough = C.find({ budget: 300, people: 4, roads: "rough", priorities: ["comfort"] });
  assert.ok(rough.ranked[0].car.m.clearance >= 180);
});

test("test drive slots: closed on Sunday, past hours gone, stable taken slots, own booking", () => {
  assert.deepEqual(C.slots("c01", "2026-11-22"), []); // a Sunday
  const monday = "2026-11-23";
  const a = C.slots("c01", monday, new Date(2026, 10, 20, 9));
  assert.equal(a.length, 8); // 10:00 … 17:00
  assert.deepEqual(a, C.slots("c01", monday, new Date(2026, 10, 20, 9)), "same result every time");
  const morning = C.slots("c01", monday, new Date(2026, 10, 23, 12, 30));
  assert.ok(morning.slice(0, 3).every((s) => s.state === "past"));
  const free = a.find((s) => s.state === "free");
  const mine = C.slots("c01", monday, new Date(2026, 10, 20, 9), [{ car: "c01", date: monday, time: free.time }]);
  assert.equal(mine.find((s) => s.time === free.time).state, "mine");
  const days = C.bookingDays(new Date(2026, 10, 22), 14);
  assert.equal(days.length, 14);
  assert.equal(days[0].closed, true);
  assert.equal(days[1].iso, monday);
});

test("phone numbers and names", () => {
  assert.equal(C.phone("90 123 45 67"), "+998 90 123 45 67");
  assert.equal(C.phone("+998 (93) 555-12-34"), "+998 93 555 12 34");
  assert.equal(C.phone("998941112233"), "+998 94 111 22 33");
  assert.equal(C.phone("12345"), null);
  assert.equal(C.phone("+998 12 345 67 89"), null); // no such operator
  assert.equal(C.name("  Islom   Maxsumov "), "Islom Maxsumov");
  assert.equal(C.name("O'g'iloy"), "O'g'iloy");
  assert.equal(C.name("Анна-Мария"), "Анна-Мария");
  assert.equal(C.name("A"), null);
  assert.equal(C.name("<script>"), null);
});

test("search: filters, text in other alphabets, sorting and the URL", () => {
  const base = { ...C.FILTER_DEFAULTS, brand: [], body: [], fuel: [] };
  assert.equal(C.filterCars(base).length, 32);
  const cob = C.filterCars({ ...base, q: "кобальт" });
  assert.ok(cob.length >= 4 && cob.every((c) => c.model === "cobalt"));
  assert.ok(C.filterCars({ ...base, q: "lacetti" }).every((c) => c.model === "gentra"));
  const f = { ...base, body: ["suv", "crossover"], priceMax: 300, condition: "new", sort: "price-asc" };
  const list = C.sortCars(C.filterCars(f), f.sort);
  assert.ok(list.every((c) => ["suv", "crossover"].includes(c.m.body) && c.price <= 300 && c.isNew));
  assert.ok(list.every((c, i) => i === 0 || list[i - 1].price <= c.price));
  const q = C.toQuery(f);
  assert.equal(q, "body=suv%2Ccrossover&priceMax=300&condition=new&sort=price-asc");
  assert.deepEqual(C.fromQuery(q), { ...base, ...f });
  assert.deepEqual(C.fromQuery("body=boat&sort=evil&priceMax=-5").body, []);
});

test("compare marks the better value in each row", () => {
  const rows = C.compare([D.car("c01"), D.car("c11")]);
  const price = rows.find((r) => r.key === "price");
  assert.deepEqual(price.best, [true, false]); // Cobalt is cheaper
  const clearance = rows.find((r) => r.key === "clearance");
  assert.deepEqual(clearance.best, [false, true]); // Tracker sits higher
  const seats = rows.find((r) => r.key === "seats");
  assert.deepEqual(seats.best, [false, false]); // same: nothing marked
});
