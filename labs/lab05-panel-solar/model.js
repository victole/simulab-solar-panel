// ---------------------------------------------------------------------------
// Lab 05 · Panel solar. Clear-sky sunlight on a tilted panel at latitude `lat`, tilt `tilt` and
// `azi` (degrees turned away from the equator: 0 = facing the equator, 180 = facing the pole).
// Data and assumptions: demo.json note.
// ---------------------------------------------------------------------------
const PV = {
  I0: 1.353,          // kW/m², solar constant used by Meinel & Meinel (PVEducation, "Air Mass")
  k: 0.7, e: 0.678,   // DNI = 1.353 · 0.7^(AM^0.678) (Meinel & Meinel 1976, via PVEducation)
  dif: 0.10,          // clear-sky diffuse ≈ 10 % of direct (PVEducation)
  albedo: 0.20,       // ground reflectance (typical grass/soil, assumption)
  dStep: 4, hStep: 0.25, // integration: every 4th day, every 15 min
};
const DEG = Math.PI / 180;
// declination (Cooper 1969), degrees, day of year n
const pvDecl = (n) => 23.45 * Math.sin(DEG * 360 * (284 + n) / 365);
// sun unit vector in ENU (east, north, up) at latitude lat, day n, solar hour h
function pvSun(lat, n, h) {
  const f = lat * DEG, d = pvDecl(n) * DEG, w = 15 * (h - 12) * DEG;
  return [-Math.cos(d) * Math.sin(w), Math.cos(f) * Math.sin(d) - Math.sin(f) * Math.cos(d) * Math.cos(w), Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(w)];
}
// sunrise/sunset solar hours (sunrise equation)
function pvDay(lat, n) {
  const x = -Math.tan(lat * DEG) * Math.tan(pvDecl(n) * DEG), w = Math.acos(clamp(x, -1, 1)) / DEG / 15;
  return [12 - w, 12 + w];
}
// horizontal direction the panel faces, ENU: equator rotated `azi` degrees toward the west
function pvFacing(lat, azi) { const s = lat >= 0 ? -1 : 1, a = azi * DEG; return [-Math.sin(a), s * Math.cos(a), 0]; }
function pvNormal(lat, tilt, azi) { const f = pvFacing(lat, azi), b = tilt * DEG; return [f[0] * Math.sin(b), f[1] * Math.sin(b), Math.cos(b)]; }
// air mass (Kasten & Young 1989), zenith from the up component
function pvAM(up) { const z = Math.acos(clamp(up, -1, 1)) / DEG; return 1 / (Math.cos(z * DEG) + 0.50572 * Math.pow(96.07995 - z, -1.6364)); }
// environment: cloud = average cloud cover 0..1, tree = tree height in metres (0 = none),
// tx, ty = tree trunk position in metres east / north of the panel centre
const PV_ENV0 = { cloud: 0, tree: 0, tx: 0, ty: 0 };
const PV_SCENE = { unit: 0.4, panelZ: 6.8, W: 5.6, L: 3.6 }; // 1 scene unit = 0.4 m; panel 5.6 × 3.6 m, centre 6.8 m up
// tree crown as a sphere: centre at 0.65 H, radius 0.35 H (assumption)
const pvTreeCrown = (H, tx, ty) => ({ c: [tx, ty, 0.65 * H], r: 0.35 * H });
// 4 × 3 sample points on the panel face, ENU metres (cached per orientation)
const _pvPts = {};
function pvPanelPts(lat, tilt, azi) {
  const k = `${lat >= 0}|${tilt}|${azi}`; if (_pvPts[k]) return _pvPts[k];
  const f = pvFacing(lat, azi), b = tilt * DEG, d = [-f[0] * Math.cos(b), -f[1] * Math.cos(b), Math.sin(b)], u = [-f[1], f[0], 0], out = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const a = ((i + 0.5) / 4 - 0.5) * PV_SCENE.W, e = ((j + 0.5) / 3 - 0.5) * PV_SCENE.L; out.push([u[0] * a + d[0] * e, u[1] * a + d[1] * e, PV_SCENE.panelZ + d[2] * e]); }
  return (_pvPts[k] = out);
}
// share of the panel (0..1) whose line to the sun crosses the crown
function pvShadeFrac(lat, tilt, azi, env, s) {
  if (!env.tree) return 0;
  const T = pvTreeCrown(env.tree, env.tx, env.ty), pts = pvPanelPts(lat, tilt, azi); let n = 0;
  for (const p of pts) { const d = sub3(T.c, p), t = dot3(d, s); if (t > 0 && dot3(d, d) - t * t < T.r * T.r) n++; }
  return n / pts.length;
}
// sunlight on the panel now, kW/m²: beam + isotropic diffuse + ground reflection.
// Clouds: GHI × (1 - 0.75 C^3.4) (Kasten & Czeplak 1980); diffuse share grows d0 + (1 - d0) C² (assumption, same shape).
// Tree: the beam is cut in proportion to the shaded share of the panel (assumption: no bypass-diode losses).
function pvAt(lat, tilt, azi, n, h, env = PV_ENV0) {
  const s = pvSun(lat, n, h), N = pvNormal(lat, tilt, azi), b = tilt * DEG;
  if (s[2] <= 0) return { s, N, up: s[2], cos: 0, dni: 0, poa: 0, beam: 0, shade: 0 };
  const dni0 = PV.I0 * Math.pow(PV.k, Math.pow(pvAM(s[2]), PV.e)), cos = Math.max(0, dot3(s, N));
  const ghi0 = dni0 * s[2] + PV.dif * dni0, d0 = PV.dif * dni0 / ghi0, C = env.cloud || 0;
  const ghi = ghi0 * (1 - 0.75 * Math.pow(C, 3.4)), dhi = ghi * (d0 + (1 - d0) * C * C), dni = (ghi - dhi) / s[2];
  const shade = cos > 0 ? pvShadeFrac(lat, tilt, azi, env, s) : 0, beam = dni * cos * (1 - shade);
  const poa = beam + dhi * (1 + Math.cos(b)) / 2 + PV.albedo * ghi * (1 - Math.cos(b)) / 2;
  return { s, N, up: s[2], cos, dni, poa, beam, shade, theta: Math.acos(dot3(s, N)) / DEG };
}
const pvEnvKey = (env) => { const e = env || PV_ENV0; return `${e.cloud || 0}|${e.tree || 0}|${e.tree ? e.tx + ',' + e.ty : 0}`; };
// one day, kWh/m²
function pvDayE(lat, tilt, azi, n, env) { let e = 0; for (let h = 0; h < 24; h += PV.hStep) e += pvAt(lat, tilt, azi, n, h + PV.hStep / 2, env).poa * PV.hStep; return e; }
// one year, kWh/m², cached
const _pvY = {};
function pvYear(lat, tilt, azi, env) {
  const k = `${lat}|${tilt}|${azi}|${pvEnvKey(env)}`; if (_pvY[k] != null) return _pvY[k];
  let e = 0; for (let n = 1; n <= 365; n += PV.dStep) e += pvDayE(lat, tilt, azi, n, env) * PV.dStep;
  return (_pvY[k] = e * 365 / (Math.ceil(365 / PV.dStep) * PV.dStep));
}
// best tilt facing the equator under the same clouds and tree: 3° search, then 1° around it; cached
const _pvB = {};
function pvBest(lat, env) {
  const key = `${lat}|${pvEnvKey(env)}`; if (_pvB[key]) return _pvB[key];
  let best = { tilt: 0, E: 0 };
  const tryT = (t) => { if (t < 0 || t > 90) return; const E = pvYear(lat, t, 0, env); if (E > best.E) best = { tilt: t, E }; };
  for (let t = 0; t <= 90; t += 3) tryT(t);
  const c = best.tilt; for (let t = c - 2; t <= c + 2; t++) tryT(t);
  return (_pvB[key] = best);
}
// clock time from solar time: solar = clock + (4 (lon - 15 utc) + EoT) / 60 min (PVEducation, "Solar Time")
function pvEoT(n) { const B = DEG * 360 * (n - 81) / 364; return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); }
const pvClock = (h, n, lon, utc) => h - (4 * (lon - 15 * utc) + pvEoT(n)) / 60;
// share of the best, 0..1, and verdict
const PV_RES = [
  [0.85, 'PIERDES MUCHO', 'coral'],
  [0.95, 'ACEPTABLE', 'amber'],
  [9, 'EXCELENTE', 'lime'],
];
function pvShare(lat, tilt, azi, env) { return pvYear(lat, tilt, azi, env) / pvBest(lat, env).E; }
const pvVeredicto = (f) => PV_RES.find(r => f < r[0]);
// the three days the lab sweeps: winter solstice, equinox, summer solstice (northern names)
const PV_DAYS = [[355, '21 DIC'], [80, '21 MAR'], [172, '21 JUN']];

// ---- cloud field (live view and the simulated CSV) ------------------------------------------------------
// Flat cloud disks at PV_CLOUD.z metres drifting with the wind over a PV_CLOUD.size square that wraps around.
// Cover C (0..1) sets how many there are. Assumption: drawn 22 m up so they fit the scene; real clouds sit at
// 1-2 km, but the shadow is the same projection along the sun ray, only farther away.
const PV_CLOUD = { z: 22, size: 60, wind: [1.4, 0.5], r0: 2.6, r1: 4.6, seed: 7 };
function pvRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const _pvCF = {};
function pvCloudBase(C) {
  // random disks overlap: covered share = 1 - exp(-n·π·r²/S²), so n = -ln(1 - C)·S²/(π·r̄²)
  const r2 = (PV_CLOUD.r0 ** 2 + PV_CLOUD.r0 * PV_CLOUD.r1 + PV_CLOUD.r1 ** 2) / 3;
  const n = Math.min(220, Math.round(-Math.log(1 - Math.min(C, 0.95)) * PV_CLOUD.size ** 2 / (Math.PI * r2))); if (_pvCF[n]) return _pvCF[n];
  const R = pvRand(PV_CLOUD.seed), out = [];
  for (let i = 0; i < 220; i++) out.push([R() * PV_CLOUD.size, R() * PV_CLOUD.size, lerp(PV_CLOUD.r0, PV_CLOUD.r1, R())]);
  return (_pvCF[n] = out.slice(0, n));   // more cover = the same clouds plus new ones, so moving the knob never reshuffles
}
const pvWrap = (v) => { const S = PV_CLOUD.size; return ((v % S) + S) % S - S / 2; };
// clouds at time t (seconds): [{c: [e, n, z], r}] in ENU metres around the panel
function pvClouds(C, t) { return pvCloudBase(C).map(([x, y, r]) => ({ c: [pvWrap(x + PV_CLOUD.wind[0] * t), pvWrap(y + PV_CLOUD.wind[1] * t), PV_CLOUD.z], r })); }
// share of the panel (0..1) under a cloud shadow right now
function pvCloudBlock(lat, tilt, azi, clouds, s) {
  if (!clouds.length || s[2] <= 0.02) return 0;
  let n = 0; const pts = pvPanelPts(lat, tilt, azi);
  for (const p of pts) {
    const k = (PV_CLOUD.z - p[2]) / s[2], q = [p[0] + s[0] * k, p[1] + s[1] * k];
    if (clouds.some(cl => (q[0] - cl.c[0]) ** 2 + (q[1] - cl.c[1]) ** 2 < cl.r * cl.r)) n++;
  }
  return n / pts.length;
}
// sunlight right now with the actual clouds and tree: clear sky, beam cut by tree and cloud shadows
function pvNow(lat, tilt, azi, n, h, env, t) {
  const a = pvAt(lat, tilt, azi, n, h, Object.assign({}, env, { cloud: 0 }));
  const b = a.up > 0 ? pvCloudBlock(lat, tilt, azi, pvClouds(env.cloud || 0, t), a.s) : 0;
  return Object.assign(a, { cloudB: b, poa: a.poa - a.beam * b, beam: a.beam * (1 - b) });
}

// ---- real data: read an inverter CSV and diagnose the orientation -------------------------------------------
// Reads "fecha_hora,potencia_kW,..." and common variants: ; or , or tab separators, decimal comma,
// YYYY-MM-DD or DD/MM/YYYY, power in W or kW. Times are the local clock. Returns [{y, mo, d, n, clock, p}] (p in kW).
function pvParseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('el archivo no tiene filas');
  const sep = [';', '\t', ','].find(c => lines[0].includes(c)) || ',';
  const head = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  let pi = head.findIndex(h => /pot|power|kw\b|\(w\)|activ/.test(h) && !/kwh|energ|yield/.test(h));
  const ti = head.findIndex(h => /fecha|hora|time|date|period|tiempo/.test(h));
  if (pi < 0) pi = ti === 0 ? 1 : 0;
  const inW = /\(w\)|\bw\b|vatios|watts?\b/.test(head[pi]) && !/kw/.test(head[pi]);
  const doy = (y, mo, d) => Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
  const out = [];
  for (const line of lines.slice(1)) {
    const f = line.split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
    const ts = f[ti < 0 ? 0 : ti] || '', num = Number((f[pi] || '').replace(/\s/g, '').replace(',', '.'));
    let m = ts.match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/), y, mo, d, H, M;
    if (m) [, y, mo, d, H, M] = m.map(Number);
    else if ((m = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/))) { [, d, mo, y, H, M] = m.map(Number); }
    else continue;
    if (!isFinite(num)) continue;
    out.push({ y, mo, d, n: doy(y, mo, d), clock: H + M / 60, p: Math.max(0, inW ? num / 1000 : num) });
  }
  if (!out.length) throw new Error('no encontré filas con fecha y potencia');
  return out;
}
// heat loss: cell temperature = ambient + 25 °C per kW/m², power -0.35 %/°C above 25 °C
// (typical datasheet coefficient; ambient 20 °C is an assumption, the same simple model PVWatts-style tools use)
const PV_TEMP = { gamma: -0.0035, tAmb: 20, kT: 25 };
const pvHeat = (g) => 1 + PV_TEMP.gamma * (PV_TEMP.tAmb + PV_TEMP.kT * g - 25);
// Fits tilt and azimuth (0 = equator, + = west) to the clear days. For each candidate, real ≈ k × clear-sky light
// on the panel, with k fitted by least squares; the candidate with the smallest error wins. Samples far below the
// fit on clear days are taken as shade (tree, building) and left out, then the fit runs again.
// site: {lat, lon, utc}. Returns {tilt, azi, k, rmse, days, clearDays, shade: [[from, to]] clock hours}.
function pvDiagnose(rows, site) {
  const S = rows.map(r => {
    const solar = r.clock + (4 * (site.lon - 15 * site.utc) + pvEoT(r.n)) / 60, s = pvSun(site.lat, r.n, solar);
    if (s[2] < 0.08) return null;
    const dni = PV.I0 * Math.pow(PV.k, Math.pow(pvAM(s[2]), PV.e)), dhi = PV.dif * dni;
    return { r, s, dni, dhi, ghi: dni * s[2] + dhi, key: `${r.y}-${r.mo}-${r.d}` };
  }).filter(Boolean);
  // clear days: the highest share of real energy over clear-sky horizontal light (top 40 %, at least 2)
  const byDay = {}; for (const x of S) (byDay[x.key] = byDay[x.key] || { key: x.key, n: x.r.n, e: 0, g: 0 }), byDay[x.key].e += x.r.p, byDay[x.key].g += x.ghi;
  const days = Object.values(byDay).sort((a, b) => b.e / b.g - a.e / a.g);
  const clear = new Set(days.slice(0, Math.max(2, Math.ceil(days.length * 0.4))).map(d => d.key));
  const C = S.filter(x => clear.has(x.key));
  // expected output shape: light on the panel times the heat loss (hot cells give less at midday)
  const poa = (x, tilt, azi) => { const N = pvNormal(site.lat, tilt, azi), b = tilt * DEG, g = x.dni * Math.max(0, dot3(x.s, N)) + x.dhi * (1 + Math.cos(b)) / 2 + PV.albedo * x.ghi * (1 - Math.cos(b)) / 2; return g * pvHeat(g); };
  // trimmed least squares: shade and clouds only ever lower the output, so for every candidate the 30 % of samples
  // that sit lowest under the fit are dropped and k is fitted again on the rest (twice)
  const TRIM = 0.3;
  const fit = (tilt, azi) => {
    const t = C.map(x => poa(x, tilt, azi)), r = C.map(x => x.r.p);
    let use = C.map(() => true), k = 0, e = 0;
    for (let pass = 0; pass < 3; pass++) {
      let rt = 0, tt = 0; for (let i = 0; i < C.length; i++) if (use[i]) { rt += r[i] * t[i]; tt += t[i] * t[i]; }
      k = rt / (tt || 1);
      if (pass === 2) break;
      const res = r.map((v, i) => v - k * t[i]), cut = res.slice().sort((a, b) => a - b)[Math.floor(res.length * TRIM)];
      use = res.map(v => v >= cut);
    }
    let n = 0; for (let i = 0; i < C.length; i++) if (use[i]) { const d = r[i] - k * t[i]; e += d * d; n++; }
    return { tilt, azi, k, rmse: Math.sqrt(e / (n || 1)) };
  };
  let best = null;
  for (let t = 0; t <= 70; t += 2) for (let a = -90; a <= 90; a += 5) { const f = fit(t, a); if (!best || f.rmse < best.rmse) best = f; }
  const c0 = best; for (let t = Math.max(0, c0.tilt - 2); t <= c0.tilt + 2; t++) for (let a = c0.azi - 4; a <= c0.azi + 4; a++) { const f = fit(t, a); if (f.rmse < best.rmse) best = f; }
  const peak = Math.max(...C.map(x => x.r.p));
  const use = C.map(x => x.r.p >= best.k * poa(x, best.tilt, best.azi) - 0.12 * peak);
  // shade windows: quarter hours where most clear-day samples sit well below the fit
  const bins = {}; C.forEach((x, i) => { const q = Math.floor(x.r.clock * 4) / 4; (bins[q] = bins[q] || [0, 0])[1]++; if (!use[i]) bins[q][0]++; });
  const shade = []; for (const q of Object.keys(bins).map(Number).sort((a, b) => a - b)) {
    if (bins[q][0] / bins[q][1] < 0.5) continue; const last = shade[shade.length - 1];
    if (last && q - last[1] <= 0.26) last[1] = q + 0.25; else shade.push([q, q + 0.25]);
  }
  return Object.assign(best, { days: days.length, clearDays: [...clear], shade, samples: S.length });
}
