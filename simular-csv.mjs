// node simular-csv.mjs  ->  data/simulado-2026-11.csv, data/prueba-formato-2.csv, data/simulado-verdad.json
// A SIMULATED inverter export (model.js pvSimExport) for an example site, so check.mjs can test the diagnosis
// against a known truth. The app makes the same export for the viewer's own location.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const M = new Function('clamp', 'lerp', 'dot3', 'sub3', readFileSync(join(here, 'model.js'), 'utf8') + '; return { pvSimExport, PV_SIM };')(clamp, lerp, dot3, sub3);

export const SITE = { lat: -37.3, lon: -59.1, utc: -3 };   // example site, the same one the guided video uses
const { csv, days } = M.pvSimExport(SITE), rows = csv.split('\n');
const out = join(here, 'data'); mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'simulado-2026-11.csv'), csv + '\n');
// the same data in another common export shape, to test the reader: ; separator, decimal comma, DD/MM/YYYY, watts
const alt = ['Hora;Potencia activa (W);Energía diaria (kWh)', ...rows.slice(1).map(r => { const [ts, p, e] = r.split(','); const [d, t] = ts.split(' '), [y, mo, dd] = d.split('-'); return `${dd}/${mo}/${y} ${t};${Math.round(p * 1000)};${e.replace('.', ',')}`; })];
writeFileSync(join(out, 'prueba-formato-2.csv'), alt.join('\r\n') + '\r\n');
writeFileSync(join(out, 'simulado-verdad.json'), JSON.stringify({ aviso: 'DATOS SIMULADOS, no son de un inversor real', sitio: SITE, planta: M.PV_SIM.plant, verdad: M.PV_SIM.truth, dias: days }, null, 2) + '\n');
console.log(rows.length - 1, 'filas;', days.map(x => `${x.fecha.slice(8)}:${x.kWh}kWh/${Math.round(x.nubes * 100)}%`).join(' '));
