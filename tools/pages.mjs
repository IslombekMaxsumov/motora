// Writes the 8 HTML pages from one template, so the head, header and footer
// are the same everywhere. Run:  node tools/pages.mjs
// (The header, menu and footer are filled in by js/layout.js.)
import { writeFileSync } from "node:fs";

const head = (page) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MOTORA</title>
  <meta name="description" content="">
  <meta name="theme-color" content="#f2f2ee">
  <link rel="icon" href="assets/brand/motora-favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..600&family=Manrope:wght@600..800&display=swap">
  <!-- Apply the saved theme before the page is drawn, so it never flashes. -->
  <script>
    window.APP_NS = "cars";
    try {
      var savedTheme = localStorage.getItem("cars:theme");
      document.documentElement.setAttribute("data-theme", savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    } catch (e) {}
  </script>
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/site.css">
  <script defer src="js/core.js"></script>
  <script defer src="js/lang.js"></script>
  <script defer src="js/data.js"></script>
  <script defer src="js/calc.js"></script>
  <script defer src="js/store.js"></script>
  <script defer src="js/logo.js"></script>
  <script defer src="js/layout.js"></script>
  <script defer src="js/pages/${page}.js"></script>
</head>
<body data-page="${page}">
  <a class="skip-link" href="#main" data-i18n="skip">Skip to content</a>
  <header id="site-header" class="site-header"></header>
`;
const foot = `
  <footer id="site-footer" class="site-footer"></footer>
  <div id="toasts" class="toast-host" aria-live="polite"></div>
</body>
</html>
`;

const PAGES = {
  index: ["home", `
  <main id="main" tabindex="-1" class="container page home-page">
    <section class="hero" aria-labelledby="homeTitle">
      <div class="hero-text">
        <p class="eyebrow" data-i18n="home.eyebrow"></p>
        <h1 id="homeTitle" data-i18n="home.title"></h1>
        <p class="lead" data-i18n="home.intro"></p>
        <ul id="heroStats" class="stats"></ul>
      </div>
      <div id="featured" class="featured"></div>
      <form id="quickSearch" class="quick-search" action="cars.html" aria-labelledby="qsTitle">
        <h2 id="qsTitle" class="qs-title" data-i18n="home.qsTitle"></h2>
        <div class="field"><label for="qsBody" data-i18n="filter.body"></label><select id="qsBody" name="body" class="select"></select></div>
        <div class="field"><label for="qsPrice" data-i18n="home.budget"></label><select id="qsPrice" name="priceMax" class="select"></select></div>
        <div class="field"><label for="qsCondition" data-i18n="filter.condition"></label><select id="qsCondition" name="condition" class="select"></select></div>
        <button type="submit" class="btn" id="qsSubmit"></button>
      </form>
      <p class="hero-finder"><span data-i18n="home.notSure"></span> <a href="finder.html" data-i18n="home.toFinder"></a></p>
    </section>
    <section class="section" aria-labelledby="newTitle">
      <div class="section-head"><h2 id="newTitle" data-i18n="home.newTitle"></h2><a class="more-link" href="cars.html?condition=new" data-i18n="home.allNew"></a></div>
      <div id="newList" class="card-grid card-row"></div>
    </section>
    <section class="section" aria-labelledby="bodyTitle">
      <h2 id="bodyTitle" data-i18n="home.bodyTitle"></h2>
      <ul id="bodyList" class="tile-list"></ul>
    </section>
    <section class="section" aria-labelledby="toolsTitle">
      <h2 id="toolsTitle" data-i18n="home.toolsTitle"></h2>
      <ul id="toolList" class="tool-list"></ul>
    </section>
    <section class="section" id="recentSection" aria-labelledby="recentTitle" hidden>
      <h2 id="recentTitle" data-i18n="home.recent"></h2>
      <div id="recentList" class="card-grid"></div>
    </section>
    <section class="section" aria-labelledby="roomTitle">
      <h2 id="roomTitle" data-i18n="home.showrooms"></h2>
      <ul id="roomList" class="room-list"></ul>
    </section>
  </main>`],

  cars: ["cars", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.cars"></h1>
    <div class="list-layout">
      <form id="filters" class="filters" novalidate aria-labelledby="filterTitle">
        <div class="filters-head"><h2 id="filterTitle" data-i18n="filter.title"></h2><button type="button" id="filtersClose" class="icon-btn filters-close" data-i18n-aria="filter.close"></button></div>
        <div id="filterFields"></div>
        <div class="filters-foot"><button type="button" id="reset" class="btn btn-ghost" data-i18n="filter.reset"></button><button type="button" id="filtersDone" class="btn filters-done"></button></div>
      </form>
      <div class="list-main">
        <div class="list-top">
          <div class="search" role="search">
            <label for="q" class="visually-hidden" data-i18n="filter.search"></label>
            <input id="q" class="input" type="search" autocomplete="off" maxlength="60" data-i18n-placeholder="filter.searchPlaceholder">
          </div>
          <button type="button" id="filtersToggle" class="btn btn-ghost filters-toggle" aria-expanded="false" aria-controls="filters"></button>
          <div class="field sort-field"><label for="sort" data-i18n="filter.sort"></label><select id="sort" class="select"></select></div>
        </div>
        <div id="activeFilters" class="active-filters"></div>
        <p id="count" class="result-count" aria-live="polite"></p>
        <p class="hint own-note" data-i18n="own.note"></p>
        <div id="list" class="card-grid"></div>
        <div id="empty" class="empty" hidden>
          <h2 data-i18n="filter.emptyTitle"></h2>
          <p id="emptyText"></p>
          <button type="button" id="reset2" class="btn" data-i18n="filter.reset"></button>
        </div>
      </div>
    </div>
  </main>`],

  car: ["car", `
  <main id="main" tabindex="-1" class="container page car-page">
    <nav class="crumbs" id="crumbs" data-i18n-aria="crumb.label"></nav>
    <div id="view"></div>
  </main>`],

  finder: ["finder", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.finder"></h1>
    <p class="lead" data-i18n="finder.intro"></p>
    <div class="finder-layout">
      <form id="finderForm" class="finder-form" novalidate></form>
      <section class="finder-results" aria-labelledby="resultTitle">
        <h2 id="resultTitle" data-i18n="finder.results"></h2>
        <p id="finderSummary" class="result-count" aria-live="polite"></p>
        <ol id="finderList" class="match-list"></ol>
        <button type="button" id="finderMore" class="btn btn-ghost" hidden></button>
      </section>
    </div>
  </main>`],

  finance: ["finance", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.finance"></h1>
    <p class="lead" data-i18n="finance.intro"></p>
    <div class="finance-layout">
      <form id="financeForm" class="finance-form" novalidate></form>
      <section class="finance-result" aria-labelledby="payTitle">
        <h2 id="payTitle" class="visually-hidden" data-i18n="finance.result"></h2>
        <div id="payment" class="payment" aria-live="polite"></div>
        <div id="chart" class="chart"></div>
        <details class="schedule"><summary data-i18n="finance.schedule"></summary><div id="scheduleTable" class="table-wrap"></div></details>
        <div id="afford" class="afford"></div>
      </section>
    </div>
    <section class="section" aria-labelledby="budgetTitle">
      <h2 id="budgetTitle" data-i18n="finance.budgetTitle"></h2>
      <p data-i18n="finance.budgetIntro"></p>
      <div id="budgetTool" class="budget-tool"></div>
    </section>
  </main>`],

  tradein: ["tradein", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.tradein"></h1>
    <p class="lead" data-i18n="trade.intro"></p>
    <div class="trade-layout">
      <form id="tradeForm" class="trade-form" novalidate></form>
      <section id="tradeResult" class="trade-result" aria-live="polite" aria-labelledby="tradeResultTitle"></section>
    </div>
  </main>`],

  garage: ["garage", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.garage"></h1>
    <nav class="jump-links" data-i18n-aria="garage.jump"><a href="#saved" data-i18n="garage.saved"></a><a href="#compare" data-i18n="garage.compare"></a><a href="#drives" data-i18n="garage.drives"></a><a href="#recent" data-i18n="garage.recent"></a></nav>
    <section id="saved" class="section" aria-labelledby="savedTitle"><h2 id="savedTitle" data-i18n="garage.saved"></h2><div id="savedList"></div></section>
    <section id="compare" class="section" aria-labelledby="compareTitle"><h2 id="compareTitle" data-i18n="garage.compare"></h2><div id="compareView"></div></section>
    <section id="drives" class="section" aria-labelledby="drivesTitle"><h2 id="drivesTitle" data-i18n="garage.drives"></h2><div id="driveList"></div></section>
    <section id="recent" class="section" aria-labelledby="recentTitle"><h2 id="recentTitle" data-i18n="garage.recent"></h2><div id="recentList"></div></section>
  </main>`],

  testdrive: ["testdrive", `
  <main id="main" tabindex="-1" class="container page">
    <h1 class="page-title" data-i18n="page.testdrive"></h1>
    <p class="lead" data-i18n="drive.intro"></p>
    <div id="driveView"></div>
  </main>`],
};

for (const [file, [page, main]] of Object.entries(PAGES)) {
  writeFileSync(new URL(`../${file}.html`, import.meta.url), head(page) + main + foot);
}
console.log("wrote", Object.keys(PAGES).length, "pages");
