// Downloads the car photos and writes js/photos.js.
// Run: node tools/commons.mjs   (needs Windows PowerShell for resizing)
//
// Two sources, never mixed for the same model:
// 1. OFFICIAL: Chevrolet Uzbekistan (chevrolet.uz, run by UzAuto Motors) for
//    the seven Chevrolets: Tracker, Onix, Cobalt, Damas, Tahoe, and from the
//    archived copy of the same site Gentra (Lacetti) and Malibu XL.
//    Its footer allows reuse with a link: "Sayt materiallaridan foydalanganda
//    havolani ko'rsatishingiz kerak" (when using site materials, show a link),
//    so every photo credit links to the model page. Kia (editorial use only),
//    BYD (written consent needed) and Chery (no terms) do not allow it.
// 2. PICKS: Wikimedia Commons for the other eight models.
//
// The photos were picked by eye on 2026-11-23 from contact sheets of every
// Commons photo of each model: daylight, mostly white or silver cars, the
// right generation for the cars sold in Uzbekistan. Every photo is free to
// use with credit (CC BY, CC BY-SA, CC0 or public domain); the credit and
// licence are shown under the photo on the car page.
//
// Missing (no usable free photo found): interior of the Tiggo 7 Pro,
// and a side view of the Sonet. Those galleries show fewer photos.
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// [model, view, Commons file name, object-position (optional)]
const PICKS = [
  ["equinox", "front", "2022 Chevrolet Equinox LT, front right, 08-07-2024.jpg"],
  ["equinox", "rear", "2018 Chevrolet Equinox AWD from Oregon.jpg"],
  ["equinox", "interior", "2023 Chevrolet Equinox interior.jpg"],
  ["chazor", "front", "BYD Qin Plus (秦Plus) DM-i facelift 01 China 2025-03-29.jpg"],
  ["chazor", "side", "BYD Qin Plus DM-i IMG001.jpg"],
  ["chazor", "interior", "BYD Qin Plus DM-i facelift 003.jpg"],
  ["songplus", "front", "2022 BYD Song Plus DM-i, front 8.3.23.jpg"],
  ["songplus", "side", "BYD SONG PLUS DM-I LEFT SIDE VIEW.jpg"],
  ["songplus", "interior", "BYD song plus front interior.jpg"],
  ["han", "front", "BYD Han EV 012.jpg"],
  ["han", "side", "BYD Han EV 20210214.jpg"],
  ["han", "interior", "2024 BYD Han EV interior.jpg"],
  ["sonet", "front", "2024 Kia Sonet Zenith (Colombia) front view.png"],
  ["sonet", "interior", null], // filled below: the long GIIAS 2026 file name
  ["k5", "front", "00 kia k5 3 3.jpg"],
  ["k5", "rear", "00 kia k5 3 5.jpg"],
  ["k5", "interior", "Kia K5 Hybrid DL3 HEV Martian Brown (2).jpg"],
  ["sportage", "front", "2023 Kia Sportage (NQ5) in White, front left.jpg"],
  ["sportage", "side", "00 Kia Sportage (NQ5) 1.jpg"],
  ["sportage", "interior", "Kia Sportage NQ5 Black Interior (3).jpg"],
  ["tiggo7", "front", "2024 Chery Tiggo 7 Pro, Pakuwon Trade Center, West Surabaya.jpg"],
  ["tiggo7", "side", "Moscow, Chery Tiggo 7 promax white, Sept 2025 03.jpg"],
];
// [model, view, path under chevrolet.uz/assets/images/, model page, object-position (optional)]
// The gallery photos are 1520 x 627; cards crop them to 4:3, so pos keeps the car in frame.
const OFFICIAL = [
  ["tracker", "front", "tracker/big/exterior/02.jpg", "https://chevrolet.uz/tracker"],
  ["tracker", "other", "tracker/big/exterior/03.jpg", "https://chevrolet.uz/tracker"],
  ["tracker", "interior", "tracker/big/interior/08.jpg", "https://chevrolet.uz/tracker"],
  ["onix", "front", "onix/big/exterior/03.jpg", "https://chevrolet.uz/onix"],
  ["onix", "side", "onix/big/exterior/07.jpg", "https://chevrolet.uz/onix"],
  ["onix", "interior", "onix/big/interior/03.jpg", "https://chevrolet.uz/onix"],
  // Cobalt: the same official gallery style as the other models (blue car at a glass front)
  ["cobalt", "front", "https://web.archive.org/web/2026id_/https://chevrolet.uz/assets/images/cobalt2025/gallery/big/exterior/5.jpg", "https://chevrolet.uz/new/cobalt", "74% 50%"],
  ["cobalt", "front", "https://web.archive.org/web/2026id_/https://chevrolet.uz/assets/images/cobalt2025/gallery/big/exterior/4.jpg", "https://chevrolet.uz/new/cobalt"],
  ["cobalt", "interior", "https://web.archive.org/web/2026id_/https://chevrolet.uz/assets/images/cobalt2025/gallery/big/interior/2.jpg", "https://chevrolet.uz/new/cobalt"],
  // Gentra (sold as Lacetti since 2023) and Malibu XL are gone from chevrolet.uz; their
  // official galleries are taken from the Internet Archive copy of the same site
  ["gentra", "front", "https://web.archive.org/web/20260314203544id_/https://chevrolet.uz/assets/images/lacetti/exterior/1.jpg", "https://web.archive.org/web/20260314203544/https://www.chevrolet.uz/lacetti"],
  ["gentra", "side", "https://web.archive.org/web/20260314203544id_/https://chevrolet.uz/assets/images/lacetti/big/exterior/12.jpg", "https://web.archive.org/web/20260314203544/https://www.chevrolet.uz/lacetti"],
  ["gentra", "interior", "https://web.archive.org/web/20260314203544id_/https://chevrolet.uz/assets/images/lacetti/big/interior/01.jpg", "https://web.archive.org/web/20260314203544/https://www.chevrolet.uz/lacetti"],
  ["malibu", "front", "https://web.archive.org/web/2024id_/https://chevrolet.uz/assets/images/malibu-xl/exterior/one.jpg", "https://web.archive.org/web/2023/https://chevrolet.uz/malibu-xl"],
  ["malibu", "rear", "https://web.archive.org/web/2024id_/https://chevrolet.uz/assets/images/malibu-xl/big/exterior/3.jpg", "https://web.archive.org/web/2023/https://chevrolet.uz/malibu-xl"],
  ["malibu", "interior", "https://web.archive.org/web/2024id_/https://chevrolet.uz/assets/images/malibu-xl/interior/one.jpg", "https://web.archive.org/web/2023/https://chevrolet.uz/malibu-xl"],
  ["damas", "front", "damas/big/exterior/02.jpg", "https://chevrolet.uz/damas", "18% 50%"],
  ["damas", "rear", "damas/big/exterior/03.jpg", "https://chevrolet.uz/damas"],
  ["damas", "interior", "damas/big/interior/01.jpg", "https://chevrolet.uz/damas"],
  ["tahoe", "front", "new-car/big/exterior/1.jpg", "https://chevrolet.uz/2025/tahoe"],
  ["tahoe", "interior", "new-car/big/interior/2.jpg", "https://chevrolet.uz/2025/tahoe"],
  ["tahoe", "seats", "new-car/big/interior/3.jpg", "https://chevrolet.uz/2025/tahoe"],
];
const SONET_INTERIOR_PREFIX = "Front row of Kia New Sonet as seen from the right during GIIAS 2026";

const NAMES = { damas: "Chevrolet Damas", cobalt: "Chevrolet Cobalt", onix: "Chevrolet Onix", gentra: "Chevrolet Gentra", tracker: "Chevrolet Tracker", malibu: "Chevrolet Malibu", equinox: "Chevrolet Equinox", tahoe: "Chevrolet Tahoe", chazor: "BYD Chazor", songplus: "BYD Song Plus", han: "BYD Han EV", sonet: "Kia Sonet", k5: "Kia K5", sportage: "Kia Sportage", tiggo7: "Chery Tiggo 7 Pro" };
const ALT = {
  front: { en: "{n}, front three-quarter view", ru: "{n}, вид спереди сбоку", uz: "{n}, old va yon tomondan ko'rinish" },
  side: { en: "{n}, side view", ru: "{n}, вид сбоку", uz: "{n}, yon tomondan ko'rinish" },
  rear: { en: "{n}, rear three-quarter view", ru: "{n}, вид сзади сбоку", uz: "{n}, orqa va yon tomondan ko'rinish" },
  interior: { en: "{n}, interior: dashboard and front seats", ru: "{n}, салон: передняя панель и передние сиденья", uz: "{n}, salon: old panel va old o'rindiqlar" },
  seats: { en: "{n}, interior: front seats", ru: "{n}, салон: передние сиденья", uz: "{n}, salon: old o'rindiqlar" },
  other: { en: "{n}, front three-quarter view from above", ru: "{n}, вид спереди сверху", uz: "{n}, old tomondan yuqoridan ko'rinish" },
};
const WIDTHS = [640, 1024, 1600];
const OFFICIAL_WIDTHS = [640, 1024, 1520, 1600]; // gallery photos are 1520 px wide, launch photos 1903 px
const UA = { "User-Agent": "MotoraDemoPhotoPicker/1.0 (course project)" };
const root = fileURLToPath(new URL("..", import.meta.url));
const dir = root + "assets/photos/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const u = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params });
  for (let i = 0; i < 6; i++) {
    await sleep(1200);
    const s = await (await fetch(u, { headers: UA })).text();
    if (s.startsWith("{")) return JSON.parse(s);
    await sleep(5000 * (i + 1));
  }
  throw new Error("Commons API failed");
}
// author names that come out messy from the Commons HTML
const AUTHOR = { "Chevrolet Damas Deluxe in Bukhara, front right.jpg": "Ilya Plekhanov, edited by Mr.choppers" };
const strip = (html) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

mkdirSync(dir, { recursive: true });
if (!PICKS.find((p) => p[0] === "sonet" && p[1] === "interior")[2]) {
  const s = await api({ action: "query", list: "search", srnamespace: 6, srsearch: SONET_INTERIOR_PREFIX, srlimit: 5 });
  PICKS.find((p) => p[0] === "sonet" && p[1] === "interior")[2] = s.query.search[0].title.replace(/^File:/, "");
}

const PHOTOS = {};
const altFor = (model, view) => Object.fromEntries(["en", "ru", "uz"].map((l) => [l, ALT[view][l].replace("{n}", NAMES[model])]));

// 1. official Chevrolet Uzbekistan photos
for (const [model, view, path, page, pos] of OFFICIAL) {
  const n = (PHOTOS[model] || []).length + 1;
  const base = `${model}-uz-${n}`;
  if (!existsSync(dir + `${base}-640.jpg`)) {
    const url = path.startsWith("https://") ? path : "https://chevrolet.uz/assets/images/" + path;
    let r;
    for (let k = 0; k < 4; k++) { r = await fetch(url, { headers: UA }); if (r.ok) break; await sleep(5000); }
    if (!r.ok) throw new Error(`download failed (${r.status}): ${path}`);
    writeFileSync(dir + base + "-src", Buffer.from(await r.arrayBuffer()));
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", root + "tools/resize.ps1", "-src", dir + base + "-src", "-base", dir + base, "-widths", OFFICIAL_WIDTHS.join(",")], { stdio: "inherit" });
    if (existsSync(dir + `${base}-1600.jpg`)) unlinkSync(dir + `${base}-1520.jpg`);
  }
  (PHOTOS[model] ||= []).push({
    view: { seats: "interior", other: "front" }[view] || view, // thumbnail label; the alt text keeps the detail
    // keep the sizes that exist (resize never upscales); 1520 is dropped when 1600 exists
    sizes: OFFICIAL_WIDTHS.filter((w) => existsSync(dir + `${base}-${w}.jpg`) && !(w === 1520 && existsSync(dir + `${base}-1600.jpg`)))
      .map((w) => [w, `assets/photos/${base}-${w}.jpg`]),
    alt: altFor(model, view),
    ...(pos ? { pos } : {}),
    credit: { author: "Chevrolet Uzbekistan (UzAuto Motors)", license: "", licenseUrl: "", page, site: page.includes("web.archive.org") ? "chevrolet.uz (Internet Archive copy)" : "chevrolet.uz" },
  });
  console.log(model, view, "ok (official)");
}

// 2. Wikimedia Commons photos
for (const [model, view, file, pos] of PICKS) {
  const j = await api({ action: "query", titles: "File:" + file, prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: 1600, iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl" });
  const page = Object.values(j.query.pages)[0];
  const info = page.imageinfo[0];
  const m = info.extmetadata;
  const base = `${model}-${view}`;
  const src = dir + base + "-src";
  // always a Commons thumbnail: the original files are rate-limited (429)
  const tw = info.width > 1920 ? 1920 : 1280; // Commons only serves standard thumbnail widths
  if (!existsSync(dir + `${base}-640.jpg`)) {
    const orig = info.url.split("?")[0], name = orig.split("/").pop();
    const url = orig.replace("upload.wikimedia.org/wikipedia/commons/", "thumb.wikimedia.org/wikipedia/commons/thumb/") + `/${tw}px-${name}`;
    let r;
    for (let k = 0; k < 5; k++) {
      r = await fetch(url, { headers: UA });
      if (r.ok) break;
      await sleep(10000 * (k + 1)); // Commons asks bots to slow down (429)
    }
    if (!r.ok) throw new Error(`download failed (${r.status}): ${file}`);
    writeFileSync(src, Buffer.from(await r.arrayBuffer()));
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", root + "tools/resize.ps1", "-src", src, "-base", dir + base, "-widths", WIDTHS.join(",")], { stdio: "inherit" });
  }
  const alt = altFor(model, view);
  (PHOTOS[model] ||= []).push({
    view,
    sizes: WIDTHS.filter((w) => w <= tw || w === WIDTHS[0]).map((w) => [w, `assets/photos/${base}-${w}.jpg`]),
    alt,
    ...(pos ? { pos } : {}),
    credit: { author: AUTHOR[file] || strip(m.Artist?.value) || "Unknown", license: m.LicenseShortName?.value || "", licenseUrl: m.LicenseUrl?.value || "", page: info.descriptionurl, site: "Wikimedia Commons" },
  });
  console.log(model, view, "ok");
}

writeFileSync(root + "js/photos.js",
  "/* Car photos (Chevrolet Uzbekistan and Wikimedia Commons), written by tools/commons.mjs.\n   PHOTOS[model] = [{ view, sizes: [[width, file]…], alt: {en, ru, uz}, credit }] */\n" +
  "window.PHOTOS = " + JSON.stringify(PHOTOS, null, 1) + ";\n");
console.log("wrote js/photos.js");
