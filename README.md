# MOTORA: car dealership

Site #7 of my 10-websites course project: a car showroom selling cars that are sold in Uzbekistan (Chevrolet, BYD, Kia, Chery), in Uzbek, Russian and English. Plain HTML, CSS and JavaScript: no framework, no build step, no backend. Everything you save stays in your browser.

The rule for this site: the tools must do real work, not just "click this, click that".

## Pages
| Page | What it does |
|---|---|
| `index.html` | Quick search (the button shows how many cars match before you press it), new arrivals, shop by body type, tools, recently viewed, showrooms |
| `cars.html` | Cars in stock: search (also in Russian or other spellings: "кобальт", "lacetti"), brand, body, fuel, price range, mileage, year, new/used, gearbox, city, seats, methane; 7 sort orders. The filters are saved in the address, so a search can be shared. On phones the filters open as a panel |
| `car.html?id=c01` | Gallery (arrows, thumbnails, keyboard, swipe), price and monthly payment, save / compare / test drive, a running-cost calculator, full specs, similar cars |
| `finder.html` | Car finder: budget, people, roads, km a week, fuel, new/used, gearbox and up to two priorities. Every car gets a score from 0 to 100 with the reasons for and against it; the list updates while you answer |
| `finance.html?car=c01` | Loan or lease: down payment, term, rate, remaining value, trade-in. Monthly payment, interest, a chart of what you still owe, every payment in a table, a check against your income, and "what can I afford?" for a monthly budget |
| `tradein.html` | Trade-in estimate from model, year, mileage, condition, accidents and owners, with each factor explained; it can be used on the finance page |
| `garage.html` | Saved cars, comparison of up to 3 cars (the better value in each row is marked), test drive bookings (add to calendar, cancel with undo), recently viewed |
| `testdrive.html?car=c01` | Booking: a day in the next two weeks (closed on Sundays), a free hour (some are already taken), name, Uzbek phone number, driving licence; a booking code and an `.ics` calendar file |

## How the maths works (`js/calc.js`)
- **Loan:** the standard annuity formula, the same payment every month. **Lease:** lower payments because the remaining value is paid at the end. **What can I afford:** the same formula backwards.
- **Running cost:** km a week → km a month; petrol (l/100 km), methane (about 1 m³ for 1 litre of petrol), electricity (kWh/100 km); a plug-in hybrid drives its electric range every day if it's charged at home. Plus compulsory insurance (optional KASKO) and servicing per km.
- **Trade-in:** the price of the same car new, minus about 7% a year, ±3.5% per 10 000 km above or below 15 000 km a year, and the condition, accidents and owners.
- **Finder:** hard limits first (budget + 10%, seats, gearbox, new/used), then a weighted score of price, running cost, roads (ground clearance for rough roads), fuel, comfort, space, power and warranty. The two priorities count three times as much.
- **Test drive slots:** a small hash of car + day + hour decides which slots other people have "taken", so they stay the same on every visit.

## Data
15 models and 32 cars in stock in `js/data.js`. **Specs, prices and fuel prices are approximate and only for this demo** (prices in million so'm; the calculators let you change fuel prices).

## Design (MOTORA brief, 2026-11-23)
- "Modern automotive editorial combined with a sophisticated financial interface": the cars give the emotion, the interface gives the information. Warm grey-white with deep green-black text and a muted gold accent (`css/base.css`, palette with AA fixes noted next to each token), Manrope for headings and numbers, Inter for text, tabular figures everywhere, borders instead of shadows.
- **Logo:** the MOTORA wordmark, Manrope ExtraBold condensed to 88%, with a custom A whose crossbar floats in gold (`tools/logo.cjs` → `assets/brand`, `js/logo.js`).
- **Signature: MOTORA ownership cost** = an estimated loan (30% down, 36 months) + running costs for your km a week (`Calc.ownership`). It is on every car card, the car page (it follows the running-cost calculator), the finder and the comparison, always marked as an estimate, not a bank offer.
- **Open layout (second pass, 2026-11-23):** sections are separated by space, type and thin dividers instead of bordered boxes. Only what you act on or read as a result has a surface: form fields, the quick search, the main result of each tool (payment, trade-in value, booking), and the ownership panel. Car cards are a photo with open text below.
- **Dark mode:** its own neutral charcoal palette (#141414 page, #1C1C1C bars and results, #252525 controls, brass accent), no green tint; muted grey #77746F is used only for decoration because it is under 4.5:1 for text.
- Motion: finder results slide to their new places and score meters grow; the big totals count to their new value; save and compare give a small pop. All of it is off with "reduce motion".

## Photos
- **Official photos for 5 Chevrolets** (Tracker, Onix, Cobalt, Damas, Tahoe) from [chevrolet.uz](https://chevrolet.uz), the site of UzAuto Motors, which builds and sells Chevrolet in Uzbekistan. Its footer allows reuse with a link ("Sayt materiallaridan foydalanganda havolani ko'rsatishingiz kerak": when using site materials, show a link), so the credit under each photo links to the model page.
- **Wikimedia Commons for the other 10 models**, picked by eye for one look (mostly white or silver cars in daylight, the right generation). Each is CC BY, CC BY-SA, CC0 or public domain; the author and licence are shown under the photo.
- Each model uses one source only. Kia (editorial use only), BYD (written consent needed) and Chery (no published terms) do not allow reuse, and chevrolet.uz no longer shows the Gentra, Malibu or petrol Equinox.
- No free interior photo was found for the Gentra and Tiggo 7 Pro, and no side view of the Sonet: those cars have 2 photos.
- `node tools/commons.mjs` downloads and resizes everything (Windows PowerShell does the resizing) and writes `js/photos.js`.

## Tests
`node --test tests/calc.test.mjs`: 12 tests for the loan, lease, running costs, ownership cost, trade-in, finder, slots, phone and name checks, search, URL and comparison.

## Files
- `js/data.js` models, stock, showrooms, default prices; `js/calc.js` all the maths; `js/store.js` saved data; `js/layout.js` header, footer, cards, sliders; `js/photos.js` photo list with credits; `js/pages/*.js` one file per page; `js/lang.js` UZ / RU / EN text; `js/core.js` language, theme, storage, toasts.
- `tools/pages.mjs` writes the 8 HTML pages from one template.

The Russian and Uzbek text should be checked by a native speaker.
