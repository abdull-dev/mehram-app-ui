/**
 * Generates `src/utils/countryGrid.ts` — the offline coordinates → country
 * lookup used by "Use my location".
 *
 *   node scripts/build-country-grid.mjs
 *
 * Why a generated grid at all: the app needs a country from a GPS fix without a
 * network, and the two obvious offline sources are both unusable.
 *
 *   - Country centroids (`country-state-city`'s country.json) put London in
 *     Guernsey, Toronto in the United States, Delhi in Nepal and New York in
 *     Bermuda.
 *   - The nearest city out of that library's `city.json` is accurate, but the
 *     file is 8MB and 148,038 rows; loading and scanning it froze the JS thread
 *     for seconds, with the spinner stuck on screen.
 *
 * So the city data is reduced ahead of time to one country per quarter-degree
 * cell: 42,776 cells, ~93KB encoded, 99% agreement with what a full
 * nearest-city scan of the same data would answer, and a lookup that costs a
 * string decode once and a map read after that.
 *
 * Each cell goes to the country whose nearest city to the cell centre is
 * closest, rather than the country with the most cities in it — otherwise small
 * countries lose every cell they share with a large neighbour.
 *
 * Countries with no cities in the dataset (Monaco, Hong Kong, Gibraltar, Macau,
 * Vatican City) cannot be produced by this grid, exactly as they could not be
 * produced by scanning the cities directly. Their neighbour is returned and the
 * user picks from the list.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const cities = require('country-state-city/lib/assets/city.json');

/** Cell size in degrees. Quarter-degree is ~28km at the equator. */
const STEP = 0.25;
const COLUMNS = Math.round(360 / STEP);
const ROWS = Math.round(180 / STEP);

const candidates = new Map(); // cell key -> Map(iso2 -> squared degrees to centre)

for (const row of cities) {
  const lat = +row[3];
  const lng = +row[4];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

  const gy = Math.min(Math.max(Math.floor((lat + 90) / STEP), 0), ROWS - 1);
  const gx = ((Math.floor((lng + 180) / STEP) % COLUMNS) + COLUMNS) % COLUMNS;
  const key = gy * COLUMNS + gx;

  const centreLat = gy * STEP - 90 + STEP / 2;
  const centreLng = gx * STEP - 180 + STEP / 2;
  const distance = (lat - centreLat) ** 2 + (lng - centreLng) ** 2;

  let cell = candidates.get(key);
  if (!cell) {
    cell = new Map();
    candidates.set(key, cell);
  }
  const best = cell.get(row[1]);
  if (best === undefined || distance < best) cell.set(row[1], distance);
}

const grid = new Map();
for (const [key, cell] of candidates) {
  let winner = null;
  for (const [iso2, distance] of cell) {
    if (!winner || distance < winner[1]) winner = [iso2, distance];
  }
  grid.set(key, winner[0]);
}

/**
 * One group per country: its two-letter code followed by its cell keys as
 * base-36 deltas. Deltas because neighbouring cells differ by small numbers,
 * which is most of the file's size.
 */
function encode() {
  const byCountry = new Map();
  for (const [key, iso2] of [...grid].sort((a, b) => a[0] - b[0])) {
    if (!byCountry.has(iso2)) byCountry.set(iso2, []);
    byCountry.get(iso2).push(key);
  }
  const groups = [];
  for (const [iso2, keys] of byCountry) {
    let previous = 0;
    const deltas = keys.map(key => {
      const delta = key - previous;
      previous = key;
      return delta.toString(36);
    });
    groups.push(iso2 + deltas.join('.'));
  }
  return groups.join(';');
}

const encoded = encode();
const countries = new Set(grid.values()).size;

/** How far the lookup searches outwards when a fix's own cell is empty. */
const RINGS = 10;
const RINGS_KM = Math.round(RINGS * STEP * 111);

const file = `/**
 * Coordinates → country, offline. GENERATED FILE — do not edit.
 *
 * Rebuild with \`node scripts/build-country-grid.mjs\`, which explains where the
 * data comes from and why the app does not just scan the city dataset instead.
 *
 * ${grid.size} quarter-degree cells covering ${countries} countries, derived from
 * \`country-state-city\`'s city list. A lookup decodes the table once (a few ms)
 * and is a map read after that — the scan it replaces cost seconds and 8MB.
 */
import { Coords } from './geo';

/** Cell size in degrees, and the grid dimensions that follow from it. */
const STEP = ${STEP};
const COLUMNS = ${COLUMNS};
const ROWS = ${ROWS};

/**
 * How far out to look when the fix's own cell is empty — open water, desert, or
 * anywhere else without a named place nearby. ${RINGS} rings of quarter-degree
 * cells reach roughly ${RINGS_KM}km.
 */
const RINGS = ${RINGS};

/** Country code per cell: \`<iso2><base-36 key deltas>\`, groups split by \`;\`. */
const ENCODED =
  '${encoded}';

let grid: Map<number, string> | null = null;

function table(): Map<number, string> {
  if (grid) return grid;
  const decoded = new Map<number, string>();
  for (const group of ENCODED.split(';')) {
    const iso2 = group.slice(0, 2);
    let key = 0;
    for (const delta of group.slice(2).split('.')) {
      key += parseInt(delta, 36);
      decoded.set(key, iso2);
    }
  }
  grid = decoded;
  return grid;
}

/**
 * The ISO-2 code of the country at these coordinates, or null if there is no
 * populated place within ~${RINGS_KM}km — mid-ocean, and nowhere a phone reports from.
 *
 * Cells are searched outwards from the fix, nearest first, so a coastal or rural
 * position resolves to the country it is actually closest to.
 */
export function countryAt(coords: Coords): string | null {
  const cells = table();
  const gy0 = Math.floor((coords.latitude + 90) / STEP);
  const gx0 = Math.floor((coords.longitude + 180) / STEP);

  for (let ring = 0; ring <= RINGS; ring++) {
    let nearest: { iso2: string; distance: number } | null = null;

    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        // Only the ring's edge is new; its inside was searched already.
        if (ring > 0 && Math.abs(dy) !== ring && Math.abs(dx) !== ring) continue;

        const gy = gy0 + dy;
        if (gy < 0 || gy >= ROWS) continue;
        const gx = (((gx0 + dx) % COLUMNS) + COLUMNS) % COLUMNS;

        const iso2 = cells.get(gy * COLUMNS + gx);
        if (!iso2) continue;

        const distance = dy * dy + dx * dx;
        if (!nearest || distance < nearest.distance) nearest = { iso2, distance };
      }
    }

    if (nearest) return nearest.iso2;
  }

  return null;
}
`;

const out = path.join(here, '..', 'src', 'utils', 'countryGrid.ts');
writeFileSync(out, file);
console.log(
  `wrote ${out}: ${grid.size} cells, ${countries} countries, ${(encoded.length / 1024).toFixed(0)}KB encoded`,
);
