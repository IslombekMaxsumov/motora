# Avtosalon (working name): car dealership

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

## Not done yet
- **Design:** `css/site.css` is layout only and `css/base.css` is the shared placeholder. The look will come from my design brief.
- **Photos:** every car shows a plain plate with its name. The gallery is ready for 3 photos per model (front, side, interior) in `js/photos.js`.
- **Name and logo:** "Avtosalon" is a working name.

## Tests
`node --test tests/calc.test.mjs`: 11 tests for the loan, lease, running costs, trade-in, finder, slots, phone and name checks, search, URL and comparison.

## Files
- `js/data.js` models, stock, showrooms, default prices; `js/calc.js` all the maths; `js/store.js` saved data; `js/layout.js` header, footer, cards, sliders; `js/pages/*.js` one file per page; `js/lang.js` UZ / RU / EN text; `js/core.js` language, theme, storage, toasts.
- `tools/pages.mjs` writes the 8 HTML pages from one template.

The Russian and Uzbek text should be checked by a native speaker.
