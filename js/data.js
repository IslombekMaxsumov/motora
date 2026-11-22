/* The showroom's data: car models, the cars in stock, showrooms, and the
   default prices used by the calculators. Specs and prices are approximate
   and only for this demo (prices in million so'm).
   Works in the browser (window.DATA) and in Node tests. */
(function () {
  "use strict";

  /* ---------- models ----------
     body: sedan | hatch | crossover | suv | bigsuv | van
     fuel: petrol | phev (plug-in hybrid) | ev
     gas: true when the car is often run on methane (many economy cars in Uzbekistan are)
     l100: petrol per 100 km (for a phev: with an empty battery)
     kwh100 / eRange: electricity per 100 km and electric range (ev and phev)
     trunk: litres, clearance: mm, length: mm, comfort: 1–5, service: maintenance class
     price: base price of a new car in million so'm */
  const MODELS = [
    { id: "damas", brand: "chevrolet", name: "Damas", body: "van", seats: 7, fuel: "petrol", gas: true, engine: "0.8", hp: 38, gearbox: ["manual"], drive: "rwd", l100: 7.0, trunk: null, length: 3495, clearance: 150, airbags: 0, warranty: 3, comfort: 1, service: "economy", price: 98,
      about: { en: "The small van that carries Uzbekistan's markets: seven seats, tiny running costs, nothing extra.", ru: "Маленький фургон, на котором держатся рынки Узбекистана: семь мест, копеечное содержание, ничего лишнего.", uz: "O'zbekiston bozorlarini tashiydigan kichik furgon: yetti o'rin, arzon xarajat, ortiqcha hech narsa yo'q." } },
    { id: "cobalt", brand: "chevrolet", name: "Cobalt", body: "sedan", seats: 5, fuel: "petrol", gas: true, engine: "1.5", hp: 106, gearbox: ["manual", "auto"], drive: "fwd", l100: 7.2, trunk: 545, length: 4479, clearance: 166, airbags: 2, warranty: 3, comfort: 2, service: "economy", price: 158,
      about: { en: "A simple, roomy family sedan with a huge boot, cheap parts and a mechanic who knows it in every town.", ru: "Простой и просторный семейный седан с огромным багажником, дешёвыми запчастями и мастером в каждом городе.", uz: "Katta yukxonali, ehtiyot qismlari arzon va har bir shaharda ustasi bor oddiy, keng oilaviy sedan." } },
    { id: "onix", brand: "chevrolet", name: "Onix", body: "sedan", seats: 5, fuel: "petrol", gas: false, engine: "1.2 turbo", hp: 132, gearbox: ["auto"], drive: "fwd", l100: 6.2, trunk: 469, length: 4474, clearance: 143, airbags: 6, warranty: 3, comfort: 3, service: "economy", price: 182,
      about: { en: "A modern small sedan with a turbo engine, six airbags and a touchscreen: economical and easy in the city.", ru: "Современный небольшой седан с турбомотором, шестью подушками и сенсорным экраном: экономичный и удобный в городе.", uz: "Turbo dvigatel, oltita xavfsizlik yostig'i va sensorli ekranli zamonaviy kichik sedan: tejamkor va shaharda qulay." } },
    { id: "gentra", brand: "chevrolet", name: "Gentra", body: "sedan", seats: 5, fuel: "petrol", gas: true, engine: "1.5", hp: 107, gearbox: ["manual", "auto"], drive: "fwd", l100: 7.9, trunk: 405, length: 4515, clearance: 160, airbags: 2, warranty: 3, comfort: 2, service: "economy", price: 168,
      about: { en: "The familiar Lacetti shape: soft on bad roads, easy to repair and holds its value well.", ru: "Знакомый силуэт Lacetti: мягко идёт по плохим дорогам, легко ремонтируется и хорошо держит цену.", uz: "Tanish Lacetti shakli: yomon yo'lda yumshoq, ta'mirlash oson va narxini yaxshi ushlaydi." } },
    { id: "tracker", brand: "chevrolet", name: "Tracker", body: "crossover", seats: 5, fuel: "petrol", gas: false, engine: "1.2 turbo", hp: 132, gearbox: ["auto"], drive: "fwd", l100: 6.8, trunk: 393, length: 4270, clearance: 180, airbags: 6, warranty: 3, comfort: 3, service: "economy", price: 262,
      about: { en: "A compact crossover that sits higher on the road, with a frugal turbo engine and good safety kit.", ru: "Компактный кроссовер с высокой посадкой, экономичным турбомотором и хорошим набором безопасности.", uz: "Baland o'tiradigan, tejamkor turbo dvigatelli va xavfsizlik jihozlari yaxshi ixcham krossover." } },
    { id: "malibu", brand: "chevrolet", name: "Malibu", body: "sedan", seats: 5, fuel: "petrol", gas: false, engine: "1.5 turbo", hp: 163, gearbox: ["auto"], drive: "fwd", l100: 7.6, trunk: 447, length: 4933, clearance: 145, airbags: 10, warranty: 3, comfort: 4, service: "mid", price: 385,
      about: { en: "A long, quiet business sedan with lots of rear legroom and a calm, comfortable ride.", ru: "Длинный тихий бизнес-седан с большим местом сзади и спокойным, комфортным ходом.", uz: "Orqasi keng, sokin va qulay yuradigan uzun biznes sedan." } },
    { id: "equinox", brand: "chevrolet", name: "Equinox", body: "suv", seats: 5, fuel: "petrol", gas: false, engine: "1.5 turbo", hp: 172, gearbox: ["auto"], drive: "awd", l100: 8.7, trunk: 846, length: 4652, clearance: 200, airbags: 6, warranty: 3, comfort: 4, service: "mid", price: 465,
      about: { en: "A family SUV with all-wheel drive and a very big boot: ready for the mountains and the dacha.", ru: "Семейный внедорожник с полным приводом и очень большим багажником: и в горы, и на дачу.", uz: "To'liq yuritmali va juda katta yukxonali oilaviy SUV: tog'ga ham, dala hovliga ham." } },
    { id: "tahoe", brand: "chevrolet", name: "Tahoe", body: "bigsuv", seats: 8, fuel: "petrol", gas: false, engine: "5.3 V8", hp: 355, gearbox: ["auto"], drive: "awd", l100: 14.5, trunk: 722, length: 5352, clearance: 204, airbags: 7, warranty: 3, comfort: 5, service: "premium", price: 1290,
      about: { en: "A full-size eight-seater with a V8: the car for weddings, big families and long trips in comfort.", ru: "Полноразмерный восьмиместный внедорожник с V8: для свадеб, больших семей и дальних поездок с комфортом.", uz: "V8 dvigatelli sakkiz o'rinli katta SUV: to'ylar, katta oilalar va uzoq safarlar uchun." } },
    { id: "chazor", brand: "byd", name: "Chazor", body: "sedan", seats: 5, fuel: "phev", gas: false, engine: "1.5 + electric", hp: 180, gearbox: ["auto"], drive: "fwd", l100: 3.8, kwh100: 13, eRange: 55, trunk: 450, length: 4765, clearance: 120, airbags: 6, warranty: 6, comfort: 3, service: "phev", price: 305,
      about: { en: "A plug-in hybrid sedan: city trips on electricity, long trips on very little petrol.", ru: "Подключаемый гибрид-седан: по городу на электричестве, в дальнюю дорогу на минимуме бензина.", uz: "Rozetkadan quvvatlanadigan gibrid sedan: shahar ichida elektrda, uzoq yo'lda juda oz benzinda." } },
    { id: "songplus", brand: "byd", name: "Song Plus", body: "suv", seats: 5, fuel: "phev", gas: false, engine: "1.5 + electric", hp: 197, gearbox: ["auto"], drive: "fwd", l100: 4.5, kwh100: 16, eRange: 110, trunk: 574, length: 4775, clearance: 175, airbags: 6, warranty: 6, comfort: 4, service: "phev", price: 425,
      about: { en: "A roomy plug-in hybrid SUV that does a whole week of city driving on electricity alone.", ru: "Просторный подключаемый гибрид-кроссовер: неделю городских поездок проезжает на одном электричестве.", uz: "Shahar bo'ylab bir haftalik yo'lni faqat elektrda bosib o'tadigan keng gibrid SUV." } },
    { id: "han", brand: "byd", name: "Han EV", body: "sedan", seats: 5, fuel: "ev", gas: false, engine: "electric, 2 motors", hp: 517, gearbox: ["auto"], drive: "awd", kwh100: 17, eRange: 605, trunk: 410, length: 4995, clearance: 130, airbags: 11, warranty: 6, comfort: 5, service: "ev", price: 545,
      about: { en: "A fast, silent electric flagship: over 600 km per charge and almost nothing to service.", ru: "Быстрый и тихий электрический флагман: больше 600 км на одной зарядке и почти нечего обслуживать.", uz: "Tez va sokin elektr flagman: bir quvvatlashda 600 km dan ortiq, xizmat ko'rsatish deyarli kerak emas." } },
    { id: "sonet", brand: "kia", name: "Sonet", body: "crossover", seats: 5, fuel: "petrol", gas: true, engine: "1.5", hp: 115, gearbox: ["auto"], drive: "fwd", l100: 6.9, trunk: 392, length: 4120, clearance: 211, airbags: 6, warranty: 5, comfort: 3, service: "economy", price: 228,
      about: { en: "A short, high crossover that parks anywhere and does not fear potholes or dirt roads.", ru: "Короткий высокий кроссовер: паркуется где угодно и не боится ям и грунтовок.", uz: "Istalgan joyga sig'adigan, chuqurlar va tuproq yo'llardan qo'rqmaydigan kalta, baland krossover." } },
    { id: "k5", brand: "kia", name: "K5", body: "sedan", seats: 5, fuel: "petrol", gas: false, engine: "2.0", hp: 150, gearbox: ["auto"], drive: "fwd", l100: 8.1, trunk: 510, length: 4905, clearance: 155, airbags: 6, warranty: 5, comfort: 4, service: "mid", price: 395,
      about: { en: "A sharp-looking mid-size sedan with a simple, reliable engine and a long warranty.", ru: "Эффектный седан среднего класса с простым надёжным мотором и долгой гарантией.", uz: "Oddiy, ishonchli dvigatelli va uzoq kafolatli ko'rkam o'rta sinf sedan." } },
    { id: "sportage", brand: "kia", name: "Sportage", body: "suv", seats: 5, fuel: "petrol", gas: false, engine: "2.0", hp: 150, gearbox: ["auto"], drive: "awd", l100: 8.8, trunk: 591, length: 4660, clearance: 181, airbags: 6, warranty: 5, comfort: 4, service: "mid", price: 438,
      about: { en: "A comfortable all-wheel-drive SUV with a big boot and a modern cabin.", ru: "Комфортный полноприводный кроссовер с большим багажником и современным салоном.", uz: "Katta yukxonali, zamonaviy saloni bor qulay to'liq yuritmali SUV." } },
    { id: "tiggo7", brand: "chery", name: "Tiggo 7 Pro", body: "crossover", seats: 5, fuel: "petrol", gas: false, engine: "1.5 turbo", hp: 147, gearbox: ["auto"], drive: "fwd", l100: 7.9, trunk: 475, length: 4500, clearance: 190, airbags: 6, warranty: 5, comfort: 3, service: "mid", price: 318,
      about: { en: "A well-equipped crossover for its price: big screens, a panoramic roof and a five-year warranty.", ru: "Богато оснащённый за свои деньги кроссовер: большие экраны, панорамная крыша и гарантия пять лет.", uz: "Narxiga ko'ra boy jihozlangan krossover: katta ekranlar, panorama tom va besh yillik kafolat." } },
  ];
  // other spellings people type in search (Russian, Uzbek Latin, old names)
  const ALIASES = {
    damas: ["дамас"], cobalt: ["кобальт", "kobalt"], onix: ["оникс", "oniks"], gentra: ["джентра", "jentra", "lacetti", "лачетти", "lasetti"],
    tracker: ["трекер", "treker"], malibu: ["малибу"], equinox: ["эквинокс", "ekvinoks"], tahoe: ["тахо", "taxo"], chazor: ["чазор", "qin"],
    songplus: ["сонг", "song"], han: ["хан", "xan"], sonet: ["сонет"], k5: ["к5"], sportage: ["спортейдж", "sportej"], tiggo7: ["тигго", "tigo", "tiggo"],
    chevrolet: ["шевроле", "shevrole", "chevy"], byd: ["бид", "бйд"], kia: ["киа"], chery: ["чери", "cheri"],
  };
  const BRANDS = ["chevrolet", "byd", "kia", "chery"];
  const BRAND_NAMES = { chevrolet: "Chevrolet", byd: "BYD", kia: "Kia", chery: "Chery" };
  const BODIES = ["sedan", "crossover", "suv", "bigsuv", "van"];
  const FUELS = ["petrol", "phev", "ev"];
  const COLOURS = ["white", "black", "silver", "grey", "blue", "red"];

  /* ---------- showrooms ---------- */
  const SHOWROOMS = [
    { id: "tash1", city: "tashkent", address: { en: "Bunyodkor Avenue 7, Chilonzor", ru: "проспект Бунёдкор, 7, Чиланзар", uz: "Bunyodkor shoh ko'chasi, 7, Chilonzor" } },
    { id: "tash2", city: "tashkent", address: { en: "Amir Temur Avenue 108, Yunusobod", ru: "проспект Амира Темура, 108, Юнусабад", uz: "Amir Temur shoh ko'chasi, 108, Yunusobod" } },
    { id: "sam", city: "samarkand", address: { en: "Registon Street 22", ru: "улица Регистан, 22", uz: "Registon ko'chasi, 22" } },
    { id: "fer", city: "fergana", address: { en: "Al-Farghoni Street 15", ru: "улица Аль-Фаргани, 15", uz: "Al-Farg'oniy ko'chasi, 15" } },
  ];
  const HOURS = { open: 10, close: 18, closedDay: 0 }; // 10:00–18:00, closed on Sunday

  /* ---------- cars in stock ----------
     [id, model, year, km, price (mln so'm), colour, trim, showroom, extras]
     extras: g = has methane equipment, a = automatic (when the model has both) */
  const STOCK = [
    ["c01", "cobalt", 2026, 0, 158, "white", "LT", "tash1", ""],
    ["c02", "cobalt", 2026, 0, 172, "silver", "LTZ", "tash2", "a"],
    ["c03", "cobalt", 2022, 48000, 128, "white", "LT", "sam", "g"],
    ["c04", "cobalt", 2020, 96000, 105, "grey", "LS", "fer", "g"],
    ["c05", "damas", 2026, 0, 98, "white", "DLX", "tash1", ""],
    ["c06", "damas", 2021, 74000, 72, "white", "DLX", "fer", "g"],
    ["c07", "onix", 2026, 0, 182, "red", "LT", "tash1", ""],
    ["c08", "onix", 2024, 21000, 165, "blue", "Premier", "tash2", ""],
    ["c09", "gentra", 2023, 39000, 142, "black", "LTZ", "sam", "a"],
    ["c10", "gentra", 2019, 128000, 98, "silver", "LS", "fer", "g"],
    ["c11", "tracker", 2026, 0, 262, "white", "LT", "tash2", ""],
    ["c12", "tracker", 2026, 0, 289, "grey", "Premier", "tash1", ""],
    ["c13", "tracker", 2023, 34000, 228, "blue", "LT", "sam", ""],
    ["c14", "malibu", 2026, 0, 385, "black", "LT", "tash1", ""],
    ["c15", "malibu", 2021, 67000, 298, "white", "Premier", "tash2", ""],
    ["c16", "equinox", 2025, 9000, 448, "grey", "RS", "tash1", ""],
    ["c17", "tahoe", 2026, 0, 1290, "black", "High Country", "tash2", ""],
    ["c18", "tahoe", 2022, 58000, 990, "white", "LT", "sam", ""],
    ["c19", "chazor", 2026, 0, 305, "white", "Flagship", "tash1", ""],
    ["c20", "chazor", 2025, 12000, 279, "grey", "Honor", "fer", ""],
    ["c21", "songplus", 2026, 0, 425, "blue", "Flagship", "tash2", ""],
    ["c22", "songplus", 2024, 28000, 372, "black", "Champion", "sam", ""],
    ["c23", "han", 2026, 0, 545, "red", "AWD", "tash1", ""],
    ["c24", "sonet", 2026, 0, 228, "white", "Prestige", "fer", ""],
    ["c25", "sonet", 2024, 18000, 205, "red", "Comfort", "tash2", ""],
    ["c26", "k5", 2026, 0, 395, "black", "GT-Line", "tash1", ""],
    ["c27", "k5", 2022, 52000, 318, "white", "Prestige", "sam", ""],
    ["c28", "sportage", 2026, 0, 438, "grey", "Prestige", "tash2", ""],
    ["c29", "tiggo7", 2026, 0, 318, "white", "Ultimate", "fer", ""],
    ["c30", "tiggo7", 2024, 26000, 268, "grey", "Luxury", "tash1", ""],
    ["c31", "cobalt", 2025, 11000, 150, "black", "LTZ", "tash1", "a"],
    ["c32", "onix", 2021, 62000, 138, "white", "LT", "fer", ""],
  ];
  const THIS_YEAR = 2026;
  const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));
  const CARS = STOCK.map(([id, model, year, km, price, colour, trim, showroom, extras]) => {
    const m = MODEL_BY_ID[model];
    return {
      id, model, m, year, km, price, colour, trim, showroom,
      isNew: year === THIS_YEAR && km < 100,
      methane: extras.includes("g"),
      gearbox: m.gearbox.length === 1 ? m.gearbox[0] : extras.includes("a") ? "auto" : "manual",
      title: BRAND_NAMES[m.brand] + " " + m.name,
    };
  });

  /* ---------- trade-in: cars people bring in, with today's new price (mln so'm) ---------- */
  const TRADE_MODELS = [
    { id: "matiz", name: "Chevrolet Matiz", price: 72 },
    { id: "spark", name: "Chevrolet Spark", price: 118 },
    { id: "nexia3", name: "Chevrolet Nexia 3", price: 128 },
    { id: "damas", name: "Chevrolet Damas", price: 98 },
    { id: "cobalt", name: "Chevrolet Cobalt", price: 158 },
    { id: "gentra", name: "Chevrolet Gentra / Lacetti", price: 168 },
    { id: "onix", name: "Chevrolet Onix", price: 182 },
    { id: "tracker", name: "Chevrolet Tracker", price: 262 },
    { id: "captiva", name: "Chevrolet Captiva", price: 360 },
    { id: "malibu", name: "Chevrolet Malibu", price: 385 },
    { id: "chazor", name: "BYD Chazor", price: 305 },
    { id: "sonet", name: "Kia Sonet", price: 228 },
    { id: "k5", name: "Kia K5", price: 395 },
  ];

  /* ---------- defaults for the calculators (demo values, all editable) ---------- */
  const PRICES = {
    petrol: 11500,     // so'm per litre (AI-92)
    methane: 4500,     // so'm per m³
    homeKwh: 1000,     // so'm per kWh at home
    publicKwh: 2500,   // so'm per kWh at a fast charger
    osago: 192000,     // compulsory insurance, so'm per year
    kasko: 1.5,        // optional full insurance, % of the car's price per year
    service: { economy: 250, mid: 400, premium: 900, phev: 280, ev: 150 }, // maintenance, so'm per km
  };
  const FINANCE = { rate: 24, leaseRate: 22, minTerm: 12, maxTerm: 60, residual: 30 };

  const car = (id) => CARS.find((c) => c.id === id) || null;
  const api = { MODELS, MODEL_BY_ID, ALIASES, BRANDS, BRAND_NAMES, BODIES, FUELS, COLOURS, SHOWROOMS, HOURS, CARS, THIS_YEAR, TRADE_MODELS, PRICES, FINANCE, car };
  if (typeof window !== "undefined") window.DATA = api;
  if (typeof module !== "undefined") module.exports = api;
})();
