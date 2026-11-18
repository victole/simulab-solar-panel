// node check.mjs — quick model checks; exits 1 if any fails
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const M = new Function('clamp', 'lerp', 'dot3', 'sub3', readFileSync(join(here, 'model.js'), 'utf8') + '; return { pvBest, pvParseCSV, pvDiagnose, pvSimExport };')(clamp, lerp, dot3, sub3);
const ok = (name, cond, got) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}: ${got}`); if (!cond) process.exitCode = 1; };
ok('37.3° S best tilt ≈ 33°', Math.abs(M.pvBest(-37.3).tilt - 33) <= 1, M.pvBest(-37.3).tilt);
ok('Madrid best tilt ≈ 36°', Math.abs(M.pvBest(40.4).tilt - 36) <= 1, M.pvBest(40.4).tilt);
const sim = JSON.parse(readFileSync(join(here, 'data/simulado-verdad.json'), 'utf8')), truth = sim.verdad;
const near = (d) => Math.abs(d.tilt - truth.tilt) <= 3 && Math.abs(d.azi - truth.azi) <= 3;
for (const f of ['simulado-2026-11.csv', 'prueba-formato-2.csv']) {
  const d = M.pvDiagnose(M.pvParseCSV(readFileSync(join(here, 'data', f), 'utf8')), sim.sitio);
  ok(`${f} diagnosis ±3° of truth`, near(d), `${d.tilt}° / ${d.azi}°`);
}
// the app simulates the viewer's own location: the diagnosis must work in the north too
const madrid = { lat: 40.4, lon: -3.7, utc: 1 }, d = M.pvDiagnose(M.pvParseCSV(M.pvSimExport(madrid).csv), madrid);
ok('simulated export at Madrid, diagnosis ±3°', near(d), `${d.tilt}° / ${d.azi}°`);
