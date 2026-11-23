// MOTORA wordmark (2026-11-23, from the design brief): uppercase Manrope
// ExtraBold, condensed to 88% width, with a custom A: a flat-topped arch
// and a crossbar that floats free of the legs, in the accent colour.
// Outlines only, so no font is needed to show it.
// Run:  npm i opentype.js && node tools/logo.cjs
const fs = require("fs");
const opentype = require("opentype.js");
const ROOT = __dirname + "/../";
const font = opentype.loadSync(__dirname + "/fonts/manrope800.ttf"); // Manrope ExtraBold, SIL Open Font License

const CAP = 26;                 // cap height in px inside a 40 px tall box
const BOX = 40;
const scale = CAP / font.tables.os2.sCapHeight;
const SIZE = font.unitsPerEm * scale;
const BASE = (BOX + CAP) / 2;   // baseline: the letters sit in the middle
const SQUEEZE = 0.88;           // "slightly condensed"
const TRACK = 0.07 * SIZE;      // letter-spacing
const r2 = (n) => Math.round(n * 100) / 100;

// one glyph as path data, squeezed horizontally around its left edge
function glyph(ch, x) {
  const g = font.charToGlyph(ch);
  const path = g.getPath(0, BASE, SIZE);
  const sx = (v) => r2(x + v * SQUEEZE);
  const d = path.commands.map((c) => {
    if (c.type === "M" || c.type === "L") return `${c.type}${sx(c.x)} ${r2(c.y)}`;
    if (c.type === "Q") return `Q${sx(c.x1)} ${r2(c.y1)} ${sx(c.x)} ${r2(c.y)}`;
    if (c.type === "C") return `C${sx(c.x1)} ${r2(c.y1)} ${sx(c.x2)} ${r2(c.y2)} ${sx(c.x)} ${r2(c.y)}`;
    return "Z";
  }).join("");
  return { d, width: g.advanceWidth * scale * SQUEEZE, left: g.getBoundingBox().x1 * scale * SQUEEZE };
}

// the custom A: legs with a flat top, and a separate crossbar
function letterA(x) {
  const stem = 272 * scale * SQUEEZE;     // Manrope's stem width (T), squeezed
  const W = 1560 * scale * SQUEEZE;       // wider than Manrope's A, so the bar has room
  const H = CAP;
  const top = BASE - H;
  const a = stem * 0.35;                  // half of the flat top
  const d = stem * 1.0;                   // width of each foot
  // inner edges run parallel to the outer ones
  const innerTop = H * (W / 2 - d) / (W / 2 - a);
  const legs = `M${r2(x)} ${r2(BASE)}L${r2(x + W / 2 - a)} ${r2(top)}L${r2(x + W / 2 + a)} ${r2(top)}L${r2(x + W)} ${r2(BASE)}` +
    `L${r2(x + W - d)} ${r2(BASE)}L${r2(x + W / 2)} ${r2(BASE - innerTop)}L${r2(x + d)} ${r2(BASE)}Z`;
  // the crossbar: between the inner edges, with a small gap on each side
  const barLow = H * 0.14, barHigh = H * 0.3, gap = W * 0.045;
  const innerX = (h) => d + h * (W / 2 - d) / innerTop; // inner left edge at height h
  const xl = x + innerX(barHigh) + gap, xr = x + W - innerX(barHigh) - gap;
  const bar = `M${r2(xl)} ${r2(BASE - barLow)}L${r2(xr)} ${r2(BASE - barLow)}L${r2(xr)} ${r2(BASE - barHigh)}L${r2(xl)} ${r2(BASE - barHigh)}Z`;
  return { legs, bar, width: W };
}

// lay out M O T O R + custom A
let x = 2, word = "";
for (const ch of "MOTOR") {
  const g = glyph(ch, x - (ch === "M" ? 0 : 0));
  word += g.d;
  x += g.width + TRACK;
}
const A = letterA(x + 4 * scale);
word += A.legs;
const W = Math.ceil(x + 4 * scale + A.width + 2);

const C = {
  light: { ink: "#202822", accent: "#A58A51" },
  dark: { ink: "#F0F1E9", accent: "#C4AA70" },
  mono: { ink: "#202822", accent: "#202822" },
};
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="MOTORA">\n  ${body}\n</svg>\n`;
const lockup = (c) => svg(W, BOX, `<path d="${word}" fill="${c.ink}"/>\n  <path d="${A.bar}" fill="${c.accent}"/>`);
// the symbol: the custom A alone, for the favicon
const symA = letterA(0);
const sym = (c, bg) => svg(40, 40, `${bg ? `<rect width="40" height="40" rx="8" fill="${bg}"/>\n  ` : ""}<g transform="translate(${r2(20 - symA.width / 2)} 1)"><path d="${symA.legs}" fill="${c.ink}"/><path d="${symA.bar}" fill="${c.accent}"/></g>`);

fs.mkdirSync(ROOT + "assets/brand", { recursive: true });
const files = {
  "motora-logo.svg": lockup(C.light),
  "motora-logo-dark.svg": lockup(C.dark),
  "motora-logo-mono.svg": lockup(C.mono),
  "motora-symbol.svg": sym(C.light),
  "motora-symbol-dark.svg": sym(C.dark),
  "motora-favicon.svg": sym(C.light, "#F2F2EE"),
};
for (const [n, s] of Object.entries(files)) fs.writeFileSync(ROOT + "assets/brand/" + n, s);
fs.writeFileSync(ROOT + "js/logo.js", `/* The MOTORA wordmark, drawn inline so it takes the theme colours: Manrope
   ExtraBold outlines, condensed, with a custom A whose crossbar floats in the
   accent colour. Made by tools/logo.cjs; assets/brand has the same logo as files. */
window.LOGO = { width: ${W}, height: ${BOX}, word: ${JSON.stringify(word)}, bar: ${JSON.stringify(A.bar)} };
`);
console.log("width", W);
