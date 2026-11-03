// The Code Quest robot walks my contribution graph and eats every square, filling an XP bar.
// Usage: node scripts/eater.js <login> <out.svg>
// With GITHUB_TOKEN set (as in the Action) it uses the GraphQL API; without it, the public contributions page.
const fs = require("fs"), path = require("path");
const [, , LOGIN = "S9-nine", OUT = "dist/eater.svg"] = process.argv;

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
async function load() {
  if (process.env.GITHUB_TOKEN) {
    const q = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{weekday contributionLevel}}}}}}`;
    const r = await fetch("https://api.github.com/graphql", { method: "POST", headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: q, variables: { login: LOGIN } }) });
    const cal = (await r.json()).data.user.contributionsCollection.contributionCalendar;
    return { total: cal.totalContributions, weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ day: d.weekday, lv: LEVELS[d.contributionLevel] || 0 }))) };
  }
  const html = await (await fetch(`https://github.com/users/${LOGIN}/contributions`)).text();
  const weeks = [];
  for (const m of html.matchAll(/<td[^>]*id="contribution-day-component-(\d)-(\d+)"[^>]*>/g)) {
    const lv = +(m[0].match(/data-level="(\d)"/) || [0, 0])[1];
    (weeks[+m[2]] = weeks[+m[2]] || []).push({ day: +m[1], lv });
  }
  const total = +((html.match(/([\d,]+)\s+contributions?\s+in the last year/) || [0, "0"])[1].replace(/,/g, ""));
  return { total, weeks: weeks.filter(Boolean).map((w) => w.sort((a, b) => a.day - b.day)) };
}

/* A 5x7 pixel font, the same one as the banner. */
const F = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."], D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"], F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"], H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."], K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"], M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"], O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."], R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."], T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."], X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."], 1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"], 3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."], 5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."], 7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."], 9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."], "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "·": [".....", ".....", ".....", "..#..", ".....", ".....", "....."], "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."]
};
function text(str, x, y, s, fill, extra = "") {
  let d = "", cx = x;
  for (const ch of str.toUpperCase()) {
    (F[ch] || F[" "]).forEach((row, r) => { let c = 0; while (c < 5) { if (row[c] === "#") { let e = c; while (row[e + 1] === "#") e++; d += `M${cx + c * s} ${y + r * s}h${(e - c + 1) * s}v${s}h${-(e - c + 1) * s}z`; c = e + 1; } else c++; } });
    cx += 6 * s;
  }
  return `<path d="${d}" fill="${fill}"${extra}/>`;
}
const tw = (str, s) => str.length * 6 * s - s;

// The game's Robot hero.
const ROBOT = { rows: [".....kk.....", ".....ky.....", "..kkkkkkkk..", "..kggggggk..", "..kgcggcgk..", "..kggggggk..", "..kgkkkkgk..", "..kkkkkkkk..", ".kddddddddk.", ".kddryyrddk.", ".kddddddddk.", "..kk....kk.."],
  pal: { k: "#1a1c2c", y: "#ffcd75", r: "#b13e53", g: "#94b0c2", d: "#566c86", c: "#73eff7" } };

function render({ total, weeks }) {
  const PITCH = 16, CELL = 12, X0 = 56, Y0 = 84, W = 960, H = Y0 + 7 * PITCH + 34;
  const COL = ["#262b44", "#1e6b4f", "#38b764", "#79d76a", "#a7f070"];
  const STEP = 0.04, END = 2.6;
  // The robot zig-zags down one column and up the next, so every square gets visited.
  const route = [];
  weeks.forEach((w, wi) => { const days = wi % 2 ? [...w].reverse() : w; days.forEach((d) => route.push({ wi, ...d })); });
  const T = route.length * STEP + END;
  const at = (i) => +((i * STEP) / T).toFixed(5);
  const lit = route.map((r, i) => ({ ...r, i })).filter((r) => r.lv > 0);
  const cx = (r) => X0 + r.wi * PITCH, cy = (r) => Y0 + r.day * PITCH;

  let b = `<rect width="${W}" height="${H}" fill="#14152a"/>`;
  b += text("CONTRIBUTIONS", 32, 24, 3, "#ffcd75");
  b += text(`${total} IN THE LAST YEAR`, 32 + tw("CONTRIBUTIONS", 3) + 18, 31, 2, "#94b0c2");
  // XP bar, top right. It fills one notch per square eaten.
  const BX = 660, BW = 268, BY = 24;
  b += text("XP", BX - 34, BY + 4, 2, "#a7f070");
  b += `<rect x="${BX}" y="${BY}" width="${BW}" height="20" fill="#0b0c18"/><rect x="${BX}" y="${BY}" width="${BW}" height="20" fill="none" stroke="#566c86" stroke-width="3"/>`;
  const widths = ["0", ...lit.map((_, k) => (((k + 1) / lit.length) * (BW - 8)).toFixed(1))];
  const times = ["0", ...lit.map((r) => at(r.i))];
  b += `<rect x="${BX + 4}" y="${BY + 4}" height="12" width="0" fill="#a7f070">${lit.length ? `<animate attributeName="width" values="${widths.join(";")};0" keyTimes="${times.join(";")};${at(route.length + 50)}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/>` : ""}</rect>`;

  // The grid. Lit squares turn empty the moment the robot reaches them.
  route.forEach((r, i) => {
    const anim = r.lv ? `<animate attributeName="fill" values="${COL[r.lv]};${COL[0]};${COL[r.lv]}" keyTimes="0;${at(i)};${at(route.length + 50)}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/>` : "";
    b += `<rect x="${cx(r)}" y="${cy(r)}" width="${CELL}" height="${CELL}" fill="${COL[r.lv]}">${anim}</rect>`;
  });

  // The robot, centred on its square and standing a little above it. It hops in place while it walks.
  // A light rim (the silhouette nudged 2px each way) keeps the dark outline readable on the dark board.
  let spr = "", rim = "";
  ROBOT.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { spr += `<rect x="${x * 3}" y="${y * 3}" width="3" height="3" fill="${ROBOT.pal[ch]}"/>`; rim += `<rect x="${x * 3}" y="${y * 3}" width="3" height="3"/>`; } }));
  spr = [[-2, 0], [2, 0], [0, -2], [0, 2]].map(([dx, dy]) => `<g transform="translate(${dx} ${dy})" fill="#f4f4f4">${rim}</g>`).join("") + spr;
  const pos = route.map((r) => `${cx(r) + CELL / 2 - 18} ${cy(r) + CELL - 38}`);
  b += `<g><animateTransform attributeName="transform" type="translate" values="${pos.join(";")};${pos[pos.length - 1]}" keyTimes="${route.map((_, i) => at(i)).join(";")};1" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/><g class="hop">${spr}</g></g>`;

  // A "LEVEL CLEAR" stamp once the last square is gone.
  const msg = "LEVEL CLEAR!", mw = tw(msg, 4) + 40, mx = (W - mw) / 2, my = Y0 + 30;
  b += `<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;${at(route.length + 4)};${at(route.length + 54)}" dur="${T}s" calcMode="discrete" repeatCount="indefinite"/>`;
  b += `<rect x="${mx + 6}" y="${my + 6}" width="${mw}" height="52" fill="#0b0c18"/><rect x="${mx}" y="${my}" width="${mw}" height="52" fill="#38b764"/><rect x="${mx}" y="${my}" width="${mw}" height="52" fill="none" stroke="#a7f070" stroke-width="4"/>`;
  b += text(msg, mx + 20, my + 12, 4, "#1a1c2c") + `</g>`;
  b += text("MY COMMITS ARE THE ROBOT'S XP", 32, H - 22, 2, "#566c86");

  const label = `A pixel robot walks across ${LOGIN}'s contribution graph eating every square: ${total} contributions in the last year.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges" role="img" aria-label="${label}"><title>${label}</title><style>
.hop { animation: hop .32s steps(1) infinite; }
@keyframes hop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .hop { animation: none; } }</style>${b}</svg>`;
}

load().then((d) => {
  if (!d.weeks.length) throw new Error("no contribution data");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(d));
  console.log(`wrote ${OUT}: ${d.weeks.length} weeks, ${d.total} contributions`);
});
