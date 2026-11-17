// ---------------------------------------------------------------------------
// PANEL SOLAR. Same house, same panel, five ways to point it: flat, vertical, facing the pole,
// facing the equator at the right tilt, and the same rule in another city. Then the viewer drives it:
// knobs = latitude, longitude, UTC, tilt, orientation, clouds, tree; D = restart the 3-day sweep. Model: model.js, data: demo.json note.
// ---------------------------------------------------------------------------
const SP = { pc: [0, 0, 17], W: 14, L: 9, R: 31, wall: 11 };
const SP_COL = {
  wall: { light: '#fbf3e3', mid: '#efdcbc', dark: '#c9b28a' },
  roof: { light: '#d9dde6', mid: '#b9bfcc', dark: '#8d93a3' },
  cell: { light: '#4f6fb8', mid: '#2f4c94', dark: '#1d2f63' },
  back: { light: '#d4d7de', mid: '#a9adb8', dark: '#7a7f8c' },
  door: { light: '#e0a868', mid: '#bd8146', dark: '#8c5a2c' },
};
// ENU -> world. North hemisphere: south = +x (screen lower right, so the low winter sun clears the house),
// east = -y (upper right), north = -x, west = +y. South hemisphere: turned 180° so the equator stays at +x.
// The engine mirrors the world (VR), so this left-handed map reads correctly on screen.
function enuW(v, hemi) { return [-v[1] * hemi, -v[0] * hemi, v[2]]; }
const SP_CITIES = [[0, 'QUITO'], [4.7, 'BOGOTÁ'], [10.5, 'CARACAS'], [-12, 'LIMA'], [19.4, 'CDMX'], [23.1, 'LA HABANA'], [25.7, 'MONTERREY'], [-33.4, 'SANTIAGO'], [-34.6, 'BUENOS AIRES'], [-37.3, 'TANDIL'], [40.4, 'MADRID'], [52.5, 'BERLÍN'], [59.9, 'OSLO']];
const spCity = (lat) => { const c = SP_CITIES.find(c => Math.abs(c[0] - lat) <= 1.5); return c ? c[1] : null; };
const spLat = (lat) => `${Math.abs(lat).toFixed(Math.abs(lat) % 1 ? 1 : 0)}° ${lat >= 0 ? 'N' : 'S'}`;
function spDir(lat, azi) {
  const eq = lat >= 0 ? 'SUR' : 'NORTE', po = lat >= 0 ? 'NORTE' : 'SUR', a = ((azi % 360) + 540) % 360 - 180;
  if (Math.abs(a) <= 7) return `AL ${eq}`; if (Math.abs(a) >= 173) return `AL ${po}`;
  if (Math.abs(a) === 90) return a > 0 ? 'AL OESTE' : 'AL ESTE';
  return `${eq} ${Math.abs(a)}° AL ${a > 0 ? 'OESTE' : 'ESTE'}`;
}
// panel geometry in world: centre, normal n, width axis u, slope axis d (low edge -> high edge)
function spPanel(st) {
  const f = enuW(pvFacing(st.lat, st.azi), st.hemi), b = st.tilt * DEG;
  const n = [f[0] * Math.sin(b), f[1] * Math.sin(b), Math.cos(b)], d = [-f[0] * Math.cos(b), -f[1] * Math.cos(b), Math.sin(b)];
  const u = norm3([-f[1], f[0], 0]);
  return { c: SP.pc, n, d, u };
}

defineAsset('casaSolar', {
  name: 'casa', label: 'CASA · TECHO PLANO', group: 'floor', layer: 0, O: [0, 0, 0], anchor: [10, 0, 7], ring: [13, 13, 0.02], lab: [6, 6, 2],
  draw(G, xf) {
    const h = SP.wall;
    const win = (c, x) => { c.fillStyle = '#bfe3f2'; prect(c, x, 3.2, 3.6, 3.2, 0.2); c.fill(); c.lineWidth = 0.18; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.moveTo(x + 1.8, 3.2); c.lineTo(x + 1.8, 6.4); c.moveTo(x, 4.8); c.lineTo(x + 3.6, 4.8); c.lineWidth = 0.1; c.stroke(); };
    drawBox(G, xf, [-10, -10, 0], [10, 10, h], SP_COL.wall, {
      lw: 2, topM: SP_COL.roof,
      px: (c) => { win(c, 2.6); c.fillStyle = '#bd8146'; prect(c, 9, 4.2, 3.6, 6.8, 0.2); c.fill(); c.lineWidth = 0.18; c.strokeStyle = INK; c.stroke(); win(c, 14); },
      py: (c) => { win(c, 3.5); win(c, 12.5); },
    });
    // parapet
    for (const [a, b] of [[[-10, -10, h], [10, -9.4, h + 0.8]], [[-10, 9.4, h], [10, 10, h + 0.8]], [[-10, -9.4, h], [-9.4, 9.4, h + 0.8]], [[9.4, -9.4, h], [10, 9.4, h + 0.8]]]) drawBox(G, xf, a, b, SP_COL.wall, { lw: 1.4 });
  },
});

defineAsset('panelSolar', {
  name: 'panel solar', label: 'PANEL SOLAR', group: 'floor', layer: 2, O: [0, 0, 0], anchor: SP.pc, ring: [8, 8, SP.wall + 0.1], lab: [-8, 8, 8], dropH: 8,
  draw(G, xf, st) {
    const P = spPanel(st), C = xf.p(P.c), W2 = SP.W / 2, L2 = SP.L / 2;
    const corner = (a, b) => add3(C, add3(mul3(P.u, a), mul3(P.d, b)));
    const quad = [corner(-W2, -L2), corner(W2, -L2), corner(W2, L2), corner(-W2, L2)].map(q => G.cam.p(q));
    const front = dot3(P.n, VC) > 0;
    const post = () => {
      drawCyl(G, new Xf(), [C[0], C[1], (SP.wall + C[2] - 0.6) / 2], 'z', 0.55, C[2] - 0.6 - SP.wall, M.steel, { seg: 16, lw: 1.3 });
      drawWire(G, new Xf(), [add3(corner(-W2 * 0.85, 0), mul3(P.n, -0.5)), add3(corner(W2 * 0.85, 0), mul3(P.n, -0.5))], '#9aa1ad', { w: 0.45, n: 2 });
    };
    spRoofShadows(G, st);
    if (front) post();
    fillStroke(G, quad, tone(front ? SP_COL.cell : SP_COL.back, front ? P.n : mul3(P.n, -1)), 2.2);
    if (front) {
      onPlane(G, corner(-W2, -L2), P.u, P.d, (c) => {
        c.strokeStyle = 'rgba(220,232,255,0.55)'; c.lineWidth = 0.08;
        for (let x = 0; x <= SP.W + 0.01; x += SP.W / 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, SP.L); c.stroke(); }
        for (let y = 0; y <= SP.L + 0.01; y += SP.L / 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(SP.W, y); c.stroke(); }
        c.strokeStyle = '#e9edf3'; c.lineWidth = 0.35; prect(c, 0, 0, SP.W, SP.L); c.stroke();
      });
    } else {
      onPlane(G, corner(-W2, -L2), P.u, P.d, (c) => { c.strokeStyle = 'rgba(29,32,51,0.35)'; c.lineWidth = 0.15; for (const y of [SP.L * 0.3, SP.L * 0.7]) { c.beginPath(); c.moveTo(0.6, y); c.lineTo(SP.W - 0.6, y); c.stroke(); } ptxt(c, 'PARTE DE ATRÁS', SP.W / 2, SP.L / 2, 0.9, 'rgba(29,32,51,0.6)', 700, 'center'); });
      post();
    }
    if (front) spPanelShadows(G, st, P, quad);
  },
});

defineAsset('brujula', {
  name: 'brújula', label: 'BRÚJULA', group: 'floor', layer: -1, O: [0, 0, 0], anchor: [0, 0, 0], ring: [20, 20, 0.02], lab: [12, -16, 0], dropH: 0.5, quick: true,
  draw(G, xf, st) {
    const h = st.hemi ?? 1, R = 20;
    const dirs = [[[0, 1, 0], 'N'], [[0, -1, 0], 'S'], [[1, 0, 0], 'E'], [[-1, 0, 0], 'O']];
    const c = G.ctx;
    const ring = []; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2; ring.push(G.cam.p(xf.p([Math.cos(a) * R, Math.sin(a) * R, 0.02]))); }
    c.save(); c.setLineDash([6, 6]); pathPts(c, ring); c.lineWidth = 1.4; c.strokeStyle = 'rgba(29,32,51,0.35)'; c.stroke(); c.restore();
    for (const [v, s] of dirs) {
      const p = G.cam.p(xf.p(enuW(mul3(v, R + 2.6), h))), eq = (s === 'S' && h > 0) || (s === 'N' && h < 0);
      pill(c, p[0], p[1], s, { align: 'center', valign: 'middle', bg: eq ? '#ffcf6b' : '#fffdf8', size: 13, padY: 5, padX: 8, shadow: false, lw: 1.5 });
    }
    const q = G.cam.p(xf.p(enuW([0, -(R + 2.6) * h, 0], h)));
    hand(c, '← hacia el ecuador', q[0] + 20, q[1] + 2, 22, '#c2410c', 0, 1);
  },
});

// ---- chapters ---------------------------------------------------------------------------------------
const SP_CH = [
  { id: 'plano', btn: 'Plano', lat: -37.3, tilt: 0, azi: 0, tip: ['Plano: en invierno el sol va bajo', 'y le pega de lado.'] },
  { id: 'vertical', btn: 'Vertical', lat: -37.3, tilt: 90, azi: 0, tip: ['Vertical, como en una pared:', 'el sol alto de verano le pasa de canto.'] },
  { id: 'sur', btn: 'Al sur', lat: -37.3, tilt: 35, azi: 180, tip: ['Mirando al sur, lejos del ecuador:', 'le da la espalda al sol.'] },
  { id: 'justo', btn: 'Justo', lat: -37.3, tilt: 33, azi: 0, tip: ['Al norte e inclinado casi tu latitud:', 'el mejor promedio del año.'] },
  { id: 'techo', btn: 'Tu techo', lat: -37.3, tilt: 25, azi: 20, tip: ['25° y girado 20° al oeste:', 'errar un poco cuesta poco.'] },
]
const SP_LEAD = 1.2, SP_DAYV = 2.6, SP_HOLD = 2.8, SP_SWEEP = SP_DAYV * PV_DAYS.length;
// the two chapters on the real house: the config panel (clouds) and the inverter data
const SP_NUBE_D = 11, SP_INV_D = 15;
const SPN = { drag0: 1.6, drag1: 4.0, cloud: 0.6, out: SP_NUBE_D - 0.6 };
const SPI = { load: 1.7, sweep0: 2.0, sweep1: 8.0, apply: 9.2, out: SP_INV_D - 0.6, n: 309, h0: 6.5, h1: 17.5, tilt0: 33, azi0: 0 };
const SP_VTREE = { tree: 11, tx: -7, ty: -2.5 };   // the tree hidden in the simulated CSV (data/tandil-simulado-verdad.json)

function spInsts() {
  return [
    place('brujula', 'bru', { code: 'brujula();' }),
    place('casaSolar', 'casa', { code: 'casa(techo = plano);' }),
    place('panelSolar', 'pan', { code: 'panel(14, 9 /* x 10 cm */);' }),
  ];
}
// sun at sweep time v (0..SP_SWEEP): which day, solar hour
function spSweep(lat, v) {
  const k = clamp(Math.floor(v / SP_DAYV), 0, PV_DAYS.length - 1), f = clamp((v - k * SP_DAYV) / SP_DAYV);
  const n = PV_DAYS[k][0], [h0, h1] = pvDay(lat, n);
  return { k, n, h: lerp(h0 - 0.25, h1 + 0.25, f), f };
}
function spTimeline(params) {
  const insts = spInsts(), byId = Object.fromEntries(insts.map(i => [i.id, i]));
  const R = SP.R, pc = SP.pc;
  // frame the mat plus every sun path the chapters use (live keeps the same frame)
  const sky = [];
  for (const lat of [-37.3]) for (const [n] of PV_DAYS) { const [h0, h1] = pvDay(lat, n); for (let k = 0; k <= 12; k++) sky.push(add3(pc, mul3(enuW(pvSun(lat, n, lerp(h0, h1, k / 12)), -1), R))); }
  const cam = fitCam([[-25, -25, 0], [25, 25, 0], [25, -25, 0], [-25, 25, 0], ...sky], 0.95);
  const base = { insts, byId, cam, kwp: params.kwp ?? 5.5, fecha: params.fecha ?? 321, hora: params.hora ?? 13, lat: params.lat ?? -37.3, tilt: params.tilt ?? 33, azi: params.azi ?? 0, lon: params.lon ?? -59.1, utc: params.utc ?? -3, cloud: params.cloud ?? 0, tree: params.tree ?? 10, tx: params.tx ?? -3, ty: params.ty ?? 7 };
  if (params.live) return Object.assign(base, { T: { end: 1800, caption: null, labelsOut: 0, nube0: Infinity, inv0: Infinity, segEnd: -1 }, sched: {}, total: insts.length, CH: [], live: true, tabs: [], tabAt: () => 0 });
  const { sched, end, total } = scheduleBuild(insts, 0.35);
  let t = end + 0.6;
  const CH = SP_CH.map(c => { const o = Object.assign({}, c, { t0: t, share: pvShare(c.lat, c.tilt, c.azi) }); t += SP_LEAD + SP_SWEEP + SP_HOLD; o.t1 = t; return o; });
  const T = { buildEnd: end, nube0: t, inv0: t + SP_NUBE_D, segEnd: t + SP_NUBE_D + SP_INV_D }; t = T.segEnd; T.caption = t + 0.2; T.end = T.caption + 4.6; T.labelsOut = CH[0].t0 + 0.4;
  return Object.assign(base, { T, sched, total, CH, live: false, tabs: [], tabAt: () => 0 });
}
function spChapter(TL, t) { for (let k = TL.CH.length - 1; k >= 0; k--) if (t >= TL.CH[k].t0) return k; return -1; }

function spState(TL, t) {
  const st = { t }; partsAt(TL, t, st);
  let lat, tilt, azi, v = -1, k = -1, ch = null, u = 0, env = PV_ENV0, lon = TL.lon, utc = TL.utc;
  if (TL.live) {
    const L = (key) => liveVal(LIVE.ev, key, t, TL[key]);
    lat = L('lat'); tilt = L('tilt'); azi = L('azi'); lon = L('lon'); utc = L('utc'); st.kwp = L('kwp');
    env = { cloud: L('cloud') / 100, tree: L('tree'), tx: L('tx'), ty: L('ty') };
    // the clock starts at the last FECHA / HORA set and advances SP_RATE hours per second, only while playing
    let ts = 0; for (const e of LIVE.ev) if (e[0] <= t && (e[1] === 'fecha' || e[1] === 'hora')) ts = e[0];
    const tot = liveVal(LIVE.ev, 'hora', ts, TL.hora) + (t - ts) * SP_RATE, n0 = liveVal(LIVE.ev, 'fecha', ts, TL.fecha);
    const n = ((n0 - 1 + Math.floor(tot / 24)) % 365 + 365) % 365 + 1, clock = ((tot % 24) + 24) % 24;
    const solar = clock + (4 * (lon - 15 * utc) + pvEoT(n)) / 60;
    st.free = { n, h: solar, clock, k: PV_DAYS.findIndex(d => d[0] === n), f: 0 };
  } else if (t >= TL.T.nube0 && t < TL.T.segEnd) {
    // chapters 6 and 7: a fixed day, the clock moves; the year stats stay on a clear sky (env), the scene gets envX
    const inv = t >= TL.T.inv0, e = t - (inv ? TL.T.inv0 : TL.T.nube0); k = TL.CH.length - 1; lat = -37.3;
    let n, clock;
    if (!inv) { tilt = 25; azi = 20; n = SPI.n; clock = lerp(11, 13, e / SP_NUBE_D); st.envX = { cloud: SPN.cloud * easeInOut(seg(e, SPN.drag0, SPN.drag1)) * (1 - easeInOut(seg(e, SPN.out - 0.4, SP_NUBE_D))) }; }
    else {
      const d = spDiag({ lat, lon, utc }, spVData()), f = easeInOut(seg(e, SPI.apply + 0.1, SPI.apply + 1.3));
      tilt = lerp(SPI.tilt0, d.tilt, f); azi = lerp(SPI.azi0, d.azi, f); n = SPI.n; clock = lerp(SPI.h0, SPI.h1, easeInOut(seg(e, SPI.sweep0, SPI.sweep1)));
      st.envX = Object.assign({}, SP_VTREE, { tree: SP_VTREE.tree * easeOut(seg(e, 0.1, 1.0)) || 0 }); st.dataOn = e >= SPI.load; st.diag = d;
    }
    st.extra = inv ? 'inv' : 'nube'; st.eu = e;
    st.free = { n, h: clock + (4 * (lon - 15 * utc) + pvEoT(n)) / 60, clock, k: -1, f: 0 };
  } else {
    k = spChapter(TL, t); ch = TL.CH[k];
    if (!ch) { const c0 = TL.CH[0]; lat = c0.lat; tilt = c0.tilt; azi = c0.azi; }
    else {
      u = t - ch.t0; const pr = TL.CH[k - 1] || ch, f = easeInOut(seg(u, 0.1, SP_LEAD - 0.1));
      lat = ch.lat; tilt = lerp(pr.tilt, ch.tilt, f); azi = lerp(pr.azi, ch.azi, f);
      if (u >= SP_LEAD && u < SP_LEAD + SP_SWEEP) v = u - SP_LEAD;
    }
  }
  st.lat = lat; st.tilt = tilt; st.azi = azi; st.env = env; st.lon = lon; st.utc = utc; st.hemi = lat >= 0 ? 1 : -1; st.k = k; st.ch = ch; st.u = u;
  st.sweep = st.free ? st.free : v >= 0 ? spSweep(lat, v) : null;
  // envNow follows the tree while it is being dragged; the year numbers wait for the drop (env)
  const envNow = SP_DRAG || st.envX ? Object.assign({}, env, st.envX, SP_DRAG) : env; st.envNow = envNow;
  st.now = st.sweep ? pvNow(lat, tilt, azi, st.sweep.n, st.sweep.h, envNow, t) : null;
  const h = st.hemi;
  st.cloudsW = envNow.cloud > 0 ? pvClouds(envNow.cloud, t).map(cl => ({ c: spM2W(cl.c, h), r: cl.r / SP_U })) : [];
  if (envNow.tree) { const T = pvTreeCrown(envNow.tree, envNow.tx, envNow.ty); st.treeW = { base: spM2W([T.c[0], T.c[1], 0], h), crown: spM2W(T.c, h), r: T.r / SP_U }; }
  // shadows: the real sun while it is up (fading at the horizon); a mid-morning sun between chapters
  if (st.now && st.now.up > 0) st.shadow = { d: enuW(st.now.s, h), a: clamp(st.now.up / 0.12) };
  else if (!TL.live) {
    const a = !ch ? 1 : u < SP_LEAD ? 1 - seg(u, SP_LEAD - 0.35, SP_LEAD) : seg(u, SP_LEAD + SP_SWEEP, SP_LEAD + SP_SWEEP + 0.35);
    st.shadow = { d: enuW(pvSun(lat, 80, 10.5), h), a };
  }
  st.share = pvShare(lat, Math.round(tilt), Math.round(azi), env);
  st.done = TL.live || st.extra ? true : ch && u >= SP_LEAD + SP_SWEEP;
  st.cam = TL.cam; SP_LAST = st;
  return st;
}

// day curve (kW/m² vs solar hour) for a day, cached per key
const _spCurve = {};
function spCurve(lat, tilt, azi, n, env) {
  const key = `${lat}|${tilt}|${azi}|${n}|${pvEnvKey(env)}`; if (_spCurve[key]) return _spCurve[key];
  const pts = []; for (let h = 4; h <= 20; h += 0.25) pts.push([h, pvAt(lat, tilt, azi, n, h, env).poa]);
  return (_spCurve[key] = pts);
}
const SP_RATE = 1;   // free mode: hours of model time per second of Play
const SP_MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const spDate = (n) => { const d = new Date(Date.UTC(2026, 0, n)); return `${d.getUTCDate()} ${SP_MON[d.getUTCMonth()]}`; };
// free mode: keep the FECHA and HORA sliders on the moment shown, so what you note matches the scene
let SP_SYNC = '';
function spSyncKnobs(st) {
  if (typeof document === 'undefined' || !st.sweep) return;
  const n = st.sweep.n, hq = Math.round(st.sweep.clock * 4) / 4 % 24, key = `${n}|${hq}`; if (key === SP_SYNC) return; SP_SYNC = key;
  const ins = document.querySelectorAll('.knob');
  DEMO.knobs.forEach((k, i) => {
    if (k.key !== 'fecha' && k.key !== 'hora' || !ins[i]) return;
    const v = k.key === 'fecha' ? n : hq, inp = ins[i].querySelector('input'); if (document.activeElement === inp) return;
    inp.value = v; PARAMS[k.key] = v; ins[i].querySelector('span.v').textContent = k.fmt(v);
  });
}
// ---- inverter data: load, diagnose, compare (model.js pvParseCSV / pvDiagnose) ----------------------------------
const SP_PR = 0.86;   // expected losses besides heat: wiring, inverter, mismatch (assumption)
let SP_DATA = null, SP_BOX = null;
function spMakeData(text, name) {
  const rows = pvParseCSV(text), byN = {};
  for (const r of rows) (byN[r.n] = byN[r.n] || []).push(r);
  return { name, rows, byN, diag: null, siteKey: '' };
}
let SP_VDATA = null;   // the simulated CSV as the guided video shows it
const spVData = () => SP_VDATA || (SP_VDATA = spMakeData(SP_SIM_CSV, 'tandil-simulado-2026-11.csv'));
function spLoadCSV(text, name) {
  SP_DATA = spMakeData(text, name); const rows = SP_DATA.rows;
  spDataStatus();
  const st = SP_LAST;
  if (st) { spDiag(st); const d = SP_DATA.diag, first = d.clearDays[0]; const n = rows.find(r => `${r.y}-${r.mo}-${r.d}` === first).n; liveSet('fecha', n); }
}
// diagnosis for the current site; runs again only when latitude, longitude or time zone change
function spDiag(st, D = SP_DATA) {
  const key = `${st.lat}|${st.lon}|${st.utc}`; if (D.siteKey === key) return D.diag;
  D.siteKey = key; D.diag = pvDiagnose(D.rows, { lat: st.lat, lon: st.lon, utc: st.utc }); if (D === SP_DATA) spDataStatus(); return D.diag;
}
// expected kW for a clock time: clear sky, the scene's tree, heat loss, installed kWp and losses
function spExpected(st, n, clock) {
  const solar = clock + (4 * (st.lon - 15 * st.utc) + pvEoT(n)) / 60, g = pvAt(st.lat, Math.round(st.tilt), Math.round(st.azi), n, solar, Object.assign({}, st.env, { cloud: 0 })).poa;
  return g * pvHeat(g) * (st.kwp || 5.5) * SP_PR;
}
const spDeg = (a) => a === 0 ? '0°' : `${Math.abs(a)}° ${a > 0 ? 'O' : 'E'}`;
const spWin = (w) => `${spHour(w[0])}-${spHour(w[1])}`;
function spDataBays(c, st, D = SP_DATA) {
  const d = spDiag(st, D), n = st.sweep.n, day = D.byN[n] || [];
  // BAY 03 · real vs expected for the day shown
  let real = 0, exp = 0; const pts = day.map(r => { const e = spExpected(st, n, r.clock); real += r.p * 5 / 60; exp += e * 5 / 60; return [r.clock, r.p, e]; });
  const ratio = exp > 0 ? real / exp : 0;
  let b = bayFrame(c, 2, 'BAY 03 · REAL VS TEÓRICO', day.length ? `${Math.round(ratio * 100)} % · ${spDate(n).toUpperCase()}` : 'SIN DATOS ESTE DÍA', day.length ? (ratio > 0.9 ? BAY_BG.lime : ratio > 0.7 ? BAY_BG.amber : BAY_BG.coral) : BAY_BG.grey);
  const x0 = b.x + 14, x1 = b.x + b.w - 14, y0 = b.y + 44, y1 = b.y + 168, kw = Math.max(1, st.kwp || 5.5) * 0.95;
  const X = (h) => x0 + (h - 4) / 17 * (x1 - x0), Y = (p) => y1 - clamp(p / kw) * (y1 - y0);
  c.save(); c.fillStyle = '#f4f1ea'; rr(c, x0, y0 - 4, x1 - x0, y1 - y0 + 8, 6); c.fill();
  c.font = `400 9.5px ${FONT_MONO}`; c.fillStyle = '#8a8e99'; c.textAlign = 'center';
  for (const h of [6, 9, 12, 15, 18, 21]) c.fillText(String(h), X(h), y1 + 14);
  if (pts.length) {
    c.beginPath(); pts.forEach(([h, , e], j) => j ? c.lineTo(X(h), Y(e)) : c.moveTo(X(h), Y(e))); c.lineWidth = 2; c.strokeStyle = '#e8590c'; c.stroke();
    c.fillStyle = '#3a46aa'; for (const [h, p] of pts) { c.beginPath(); c.arc(X(h), Y(p), 1.9, 0, Math.PI * 2); c.fill(); }
    const xh = X(st.sweep.clock); c.strokeStyle = 'rgba(29,32,51,0.5)'; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(xh, y0); c.lineTo(xh, y1); c.stroke(); c.setLineDash([]);
  }
  c.textAlign = 'left'; c.font = `700 11px ${FONT_MONO}`; c.fillStyle = INK;
  c.fillText(day.length ? `real ${real.toFixed(1)} kWh · teórico ${exp.toFixed(1)} kWh` : 'elige una FECHA del archivo', x0, b.y + 196);
  c.font = `700 9.5px ${FONT_MONO}`; c.fillStyle = '#3a46aa'; c.fillText('● real', x0 + 6, y0 + 10); c.fillStyle = '#e8590c'; c.fillText('— teórico', x0 + 6, y0 + 22);
  c.restore();
  // BAY 04 · the orientation the data says the panel really has
  const same = Math.abs(d.tilt - Math.round(st.tilt)) <= 3 && Math.abs(d.azi - Math.round(st.azi)) <= 5, eff = d.k / ((st.kwp || 5.5) * SP_PR), lose = 1 - pvShare(st.lat, d.tilt, d.azi);
  b = bayFrame(c, 3, 'BAY 04 · DIAGNÓSTICO', same ? 'COINCIDE' : 'NO COINCIDE', same ? BAY_BG.lime : BAY_BG.amber);
  bigValue(c, b, `${d.tilt}° · ${spDeg(d.azi)}`, '', `estimado con ${d.clearDays.length} días despejados de ${d.days}`);
  c.save(); c.font = `400 11.5px ${FONT_MONO}`; c.fillStyle = '#545867';
  const L = [`configurado en la app: ${Math.round(st.tilt)}° · ${spDeg(Math.round(st.azi))}`,
    `así pierde ${(lose * 100).toFixed(1)} % frente al mejor ángulo`,
    d.shade.length ? `sombra fija: ${d.shade.map(spWin).join(', ')}` : 'sin sombras fijas en días claros',
    `rinde ${Math.round(eff * 100)} % de lo esperado para ${st.kwp || 5.5} kWp`];
  L.forEach((t, i) => c.fillText(t, b.x + 14, b.y + 124 + i * 19));
  c.restore();
}
function spDataStatus() {
  if (!SP_BOX) return; const el = SP_BOX.querySelector('#datastatus');
  const D = SP_DATA; SP_BOX.querySelector('#dataapply').disabled = !(D && D.diag); SP_BOX.querySelector('#dataclear').disabled = !D;
  if (!D) { el.textContent = 'Sin datos. Formato: fecha y hora, potencia (kW o W). Acepta , o ; y coma decimal.'; return; }
  const a = D.rows[0], z = D.rows[D.rows.length - 1], d = D.diag;
  el.innerHTML = `<b>${D.name}</b><br>${D.rows.length} filas · ${Object.keys(D.byN).length} días · ${a.d}/${a.mo} a ${z.d}/${z.mo}/${z.y}` + (d ? `<br>Orientación estimada: <b>${d.tilt}° · ${spDeg(d.azi)}</b>` + (d.shade.length ? `<br>Sombra fija: ${d.shade.map(spWin).join(', ')}` : '') : '');
}
function spDataPanel(box) {
  const h = document.createElement('h3'); h.textContent = 'DATOS DEL INVERSOR'; box.appendChild(h);
  const w = document.createElement('div'); w.className = 'data';
  w.innerHTML = `<button id="dataimport">Importar CSV…</button> <button id="datasim">Cargar CSV simulado</button>
<p id="datastatus"></p><button id="dataapply">Usar orientación estimada</button> <button id="dataclear">Quitar datos</button>
<input id="datafile" type="file" accept=".csv,.txt,text/csv" hidden>`;
  box.appendChild(w);
  const $ = (id) => w.querySelector('#' + id);
  const fail = (e) => { $('datastatus').textContent = 'No pude leer el archivo: ' + e.message; };
  $('dataimport').onclick = () => $('datafile').click();
  $('datafile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { spLoadCSV(await f.text(), f.name); } catch (err) { fail(err); } e.target.value = ''; };
  $('datasim').onclick = () => { try { spLoadCSV(SP_SIM_CSV, 'tandil-simulado-2026-11.csv (simulado)'); } catch (err) { fail(err); } };
  $('dataapply').onclick = () => {
    const d = SP_DATA && SP_DATA.diag; if (!d) return;
    const ins = document.querySelectorAll('.knob');
    DEMO.knobs.forEach((k, i) => { if (k.key !== 'tilt' && k.key !== 'azi') return; const v = k.key === 'tilt' ? d.tilt : d.azi; ins[i].querySelector('input').value = v; PARAMS[k.key] = v; ins[i].querySelector('span.v').textContent = k.fmt(v); liveSet(k.key, v); });
  };
  $('dataclear').onclick = () => { SP_DATA = null; spDataStatus(); };
  SP_BOX = w; spDataStatus();
}
// a drawn copy of the left sidebar (the real one is HTML and is not in the video), with a cursor that uses it
function spMock(c, st) {
  const e = st.eu, nube = st.extra === 'nube', D = nube ? SP_NUBE_D : SP_INV_D;
  const a = easeOut(seg(e, 0, 0.5)) * (1 - easeInOut(seg(e, D - 0.6, D - 0.1))); if (a <= 0) return;
  const x = CARD.x + 30 - (1 - a) * 40, w = 330, y0 = 262, px = x + 20, pw = w - 40;
  const LIME = '#c8f04a', TXT = '#e8eaee', DIM = '#8b909a', BG = '#16181d';
  const rows = [], targets = {};
  let y = y0 + 56;
  const head = (t) => { rows.push(['h', t, y]); y += 30; };
  const slider = (key, label, f, val) => { rows.push(['s', label, y, f, val]); targets[key] = [px + pw * f, y + 26]; y += 64; };
  const button = (key, label, on, hot) => { rows.push(['b', label, y, on, hot]); targets[key] = [px + 14 + Math.min(pw - 28, label.length * 10.5 + 20) / 2, y + 17]; y += 46; };
  const text = (t, bold) => { rows.push(['t', t, y, bold]); y += 20; };
  head('PANEL');
  slider('tilt', 'INCLINACIÓN', st.tilt / 90, `${Math.round(st.tilt)}°`);
  slider('azi', 'GIRO', (st.azi + 180) / 360, Math.round(st.azi) ? `${Math.abs(Math.round(st.azi))}° al ${st.azi > 0 ? 'oeste' : 'este'}` : '0° · al ecuador');
  if (nube) {
    head('ENTORNO');
    const C = st.envNow.cloud || 0;
    slider('cloud', 'NUBES', C, C ? `${Math.round(C * 100)} % del cielo` : 'cielo limpio');
    slider('tree', 'ÁRBOL', 0, 'sin árbol');
  } else {
    head('DATOS DEL INVERSOR');
    button('imp', 'Importar CSV…', true, false);
    button('sim', 'Cargar CSV simulado', true, Math.abs(e - SPI.load) < 0.2);
    if (st.dataOn) { const d = st.diag; text('tandil-simulado-2026-11.csv', true); text('2702 filas · 14 días'); text(`Orientación estimada: ${d.tilt}° · ${spDeg(d.azi)}`, true); text(`Sombra fija: ${d.shade.map(spWin).join(', ')}`); y += 8; }
    button('apply', 'Usar orientación estimada', st.dataOn, Math.abs(e - SPI.apply) < 0.2);
  }
  const h = y - y0 + 6;
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(29,32,51,0.25)'; rr(c, x + 5, y0 + 6, w, h, 16); c.fill();
  c.fillStyle = BG; rr(c, x, y0, w, h, 16); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.font = `700 15px ${FONT_MONO}`; c.letterSpacing = '1px'; c.fillStyle = TXT; c.textBaseline = 'middle'; c.fillText('⚙ CONFIGURACIÓN', px, y0 + 28);
  c.letterSpacing = '0px';
  for (const r of rows) {
    if (r[0] === 'h') { c.font = `700 13px ${FONT_MONO}`; c.fillStyle = LIME; c.fillText(r[1], px, r[2] + 10); }
    else if (r[0] === 's') {
      const [, label, yy, f, val] = r, ty = yy + 26;
      c.font = `400 12px ${FONT_MONO}`; c.fillStyle = DIM; c.fillText(label, px, yy + 8);
      c.fillStyle = '#3a3e47'; rr(c, px, ty - 3, pw, 6, 3); c.fill(); c.fillStyle = LIME; rr(c, px, ty - 3, pw * clamp(f), 6, 3); c.fill();
      c.beginPath(); c.arc(px + pw * clamp(f), ty, 8, 0, Math.PI * 2); c.fill();
      c.font = `400 12.5px ${FONT_MONO}`; c.fillStyle = LIME; c.textAlign = 'right'; c.fillText(val, px + pw, ty + 22); c.textAlign = 'left';
    } else if (r[0] === 'b') {
      const [, label, yy, on, hot] = r, bw = Math.min(pw, label.length * 10.5 + 28);
      c.globalAlpha = a * (on ? 1 : 0.4); c.fillStyle = hot ? LIME : '#2a2d34'; rr(c, px, yy, bw, 34, 17); c.fill();
      c.font = `700 13px ${FONT_MONO}`; c.fillStyle = hot ? INK : TXT; c.fillText(label, px + 14, yy + 17); c.globalAlpha = a;
    } else { c.font = `${r[3] ? 700 : 400} 12px ${FONT_MONO}`; c.fillStyle = r[3] ? TXT : DIM; c.fillText(r[1], px, r[2] + 8); }
  }
  // cursor: keyframes [time, target]; it follows the slider knob while dragging
  const off = [x + w + 60, y0 + h + 40];
  const keys = nube ? [[0.5, off], [1.4, targets.cloud], [SPN.drag1 + 0.6, targets.cloud], [SPN.out, off]]
    : [[0.5, off], [1.4, targets.sim], [SPI.load + 0.6, targets.sim], [SPI.load + 1.4, off], [SPI.apply - 1.0, off], [SPI.apply - 0.1, targets.apply], [SPI.apply + 0.8, targets.apply], [SPI.out, off]];
  let cp = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) if (e >= keys[i][0]) { const f = easeInOut(seg(e, keys[i][0], keys[i + 1][0])); cp = [lerp(keys[i][1][0], keys[i + 1][1][0], f), lerp(keys[i][1][1], keys[i + 1][1][1], f)]; }
  const clicks = nube ? [SPN.drag0] : [SPI.load, SPI.apply];
  for (const t0 of clicks) { const q = seg(e, t0, t0 + 0.45); if (q > 0 && q < 1) { c.strokeStyle = LIME; c.lineWidth = 3; c.globalAlpha = a * (1 - q); c.beginPath(); c.arc(cp[0], cp[1], 8 + 22 * q, 0, Math.PI * 2); c.stroke(); c.globalAlpha = a; } }
  c.translate(cp[0], cp[1]); c.beginPath(); [[0, 0], [0, 24], [6, 18], [11, 28], [15, 26], [10, 16], [18, 16]].forEach(([u, v], i) => i ? c.lineTo(u, v) : c.moveTo(u, v)); c.closePath();
  c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.restore();
}
const SP_RC = { coral: '#ff9e93', amber: '#ffcf6b', lime: '#c8f04a' };
const spHour = (h) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

// sun, beam and panel normal. A tree or a cloud in the way turns the beam grey.
function spSunRay(G, st, sunW, pc) {
  const c = G.ctx, P = (q) => G.cam.p(q), now = st.now, open = (1 - now.shade) * (1 - (now.cloudB || 0));
  const S = P(sunW(now.s)), C = P(pc), cosv = now.cos * open;
  c.save(); c.setLineDash([10, 6]); c.lineDashOffset = -st.t * 30; c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(C[0], C[1]);
  c.lineWidth = 2 + 3 * cosv; c.strokeStyle = cosv > 0.01 ? `rgba(232,89,12,${0.35 + 0.6 * cosv})` : 'rgba(29,32,51,0.3)'; c.stroke(); c.restore();
  const pan = spPanel(st), Nn = P(add3(pc, mul3(pan.n, 9)));
  c.save(); c.beginPath(); c.moveTo(C[0], C[1]); c.lineTo(Nn[0], Nn[1]); c.lineWidth = 2.2; c.strokeStyle = INK; c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.arc(Nn[0], Nn[1], 3.5, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); c.restore();
  c.save();
  glowAt(c, S[0], S[1], 46, 'rgba(255,190,60,0.55)');
  c.beginPath(); c.arc(S[0], S[1], 17, 0, Math.PI * 2); c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + st.t * 0.6; c.beginPath(); c.moveTo(S[0] + Math.cos(a) * 22, S[1] + Math.sin(a) * 22); c.lineTo(S[0] + Math.cos(a) * 29, S[1] + Math.sin(a) * 29); c.lineWidth = 2.4; c.stroke(); }
  c.restore();
}

// ---- real shadows: every caster is projected along the sun ray onto the ground, the roof and the panel ----
const SP_U = PV_SCENE.unit;
const spM2W = (m, h) => enuW(mul3(m, 1 / SP_U), h);            // ENU metres -> world units
const spW2M = (w, h) => [-w[1] * h * SP_U, -w[0] * h * SP_U];  // world units on the ground -> ENU metres [e, n]
// project p along the sun direction d onto the plane z = z0, or onto the plane through C with normal n
const spOnZ = (p, d, z0) => { const k = (p[2] - z0) / d[2]; return [p[0] - d[0] * k, p[1] - d[1] * k, z0]; };
const spOnPlane = (p, d, C, n) => { const k = dot3(sub3(p, C), n) / dot3(d, n); return sub3(p, mul3(d, k)); };
// sample points on a sphere (crown) and on the rim of a cloud disk
const SP_SPH = (() => { const o = []; for (let i = 0; i < 40; i++) { const z = 1 - 2 * (i + 0.5) / 40, r = Math.sqrt(1 - z * z), a = i * 2.39996; o.push([Math.cos(a) * r, Math.sin(a) * r, z]); } return o; })();
const SP_RING = Array.from({ length: 20 }, (_, i) => [Math.cos(i / 20 * Math.PI * 2), Math.sin(i / 20 * Math.PI * 2), 0]);
const spSphere = (c, r) => SP_SPH.map(v => add3(c, mul3(v, r)));
const spDisk = (c, r) => SP_RING.map(v => add3(c, mul3(v, r)));
function spPanelCorners(st) {
  const P = spPanel(st), W2 = SP.W / 2, L2 = SP.L / 2, C = P.c;
  return [[-W2, -L2], [W2, -L2], [W2, L2], [-W2, L2]].map(([a, b]) => add3(C, add3(mul3(P.u, a), mul3(P.d, b))));
}
// fill projected world polygons as one union (no double darkening), clipped to a world polygon
function spFillUnion(G, polys, clip, color, alpha) {
  if (!polys.length || alpha <= 0.01) return;
  const c = G.ctx, P = (q) => G.cam.p(q);
  c.save(); pathPts(c, clip.map(P)); c.clip(); c.globalAlpha = alpha; c.beginPath();
  for (const poly of polys) { const h = hull(poly.map(P)); if (h.length < 3) continue; c.moveTo(h[0][0], h[0][1]); for (const q of h.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); }
  c.fillStyle = color; c.fill('nonzero'); c.restore();
}
const SP_MAT = rrPlan(-25, -25, 25, 25, 4, 6).map(([x, y]) => [x, y, 0]);
const SP_ROOF = [[-9.4, -9.4, SP.wall], [9.4, -9.4, SP.wall], [9.4, 9.4, SP.wall], [-9.4, 9.4, SP.wall]];
// ground: house, panel, post and tree (hard), then clouds (soft)
function spShadows(G, st) {
  const S = st.shadow; if (!S || S.a <= 0.01) return;
  const d = S.d, g = (pts) => pts.map(p => spOnZ(p, d, 0)), hard = [];
  const box = []; for (const x of [-10, 10]) for (const y of [-10, 10]) for (const z of [0, SP.wall + 0.8]) box.push([x, y, z]);
  hard.push(g(box));
  if ((st.parts.pan ?? 1) >= 1) { hard.push(g(spPanelCorners(st))); hard.push(g([[0.5, 0.5, SP.wall], [-0.5, -0.5, SP.wall], [0.5, 0.5, SP.pc[2]], [-0.5, -0.5, SP.pc[2]]])); }
  if (st.treeW) { const T = st.treeW; hard.push(g(spSphere(T.crown, T.r))); hard.push(g([add3(T.base, [0.4, 0, 0]), add3(T.base, [-0.4, 0, 0]), add3(T.crown, [0.4, 0, 0]), add3(T.crown, [-0.4, 0, 0])])); }
  spFillUnion(G, hard, SP_MAT, SHADOW_FLOOR, S.a * 0.85);
  spFillUnion(G, (st.cloudsW || []).map(cl => g(spDisk(cl.c, cl.r))), SP_MAT, 'rgba(36,40,110,0.42)', S.a);
}
// roof (drawn after the house, before the panel): panel, crown and clouds above the roof plane
function spRoofShadows(G, st) {
  const S = st.shadow; if (!S || S.a <= 0.01) return;
  const d = S.d, r = (pts) => pts.filter(p => p[2] > SP.wall + 0.05).map(p => spOnZ(p, d, SP.wall));
  const hard = [r(spPanelCorners(st))];
  if (st.treeW) hard.push(r(spSphere(st.treeW.crown, st.treeW.r)));
  spFillUnion(G, hard.filter(h => h.length >= 3), SP_ROOF, SHADOW_FLOOR, S.a * 0.55);
  spFillUnion(G, (st.cloudsW || []).map(cl => r(spDisk(cl.c, cl.r))).filter(h => h.length >= 3), SP_ROOF, 'rgba(36,40,110,0.42)', S.a);
}
// panel face: crown and cloud shadows, only while the sun is in front of the panel
function spPanelShadows(G, st, P) {
  const S = st.shadow; if (!S || S.a <= 0.01 || dot3(S.d, P.n) <= 0.02) return;
  const C = P.c, on = (pts) => pts.filter(p => dot3(sub3(p, C), P.n) > 0).map(p => spOnPlane(p, S.d, C, P.n));
  const clip = spPanelCorners(st), hard = [];
  if (st.treeW) { const h = on(spSphere(st.treeW.crown, st.treeW.r)); if (h.length >= 3) hard.push(h); }
  spFillUnion(G, hard, clip, 'rgba(8,12,40,0.62)', S.a);
  spFillUnion(G, (st.cloudsW || []).map(cl => on(spDisk(cl.c, cl.r))).filter(h => h.length >= 3), clip, 'rgba(8,12,40,0.38)', S.a);
}
// the tree (model.js pvTreeCrown, metres -> scene units)
const SP_LEAF = { light: '#a6d96a', mid: '#66a83f', dark: '#3d7a2a' }, SP_BARK = { light: '#b07a4a', mid: '#8a5a32', dark: '#5f3d22' };
function spTree(G, st) {
  const T = st.treeW, xf = new Xf(), c = G.ctx;
  drawCyl(G, xf, [T.base[0], T.base[1], T.crown[2] / 2], 'z', 0.3 / SP_U, T.crown[2], SP_BARK, { seg: 14, lw: 1.4 });
  drawSphere(G, xf, T.crown, T.r, SP_LEAF, { lw: 1.8 });
  if (SP_DRAG) { const B = G.cam.p(T.base); c.save(); c.beginPath(); c.arc(B[0], B[1], 10, 0, Math.PI * 2); c.fillStyle = '#c8f04a'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); }
}
// clouds: a puffy outline around each model disk, drawn opaque on a layer, then laid over the scene see-through
let SP_OFF = null;
function spCloudsDraw(G, st) {
  const c = G.ctx, z = G.cam.z, cv = c.canvas;
  if (!SP_OFF) SP_OFF = document.createElement('canvas');
  if (SP_OFF.width !== cv.width || SP_OFF.height !== cv.height) { SP_OFF.width = cv.width; SP_OFF.height = cv.height; }
  const o = SP_OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, SP_OFF.width, SP_OFF.height); o.setTransform(c.getTransform());
  for (const cl of st.cloudsW) {
    const A = G.cam.p(cl.c), r = cl.r * z * 0.62;
    if (A[1] < 110 || A[0] < CARD.x - 80 || A[0] > CARD.x + CARD.w + 80) continue;
    const puff = () => { o.beginPath(); for (const [dx, dy, k] of [[-0.75, 0.2, 0.6], [0, -0.15, 0.85], [0.75, 0.2, 0.6], [0.25, 0.32, 0.55], [-0.3, 0.3, 0.5]]) { o.moveTo(A[0] + dx * r + k * r, A[1] + dy * r); o.arc(A[0] + dx * r, A[1] + dy * r, k * r, 0, Math.PI * 2); } };
    puff(); o.lineWidth = 3.2; o.strokeStyle = '#1d2033'; o.stroke();
    puff(); o.fillStyle = '#ffffff'; o.fill();
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.55; c.drawImage(SP_OFF, 0, 0); c.restore();
}

// ---- drag the tree with the mouse (live mode) ------------------------------------------------------------
let SP_DRAG = null, SP_CAM = null, SP_LAST = null;
function spStagePt(e, cv) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VIEWPORT.w + VIEWPORT.x, (e.clientY - r.top) / r.height * VIEWPORT.h + VIEWPORT.y]; }
function spGround(cam, sx, sy) {  // screen -> world point on z = 0
  const a = (sx - cam.ox) / cam.z, b = (cam.oy - sy) / cam.z, det = VR[0] * VU[1] - VR[1] * VU[0];
  return [(a * VU[1] - VR[1] * b) / det, (VR[0] * b - a * VU[0]) / det, 0];
}
function spTreeHit(sx, sy) {
  const st = SP_LAST; if (!SP_CAM || !st || !st.treeW || !LIVE.on) return false;
  const T = st.treeW, A = SP_CAM.p(T.crown), B = SP_CAM.p(T.base);
  return Math.hypot(sx - A[0], sy - A[1]) < T.r * SP_CAM.z || Math.hypot(sx - B[0], sy - B[1]) < 22;
}
function spTreeMove(sx, sy) {
  const h = SP_LAST.hemi, w = spGround(SP_CAM, sx, sy);
  let [e, n] = spW2M(w, h); e = clamp(e, -9.6, 9.6); n = clamp(n, -9.6, 9.6);
  if (Math.abs(e) < 4.8 && Math.abs(n) < 4.8) { if (Math.abs(e) > Math.abs(n)) e = Math.sign(e || 1) * 4.8; else n = Math.sign(n || 1) * 4.8; } // never inside the house
  SP_DRAG = { tx: Math.round(e * 10) / 10, ty: Math.round(n * 10) / 10 };
}
if (typeof window !== 'undefined' && !new URLSearchParams(location.search).has('render')) {
  window.addEventListener('pointerdown', (e) => {
    if (e.target.id !== 'stage') return; const [sx, sy] = spStagePt(e, e.target);
    if (!spTreeHit(sx, sy)) return; e.preventDefault(); e.target.setPointerCapture(e.pointerId); spTreeMove(sx, sy);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.target.id !== 'stage') return; const [sx, sy] = spStagePt(e, e.target);
    if (SP_DRAG) spTreeMove(sx, sy); else e.target.style.cursor = spTreeHit(sx, sy) ? 'grab' : '';
  });
  window.addEventListener('pointerup', () => { if (!SP_DRAG) return; const d = SP_DRAG; liveSet('tx', d.tx); liveSet('ty', d.ty); SP_DRAG = null; });
}

// ---- left settings panel: every knob and the live buttons, hideable ----------------------------------------
const SP_GROUPS = [['MOMENTO', ['fecha', 'hora']], ['UBICACIÓN', ['lat', 'lon', 'utc']], ['PANEL', ['tilt', 'azi', 'kwp']], ['ENTORNO', ['cloud', 'tree']]];
function spSidebar() {
  const q = new URLSearchParams(location.search); if (q.has('render') || q.has('embed')) return;
  const knobs = document.querySelectorAll('#bar .knob'), lb = document.getElementById('livebtn');
  if (knobs.length < DEMO.knobs.length || !lb) { setTimeout(spSidebar, 60); return; }
  const W = 300, css = document.createElement('style');
  css.textContent = `#cfg{position:fixed;left:0;top:0;bottom:0;width:${W}px;background:#121316;border-right:1.5px solid #26292f;padding:16px 16px 24px;overflow:auto;z-index:5;transition:transform .2s}
#cfg.off{transform:translateX(-100%)} #cfg h3{font:700 12px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#c8f04a;margin:18px 0 8px}
#cfg .top{display:flex;justify-content:space-between;align-items:center;font:700 13px 'JetBrains Mono',monospace;letter-spacing:.1em;color:#e8eaee;margin-bottom:12px}
#cfg .knob{display:grid;grid-template-columns:1fr auto;gap:4px 8px;margin:0 0 12px;font-size:11.5px}
#cfg .knob input{grid-column:1/3;width:100%} #cfg .knob .v{text-align:right;min-width:0}
#cfg button{font:700 12px 'JetBrains Mono',monospace;color:#e8eaee;background:#1b1d22;border:1.5px solid #34373e;border-radius:999px;padding:7px 11px;cursor:pointer}
#cfg #livebtn{border-color:#c8f04a;color:#c8f04a;width:100%;margin-bottom:8px} #cfg #livebtn.on{background:#c8f04a;color:#1d2033}
#cfg #live{display:flex;gap:8px;flex-wrap:wrap} #cfg #live .hold{background:#24262d;border-color:#c8f04a;touch-action:none;user-select:none;padding:8px 14px 8px 8px}
#cfg #live .hold kbd{font:700 11px 'JetBrains Mono',monospace;background:#c8f04a;color:#1d2033;border-radius:5px;padding:2px 6px;margin-right:8px} #cfg #live .hold.on{background:#c8f04a;color:#1d2033}
#cfg p{font-size:11px;color:#8b909a;line-height:1.55;margin:14px 0 0} #cfg .data button{margin:0 4px 6px 0} #cfg .data button:disabled{opacity:.4;cursor:default} #cfg .data p{margin:4px 0 8px} #cfg .data b{color:#e8eaee}
#cfgbtn{position:fixed;left:12px;top:12px;z-index:6;font:700 12px 'JetBrains Mono',monospace;color:#1d2033;background:#c8f04a;border:0;border-radius:999px;padding:8px 13px;cursor:pointer}`;
  document.head.appendChild(css);
  const box = document.createElement('aside'); box.id = 'cfg';
  box.innerHTML = '<div class="top"><span>⚙ CONFIGURACIÓN</span><button id="cfgclose" title="Ocultar">✕</button></div>';
  box.appendChild(lb); box.appendChild(document.getElementById('live'));
  const byKey = {}; DEMO.knobs.forEach((k, i) => { byKey[k.key] = knobs[i]; });
  for (const [title, keys] of SP_GROUPS) { const h = document.createElement('h3'); h.textContent = title; box.appendChild(h); for (const k of keys) box.appendChild(byKey[k]); }
  spDataPanel(box);
  const tip = document.createElement('p'); tip.innerHTML = 'Arrastra el <b>árbol</b> en la escena: su sombra sigue al sol.<br>Las <b>nubes</b> viajan con el viento; cuando su sombra pasa por el panel, la potencia baja.<br><b>Espacio</b> pausa el sol.'; box.appendChild(tip);
  // drop focus after a click so Space pauses the sun instead of pressing the button again
  box.addEventListener('click', (e) => { if (e.target.closest('button')) e.target.closest('button').blur(); });
  document.body.appendChild(box);
  const btn = document.createElement('button'); btn.id = 'cfgbtn'; btn.textContent = '⚙ Configuración'; document.body.appendChild(btn);
  const cv = document.getElementById('stage');
  const layout = () => {
    const open = !box.classList.contains('off'); btn.style.display = open ? 'none' : '';
    document.body.style.paddingLeft = open ? `${W + 12}px` : '';
    if (!open) return;
    const bar = document.getElementById('bar'), aw = window.innerWidth - W - 36, ah = window.innerHeight - (bar ? bar.offsetHeight : 0) - 24;
    const k = Math.min(aw / STAGE.w, ah / STAGE.h, 1.25); cv.style.width = Math.round(STAGE.w * k) + 'px'; cv.style.height = Math.round(STAGE.h * k) + 'px';
  };
  const toggle = (open) => { box.classList.toggle('off', !open); window.dispatchEvent(new Event('resize')); };
  document.getElementById('cfgclose').onclick = () => toggle(false); btn.onclick = () => toggle(true);
  window.addEventListener('resize', layout); layout();
}
if (typeof window !== 'undefined') window.addEventListener('load', spSidebar);
// manual Play: the kit starts Play on any live change; keep whatever the viewer chose instead
if (typeof window !== 'undefined' && !new URLSearchParams(location.search).has('render')) window.addEventListener('load', () => {
  const set0 = liveSet, start0 = liveStart;
  liveSet = (key, v) => { const was = playing; set0(key, v); playing = was; };
  liveStart = () => { start0(); playing = false; };
  liveStart();      // the app opens on the free mode, paused; the guided video is in the chapter buttons below
});

const DEMO = {
  id: 'PANEL', num: '05', title: 'PANEL SOLAR', tagline: 'ORIENTA · INCLINA · COSECHA', category: 'ENERGÍA', brand: 'SIMULAB',
  plate: ['SIMULAB · PANEL SOLAR', 'hacia dónde y cuánto inclinar tu panel en Tandil'],
  chips: ['SOL CALCULADO · 3 DÍAS CLAVE · AÑO COMPLETO', 'ENERGÍA'],
  caption: 'Apunta al ecuador e inclínalo casi tu latitud.',
  intro: { seconds: 5, lines: ['¿Hacia dónde y cuánto se inclina', 'tu panel solar?'], pill: 'PANEL SOLAR' },
  major: ['casa', 'pan'],
  params: { kwp: 5.5, fecha: 321, hora: 13, lat: -37.3, lon: -59.1, utc: -3, tilt: 33, azi: 0, cloud: 30, tree: 10, tx: -3, ty: 7 },
  knobs: [
    { key: 'fecha', label: 'FECHA', min: 1, max: 365, step: 1, live: true, fmt: (v) => spDate(v) },
    { key: 'hora', label: 'HORA (RELOJ)', min: 0, max: 23.75, step: 0.25, live: true, fmt: (v) => spHour(v) },
    { key: 'lat', label: 'LATITUD', min: -60, max: 60, step: 1, live: true, fmt: (v) => `${spLat(v)}${spCity(v) ? ' · ' + spCity(v) : ''}` },
    { key: 'lon', label: 'LONGITUD', min: -180, max: 180, step: 0.5, live: true, fmt: (v) => `${Math.abs(v)}° ${v >= 0 ? 'E' : 'O'}` },
    { key: 'utc', label: 'HUSO', min: -12, max: 14, step: 1, live: true, fmt: (v) => `UTC${v >= 0 ? '+' : '−'}${Math.abs(v)}` },
    { key: 'tilt', label: 'INCLINACIÓN', min: 0, max: 90, step: 1, live: true, fmt: (v) => `${v}°` },
    { key: 'azi', label: 'GIRO', min: -180, max: 180, step: 1, live: true, fmt: (v) => v === 0 ? '0° · al ecuador' : `${Math.abs(v)}° al ${v > 0 ? 'oeste' : 'este'}` },
    { key: 'kwp', label: 'POTENCIA INSTALADA', min: 0.5, max: 20, step: 0.5, live: true, fmt: (v) => `${v} kWp` },
    { key: 'cloud', label: 'NUBES', min: 0, max: 100, step: 10, live: true, fmt: (v) => `${v} % del cielo` },
    { key: 'tree', label: 'ÁRBOL', min: 0, max: 15, step: 1, live: true, fmt: (v) => v ? `${v} m de alto · arrástralo` : 'sin árbol' },
  ],
  live: { label: 'Modo libre', controls: [] },
  timeline: (p) => spTimeline(p || {}),
  // chapter buttons always come from the guided timeline, even while the free mode is on
  steps: (TL) => { const V = TL.live ? spTimeline({}) : TL; return [['0 · Armar', 0], ...V.CH.map((c, i) => [`${i + 1} · ${c.btn}`, c.t0 - 0.05]), ['6 · Nubes', V.T.nube0], ['7 · Inversor', V.T.inv0]]; },
  state: (TL, t) => spState(TL, t),
  drawScene(G, st, TL) {
    drawTapete(G, st, { x0: -25, x1: 25, y0: -25, y1: 25 });
    SP_CAM = G.cam;
    spShadows(G, st);
    const base = new Xf();
    st.treeBehind = st.treeW && depthOf(st.treeW.base) < depthOf([0, 0, 0]);
    if (st.treeBehind) spTree(G, st);
    drawAssembly(G, st, TL.insts, base);
    return base;
  },
  drawFx(G, st, TL) {
    if (!TL.live && st.placedCount < TL.total) return;
    const c = G.ctx, P = (q) => G.cam.p(q), pc = SP.pc, R = SP.R, h = st.hemi;
    const sunW = (s) => add3(pc, mul3(enuW(s, h), R));
    // the three day arcs
    PV_DAYS.forEach(([n], i) => {
      const [h0, h1] = pvDay(st.lat, n), pts = [];
      for (let k = 0; k <= 48; k++) { const s = pvSun(st.lat, n, lerp(h0, h1, k / 48)); if (s[2] >= -0.01) pts.push(P(sunW(s))); }
      if (pts.length < 2) return;
      const cur = st.sweep && st.sweep.k === i;
      c.save(); c.setLineDash(cur ? [] : [5, 6]); c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.lineWidth = cur ? 2.4 : 1.4; c.strokeStyle = cur ? '#e8590c' : 'rgba(232,89,12,0.45)'; c.stroke(); c.restore();
      // day name at whichever end of its arc sits higher on screen (open sky, away from the house)
      const m = pts[0][1] < pts[pts.length - 1][1] ? pts[0] : pts[pts.length - 1];
      if (!st.sweep || cur) pill(c, m[0] + 38, m[1] - 8, PV_DAYS[i][1], { align: 'left', valign: 'middle', size: 10.5, padY: 3, padX: 6, shadow: false, lw: 1.2, bg: cur ? '#ffcf6b' : '#fffdf8', alpha: cur ? 1 : 0.85 });
    });
    if (st.sweep && st.sweep.k < 0) {
      const n = st.sweep.n, [h0, h1] = pvDay(st.lat, n), pts = [];
      for (let k = 0; k <= 48; k++) { const s = pvSun(st.lat, n, lerp(h0, h1, k / 48)); if (s[2] >= -0.01) pts.push(P(sunW(s))); }
      if (pts.length > 1) { c.save(); c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.lineWidth = 2.4; c.strokeStyle = '#e8590c'; c.stroke(); c.restore();
        const m = pts[0][1] < pts[pts.length - 1][1] ? pts[0] : pts[pts.length - 1];
        pill(c, m[0] + 38, m[1] - 8, spDate(n).toUpperCase(), { align: 'left', valign: 'middle', size: 10.5, padY: 3, padX: 6, shadow: false, lw: 1.2, bg: '#ffcf6b' }); }
    }
    if (st.treeW && !st.treeBehind) spTree(G, st);
    if (st.now && st.now.up > 0) spSunRay(G, st, sunW, pc);
    if (st.cloudsW && st.cloudsW.length) spCloudsDraw(G, st);
  },
  drawOverCard(c, st, TL) { if (st.extra) spMock(c, st); },
  labelAlpha(TL, inst, t) { return TL.live ? 0 : labelAlphaDefault(TL, inst, t); },
  drawNotes(G, st, TL) {
    const c = G.ctx, P = (p) => G.cam.p(p), ch = st.ch, u = st.u, now = st.now;
    const cap = !TL.live && st.t >= TL.T.caption - 0.3;
    const dur = ch ? ch.t1 - ch.t0 : 0, fade = (a, b) => seg(u, a, a + 0.25) * (1 - seg(u, b - 0.25, b));
    if (now && now.up > 0 && !cap) {
      const pan = spPanel(st), A = P(add3(SP.pc, mul3(pan.n, 9)));
      const th = Math.round(now.theta), txt = now.shade > 0.5 ? `θ = ${th}° · LO TAPA EL ÁRBOL` : (now.cloudB || 0) > 0.5 ? `θ = ${th}° · PASA UNA NUBE` : now.shade + (now.cloudB || 0) > 0 ? `θ = ${th}° · SOMBRA PARCIAL` : now.cos <= 0 ? `θ = ${th}° · NO LE PEGA` : `θ = ${th}° · ${Math.round(now.cos * 100)} % DEL RAYO`;
      callout(c, A, -150, -40, txt, 1, now.shade + (now.cloudB || 0) > 0 ? '#ff9e93' : now.cos > 0.9 ? '#c8f04a' : now.cos > 0.5 ? '#ffcf6b' : '#ff9e93');
    }
    if (st.extra) {
      const e = st.eu, D = st.extra === 'nube' ? SP_NUBE_D : SP_INV_D, a = seg(e, 0.1, 0.4) * (1 - seg(e, D - 0.35, D - 0.05));
      const tip = st.extra === 'nube' ? ['Nubes: su sombra viaja con el viento', 'y baja la potencia cuando pasa por el panel.']
        : e < SPI.load ? ['Esto midió tu inversor en noviembre.', '¿Cómo está montado de verdad el panel?']
        : e < SPI.apply ? ['Azul: lo real. Naranja: lo teórico', `para ${SPI.tilt0}° al norte. No coinciden.`]
        : [`Los datos dicen ${st.diag.tilt}° y ${spDeg(st.diag.azi).replace(' O', ' al oeste')},`, `y un árbol que tapa de ${st.diag.shade.map(spWin).join(', ')}.`];
      tipCard(c, CARD.x + 30, 146, tip, a, st.extra === 'nube' ? 'PANEL DE CONFIGURACIÓN' : 'DATOS DEL INVERSOR');
    }
    if (ch && !cap) {
      tipCard(c, CARD.x + 30, 146, ch.tip, fade(0.3, dur - 0.05), `${spCity(ch.lat)} · ${spLat(ch.lat)} · ${ch.tilt}° · ${spDir(ch.lat, ch.azi)}`);
      if (st.done) { const r = pvVeredicto(ch.share), A = P([10, 10, 0]); callout(c, A, -190, 70, `${Math.round(ch.share * 100)} % DEL MEJOR · ${r[1]}`, fade(SP_LEAD + SP_SWEEP, dur), SP_RC[r[2]]); }
    }
    if (cap) {
      const a = seg(st.t, TL.T.caption + 0.5, TL.T.caption + 0.9);
      TL.CH.forEach((cc, i) => {
        const r = pvVeredicto(cc.share);
        pill(c, CARD.x + 30, 150 + i * 46, `${i + 1} · ${spCity(cc.lat)} · ${cc.tilt}° ${spDir(cc.lat, cc.azi)} · ${Math.round(cc.share * 100)} %`, { bg: SP_RC[r[2]], size: 14, padY: 9, alpha: a * seg(st.t, TL.T.caption + 0.5 + i * 0.15, TL.T.caption + 0.8 + i * 0.15) });
      });
    }
    if (TL.live) {
      const b = pvBest(st.lat, st.env);
      tipCard(c, CARD.x + 30, 146, [`${spCity(st.lat) || 'Tu casa'} · ${spLat(st.lat)}: lo mejor es ${b.tilt}° ${spDir(st.lat, 0)}.`, `${spDate(st.sweep.n)} · ${spHour(st.sweep.clock)} · ▶ avanza la hora, ❚❚ la congela`], 1, 'MODO LIBRE');
    }
  },
  drawBays(c, TL, st) {
    if (TL.live) spSyncKnobs(st);
    const now = st.now, sw = st.sweep;
    // BAY 01 · angle between sun and panel
    const th = now && now.up > 0 ? now.theta : null, cs = now ? now.cos * (1 - now.shade) * (1 - (now.cloudB || 0)) : 0;
    let b = bayFrame(c, 0, 'BAY 01 · ÁNGULO SOL-PANEL', th == null ? 'NOCHE' : now.shade + (now.cloudB || 0) > 0 ? ((now.cloudB || 0) > now.shade ? 'NUBE' : 'ÁRBOL') : cs > 0.9 ? 'DE FRENTE' : cs > 0.5 ? 'DE LADO' : cs > 0 ? 'DE CANTO' : 'POR DETRÁS', th == null ? BAY_BG.grey : now.shade + (now.cloudB || 0) > 0 ? BAY_BG.coral : cs > 0.9 ? BAY_BG.lime : cs > 0.5 ? BAY_BG.amber : BAY_BG.coral);
    bigValue(c, b, th == null ? '--' : `${Math.round(th)}°`, 'θ', 'entre el rayo y la normal del panel');
    c.save();
    const gx = b.x + 14, gw = b.w - 28, gy = b.y + 128;
    c.fillStyle = '#f4f1ea'; rr(c, gx, gy, gw, 20, 10); c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    c.fillStyle = cs > 0.9 ? '#9bd14a' : cs > 0.5 ? '#ffb547' : '#ff6a5c'; rr(c, gx + 3, gy + 3, Math.max(0, (gw - 6) * cs), 14, 7); c.fill();
    c.font = `400 11px ${FONT_MONO}`; c.fillStyle = '#6b6f7a'; c.fillText(`cos θ = ${cs.toFixed(2)} → capta ${Math.round(cs * 100)} % del rayo directo`, gx, gy + 44);
    c.restore();
    // BAY 02 · sunlight on the panel now + the day curve
    b = bayFrame(c, 1, 'BAY 02 · LUZ EN EL PANEL', sw ? (sw.k < 0 ? `${spDate(sw.n).toUpperCase()} · ${spHour(sw.clock)}` : `${PV_DAYS[sw.k][1]} · ${spHour(sw.h)}`) : '--', sw ? BAY_BG.cyan : BAY_BG.grey);
    bigValue(c, b, now ? String(Math.round(now.poa * 1000)) : '0', 'W/m²', sw ? `solar ${spHour(sw.h)} · reloj ${spHour(pvClock(sw.h, sw.n, st.lon, st.utc))}` : 'directa + difusa + reflejada');
    chartBox(c, b);
    if (sw) {
      const lat = st.lat, tl = Math.round(st.tilt), az = Math.round(st.azi), best = pvBest(lat, st.env).tilt;
      const X = (hh) => b.cx + 6 + (hh - 4) / 16 * (b.cw - 12), Y = (p) => b.cy + b.ch - 6 - p / 1.1 * (b.ch - 14);
      const line = (pts, col, w, dash) => { c.save(); c.setLineDash(dash || []); c.beginPath(); pts.forEach(([hh, p], j) => j ? c.lineTo(X(hh), Y(p)) : c.moveTo(X(hh), Y(p))); c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.restore(); };
      line(spCurve(lat, best, 0, sw.n, st.env), 'rgba(29,32,51,0.35)', 1.4, [4, 4]);
      const cur = spCurve(lat, tl, az, sw.n, st.env), done = cur.filter(p => p[0] <= sw.h);
      if (done.length > 1) { c.save(); c.beginPath(); c.moveTo(X(done[0][0]), Y(0)); done.forEach(([hh, p]) => c.lineTo(X(hh), Y(p))); c.lineTo(X(done[done.length - 1][0]), Y(0)); c.closePath(); c.fillStyle = 'rgba(255,181,71,0.45)'; c.fill(); c.restore(); }
      line(cur, '#e8590c', 2);
      pill(c, b.cx + b.cw - 6, b.cy + 6, `- - mejor ${best}°`, { align: 'right', bg: '#fffdf8', size: 9, padY: 3, padX: 6, ls: 0.5, shadow: false, lw: 1 });
    }
    if (TL.live && SP_DATA) { spDataBays(c, st); return; }
    if (st.dataOn) { spDataBays(c, st, spVData()); return; }
    // BAY 03 · the three days, kWh/m², against the best tilt
    b = bayFrame(c, 2, 'BAY 03 · ENERGÍA POR DÍA', 'kWh/m² · día', BAY_BG.grey);
    c.save();
    const best = pvBest(st.lat, st.env).tilt, cols = PV_DAYS.length, cw = (b.w - 28) / cols;
    PV_DAYS.forEach(([n, name], i) => {
      const E = pvDayE(st.lat, Math.round(st.tilt), Math.round(st.azi), n, st.env), Eb = pvDayE(st.lat, best, 0, n, st.env);
      const vis = TL.live || !st.ch ? 1 : sw ? (i < sw.k ? 1 : i === sw.k ? sw.f : 0) : st.done ? 1 : 0;
      const x = b.x + 14 + i * cw + 10, w = cw - 20, y0 = b.y + 178, Hm = 120, s = Hm / 11;
      c.lineWidth = 1.3; c.strokeStyle = 'rgba(29,32,51,0.45)'; c.setLineDash([3, 3]); c.strokeRect(x, y0 - Eb * s, w, Eb * s); c.setLineDash([]);
      c.fillStyle = '#ffb547'; c.fillRect(x + 4, y0 - E * s * vis, w - 8, E * s * vis); c.strokeStyle = INK; c.strokeRect(x + 4, y0 - E * s * vis, w - 8, E * s * vis);
      c.fillStyle = INK; c.font = `700 12px ${FONT_MONO}`; c.textAlign = 'center';
      if (vis > 0) c.fillText((E * vis).toFixed(1), x + w / 2, y0 - Math.max(E * s * vis, Eb * s) - 8);
      c.font = `700 10px ${FONT_MONO}`; c.fillStyle = '#545867'; c.fillText(name, x + w / 2, y0 + 16);
    });
    c.restore();
    // BAY 04 · the year
    const show = TL.live || st.done, r = pvVeredicto(st.share), B = pvBest(st.lat, st.env);
    b = bayFrame(c, 3, 'BAY 04 · TODO EL AÑO', show ? r[1] : st.ch ? 'CALCULANDO' : '--', show ? BAY_BG[r[2]] : BAY_BG.grey);
    bigValue(c, b, show ? `${Math.round(st.share * 100)}` : '--', '% del mejor', show ? `${Math.round(pvYear(st.lat, Math.round(st.tilt), Math.round(st.azi), st.env))} de ${Math.round(B.E)} kWh/m²·año` : 'corre los 3 días…');
    c.save();
    const list = TL.live ? [] : TL.CH.slice(0, Math.max(0, st.k + (st.done ? 1 : 0)));
    const bw = (b.w - 28 - 4 * 6) / 5;
    for (let i = 0; i < (TL.live ? 0 : 5); i++) {
      const cc = list[i], x = b.x + 14 + i * (bw + 6), y = b.y + 122, rr2 = cc ? pvVeredicto(cc.share) : null;
      c.fillStyle = rr2 ? SP_RC[rr2[2]] : '#fffdf8'; rr(c, x, y, bw, 58, 8); c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; c.textAlign = 'center'; c.font = `700 9.5px ${FONT_MONO}`; c.fillText(cc ? cc.btn.toUpperCase().slice(0, 8) : TL.live ? '' : `${i + 1}`, x + bw / 2, y + 18);
      c.font = `700 14px ${FONT_MONO}`; c.fillText(cc ? `${Math.round(cc.share * 100)}%` : '·', x + bw / 2, y + 42);
    }
    if (TL.live) { c.textAlign = 'left'; c.font = `400 11.5px ${FONT_MONO}`; c.fillStyle = '#6b6f7a'; {
      const e = st.env, clear = pvYear(st.lat, Math.round(st.tilt), Math.round(st.azi)), lose = (1 - pvYear(st.lat, Math.round(st.tilt), Math.round(st.azi), e) / clear) * 100;
      c.fillText(`mejor con este cielo: ${B.tilt}° ${spDir(st.lat, 0).toLowerCase()}`, b.x + 14, b.y + 140);
      c.fillText(`nubes ${Math.round(e.cloud * 100)} % · árbol ${e.tree ? e.tree + ' m a ' + Math.hypot(e.tx, e.ty).toFixed(1) + ' m' : 'no'}`, b.x + 14, b.y + 160);
      c.fillText(`pierdes ${lose.toFixed(1)} % frente a cielo limpio`, b.x + 14, b.y + 180);
    } }
    c.restore();
  },
  speedBadge(TL, st) {
    if (TL.live) return playing ? { txt: `▶ ${SP_RATE} h POR SEGUNDO`, bg: BAY_BG.coral } : { txt: '❚❚ EN PAUSA', bg: BAY_BG.lime };
    if (st.extra === 'nube') return { txt: `NUBES ${Math.round(st.envNow.cloud * 100)} % · SOMBRA EN VIVO`, bg: BAY_BG.cyan };
    if (st.extra === 'inv') return st.eu < SPI.load ? { txt: 'DATOS DEL INVERSOR', bg: BAY_BG.cyan } : st.eu < SPI.apply + 1.3 ? { txt: 'NO COINCIDE', bg: BAY_BG.amber } : { txt: 'COINCIDE', bg: BAY_BG.lime };
    if (!st.ch) return st.placedCount < TL.total ? { txt: 'ARMANDO', bg: BAY_BG.amber } : { txt: 'LISTO', bg: BAY_BG.lime };
    if (st.t >= TL.T.caption) return { txt: '5 POSICIONES · 1 REGLA', bg: BAY_BG.lime };
    if (st.sweep) return { txt: '1 DÍA = 2.6 s · ADELANTADO', bg: BAY_BG.coral };
    if (st.done) { const r = pvVeredicto(st.ch.share); return { txt: r[1], bg: BAY_BG[r[2]] }; }
    return { txt: 'GIRANDO EL PANEL', bg: BAY_BG.amber };
  },
  audioCues(TL) {
    if (TL.live) return [];
    const cu = [];
    for (const ch of TL.CH) {
      const a = ch.t0 + SP_LEAD, b = a + SP_SWEEP;
      cu.push({ type: 'whoosh', t: ch.t0, t1: ch.t0 + 0.9 }, { type: 'detent', t: ch.t0 + 0.3 });
      PV_DAYS.forEach((_, i) => cu.push({ type: 'blip', t: a + i * SP_DAYV, f: 660 + i * 110 }));
      cu.push({ type: 'whir', t: a, t1: b, f: 140, gain: 0.03 });
      cu.push({ type: pvVeredicto(ch.share)[2] === 'lime' ? 'ding' : 'error', t: b + 0.1 });
    }
    const N0 = TL.T.nube0, I0 = TL.T.inv0;
    cu.push({ type: 'whoosh', t: N0, t1: N0 + 0.6 });
    for (let x = SPN.drag0; x < SPN.drag1; x += 0.3) cu.push({ type: 'detent', t: N0 + x });
    cu.push({ type: 'whoosh', t: N0 + SPN.out, t1: N0 + SP_NUBE_D }, { type: 'whoosh', t: I0, t1: I0 + 0.6 });
    cu.push({ type: 'blip', t: I0 + SPI.load, f: 880 }, { type: 'whir', t: I0 + SPI.sweep0, t1: I0 + SPI.sweep1, f: 140, gain: 0.03 });
    cu.push({ type: 'blip', t: I0 + SPI.apply, f: 990 }, { type: 'ding', t: I0 + SPI.apply + 1.4 }, { type: 'whoosh', t: I0 + SPI.out, t1: I0 + SP_INV_D });
    cu.push({ type: 'whoosh', t: TL.T.caption - 0.3, t1: TL.T.caption + 0.9 }, { type: 'caption', t: TL.T.caption });
    return cu;
  },
};
