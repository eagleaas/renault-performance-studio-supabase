(function (G) {
'use strict';
/* ===================== helpers ===================== */
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
const str = s => (s == null ? '' : String(s)).trim();
const num = v => { if (typeof v === 'number') return Number.isFinite(v) ? v : 0; if (v == null || v === '') return 0; const n = Number(String(v).replace(/,/g, '').trim()); return Number.isFinite(n) ? n : 0; };
const dInt = (y, m, d) => y * 10000 + m * 100 + d;
const intToDate = i => new Date(Date.UTC(Math.floor(i / 10000), Math.floor(i / 100) % 100 - 1, i % 100));
const dateToInt = d => dInt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
const ymOf = i => Math.floor(i / 100);
const ymStr = ym => `${Math.floor(ym / 100)}-${String(ym % 100).padStart(2, '0')}`;
const ymFromStr = s => Number(s.slice(0, 4)) * 100 + Number(s.slice(5, 7));
const ymAdd = (ym, n) => { let y = Math.floor(ym / 100), m = ym % 100 + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y * 100 + m; };
const daysInMonth = ym => new Date(Date.UTC(Math.floor(ym / 100), ym % 100, 0)).getUTCDate();
const addMonthsInt = (i, n) => { const y = Math.floor(i / 10000), m = Math.floor(i / 100) % 100, d = i % 100; const t = ymAdd(y * 100 + m, n); return t * 100 + Math.min(d, daysInMonth(t)); };
const dayDiff = (a, b) => Math.round((intToDate(b) - intToDate(a)) / 86400000);
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const validDay = (y, m, d) => y >= 2015 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y * 100 + m);

/* Excel serial dates → yyyymmdd, converted in UTC */
function toDay(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (!(v > 20000 && v < 80000)) return null;
    const d = new Date(Math.round((Math.floor(v) - 25569) * 86400000));
    return dateToInt(d);
  }
  if (v instanceof Date && !isNaN(v)) return dInt(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const s = String(v).trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) return toDay(Number(s));
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) { const y = +m[1], mo = +m[2], d = +m[3]; return validDay(y, mo, d) ? dInt(y, mo, d) : null; }
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) {
    let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
    let mo = a, d = b; if (a > 12) { d = a; mo = b; }
    return validDay(y, mo, d) ? dInt(y, mo, d) : null;
  }
  return null;
}
/* "Sep-26", "Sep 2026", "September 2026", serial → yyyymm */
function toYm(v) {
  if (typeof v === 'number') { const d = toDay(v); return d ? ymOf(d) : null; }
  const s = String(v || '').toLowerCase();
  const m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-_.\/]*'?(\d{4}|\d{2})\b/);
  if (m) { let y = +m[2]; if (y < 100) y += 2000; return y * 100 + MONTHS.indexOf(m[1]) + 1; }
  const m2 = s.match(/(\d{4})[-_.\s](\d{1,2})\b/);
  if (m2 && +m2[2] >= 1 && +m2[2] <= 12) return +m2[1] * 100 + +m2[2];
  return null;
}

/* ===================== branch / unit mapping ===================== */
const STANDARD_UNITS = ['Mokattam EM','Kattamia EM','Kattamia BS','Abu Rawash EM','Abu Rawash BS','Obour EM','Obour BS','Mohandessin EM','Zayed EM','CFC EM','Madinaty EM','Smouha EM','Amerya EM','Amerya BS','Assiut EM'];
const BRANCH_RULES = [
  [/mohand[ei]s+[ei]n/, 'Mohandessin'],
  [/zamalek/, 'Mohandessin', true],
  [/amer[iy]a|le\s*garage|marina/, 'Amerya'],
  [/kat+amia/, 'Kattamia'],
  [/ab[ou]\s*rawash/, 'Abu Rawash'],
  [/s[ou]+m[ou]+ha|smouha|smooha/, 'Smouha'],
  [/obour/, 'Obour'],
  [/m[ou]k+at+am/, 'Mokattam'],
  [/\bcfc\b/, 'CFC'],
  [/mad[aeiy]n[aeiy]?t[aeiy]?/, 'Madinaty'],
  [/ass?[iy]o?u?t|asyut/, 'Assiut'],
  [/zayed|za[iy]d\b|shei?kh|shiekh/, 'Zayed'],
  [/mobile/, 'Mobile Workshop'],
  [/sohag/, 'Sohag'],
  [/zee?ke?r/, 'Abu Rawash'],   // ZEEKR service lines (from Oct 2026) count under Abu Rawash, as decided by the service manager
];
function ruleBranch(raw) {
  const s = String(raw || '').toLowerCase().replace(/[_\-]+/g, ' ');
  for (const [re, b, inf] of BRANCH_RULES) if (re.test(s)) return { branch: b, inferred: !!inf };
  return null;
}
function resolvePlant(raw, cfg) {
  const o = (cfg.plants || {})[raw];
  if (o) return { branch: o, source: 'admin' };
  const r = ruleBranch(raw);
  if (r) return { branch: r.branch, source: r.inferred ? 'inferred' : 'rule' };
  return { branch: null, source: 'unknown' };
}
const DEFAULT_ADVISERS = { '2394':'Heba Hron','2398':'Michael','2427':'Otayfi','2463':'Heba Khaten','2795':'M Hassan','3008':'Ib Mohamadi','3198':'A.M. Foad','3422':'ABD EL GHANY','3508':'Mos Abd El-Naser','3598':'Dina','3704':'Ziad','40702':'Sherif M','40799':'Nour Maghribi','0':'Refund' };
const DEFAULT_CONFIG = () => ({
  plants: {},
  advisers: Object.assign({}, DEFAULT_ADVISERS),
  targetRows: {},
  targetScale: 1000,
  periodicInclude: 'perio|maintenance|maintance|maintainance|service\\s*[0-9][0-9,.]*\\s*km|صيانة\\s*[0-9]|صيانه\\s*[0-9]|صيانة\\s*سنوي|صيانه\\s*سنوي|صيانه\\s*سنه',
  periodicExclude: 'لمبه|lamp|reset',
  foadRule: true,
  modelSchedule: {},
  servicePartPrefixes: ['LO-'], serviceParts: [], servicePartsFromSchedules: true, servicePartsOnPeriodic: false,
  // part categories: checked in this order, first match wins; per-part choices (partOverride) beat every rule.
  // 'service' uses the service-part rules; anything unmatched is 'other' (repair parts)
  partCats: [
    { id: 'tyres', name: 'Tyres', prefixes: [], pattern: '\\d{3}/\\d{2}/?R?\\d{2}', jobs: '', jobsSkip: [] },
    { id: 'battery', name: 'Batteries', prefixes: ['CL-'], pattern: '', jobs: '', jobsSkip: [] },
    // job words catch paint consumables billed on paint jobs; genuine RN- parts on those jobs (bumpers, lamps…) stay repair parts
    { id: 'paint', name: 'Paint materials', prefixes: ['LOR-DX', 'LOR-XB', 'LOR-MB', 'LOR-AM', 'LOR-NS', 'LOR-AZ'], pattern: '', jobs: 'دهان|paint|بوي[هة]', jobsSkip: ['RN-'] },
  ],
  partOverride: {},
  opGroups: DEFAULT_OP_GROUPS(), opAlias: {}, opOverride: {}, partNames: {},
  opRoutine: 'check/report the lights|electric service|general check|مراجعه انوار|اشارات|غسيل|wash|حفظ حق',
  /* working bays per unit (from "Work bays by workshop (EM and BS).xlsx", Oct 2026); technicians not given yet */
  capacity: { 'Mokattam EM': { bays: 9 }, 'Kattamia EM': { bays: 11 }, 'Abu Rawash EM': { bays: 22 }, 'Obour EM': { bays: 32 }, 'Mohandessin EM': { bays: 3 }, 'Zayed EM': { bays: 3 }, 'CFC EM': { bays: 3 }, 'Madinaty EM': { bays: 3 }, 'Amerya EM': { bays: 19 }, 'Smouha EM': { bays: 7 }, 'Assiut EM': { bays: 3 }, 'Mobile Workshop EM': { bays: 1 },
    'Kattamia BS': { bays: 8 }, 'Abu Rawash BS': { bays: 16 }, 'Obour BS': { bays: 12 }, 'Amerya BS': { bays: 12 } }, capHours: 8,
  owSplits: [], owPayerRe: '', owExSrv: true, owThreshold: 50000,
  alerts: { achBelow: 0.9, discRate: 0.03, advDiscRate: 0.05, revRoDrop: 0.15, partsAchBelow: 0.9 },
  drive: { targets: '1vHVyHyIYFUrQxxualxtIPUo-fWr7_oRX', txn: '1N5UuK895vrZR8S6Ps_ewp-BIwrkW2kBy', schedules: '' },
});
function safeRe(src) { try { return src ? new RegExp(src, 'i') : null; } catch (e) { return null; } }

/* ===================== transaction parsing ===================== */
const TXN_FIELDS = {
  material: ['material'], lop: ['lop'],
  plant: ['plant'], split: ['rosplit'], act: ['embspdi'], vin: ['vehicleidentificationnumber', 'vin', 'chassisno', 'chassis'],
  order: ['order', 'ro', 'rono', 'repairorder', 'orderno', 'ordernumber'], qty: ['billedquantity'], created: ['createdon'],
  billing: ['billingdate', 'invoicedate'], adviser: ['serviceadviser', 'serviceadvisor', 'adviser', 'advisor'],
  job: ['jobdescription', 'job'], model: ['model', 'vehiclemodel'], net: ['netprice', 'netvalue', 'netamount'],
  payer: ['payer'], discPct: ['discount'], discVal: ['discountvalue', 'discountamount'], embs: ['embs'], cw: ['cw'], lvg: ['lvg'],
};
const TXN_REQUIRED = ['plant', 'order', 'billing', 'net'];
const TXN_LABELS = { plant:'Plant', split:'RO Split', act:'EM/BS/PDI', vin:'VIN', order:'Order', qty:'Billed Quantity', created:'Created On', billing:'Billing Date', adviser:'Service Advisor', job:'Job description', model:'Model', net:'Net price', payer:'Payer', discPct:'Discount %', discVal:'Discount value', embs:'EM/BS', cw:'C / W', lvg:'LV G' };
function findTxnHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const n = (rows[i] || []).map(norm);
    if (n.includes('plant') && (n.includes('netprice') || n.includes('netvalue') || n.includes('netamount'))) return i;
  }
  return -1;
}
function mapTxnHeader(hdr) {
  const n = hdr.map(norm), m = {};
  for (const [f, alts] of Object.entries(TXN_FIELDS)) for (const a of alts) { const i = n.indexOf(a); if (i >= 0) { m[f] = i; break; } }
  return m;
}
const CANDIDATE_JOB = /perio|maint|صيان|service|سنوي|سنه/i;
// jobs kept only to classify parts lines (paint works); they never mark an RO as periodic
const PART_JOB = /دهان|paint|بوي[هة]|معالجة/i;
function extractKm(job) {
  let m = job.match(/(\d{1,3})\s*k\s*(?:m\s*)?(?:periodo?i?c|perio|maint)/i);
  if (m) return +m[1] * 1000;
  m = job.match(/(\d[\d.,]{2,8})\s*(?:كم|km)/i);
  if (m) { const v = Number(m[1].replace(/[.,]/g, '')); if (v >= 1000 && v <= 900000) return v; }
  return 0;
}
function parseTxnRows(rows, fileName) {
  const h = findTxnHeader(rows);
  if (h < 0) return { ok: false, error: 'No header row with "Plant" and "Net price" found.' };
  const hdr = rows[h].map(str), map = mapTxnHeader(hdr);
  const missing = TXN_REQUIRED.filter(f => map[f] == null);
  if (missing.length) return { ok: false, error: 'Missing required columns: ' + missing.map(f => TXN_LABELS[f]).join(', '), header: hdr, map };
  const D = { plant: [], act: [], vin: [], model: [], adv: [], cw: [], lvg: [], split: [], payer: [], mat: [] }, I = {};
  for (const k in D) I[k] = new Map();
  const ix = (k, v) => { let i = I[k].get(v); if (i === undefined) { i = D[k].length; D[k].push(v); I[k].set(v, i); } return i; };
  const jobs = [], jobIx = new Map(), jobCount = [];
  const groups = new Map(), out = [], pgroups = new Map(), pout = [], gIndex = new Map(), exsrv = [];
  const opJobs = [], opJobIx = new Map(), opMap = new Map(), ops = []; // operation (job description) lines per repair order
  const st = { dateFixes: 0, partsNet: 0, labourNet: 0, otherNet: 0, lines: 0, net: 0, disc: 0, storedNet: 0, invalidDate: 0, invalidDateNet: 0, missingVin: 0, missingOrder: 0, identicalLines: 0, months: {}, minDay: 0, maxDay: 0, discLines: 0 };
  const issues = [];
  const seen = new Set();
  const g = (r, f) => (map[f] == null ? null : r[map[f]]);
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const plant = str(g(r, 'plant')), orderRaw = str(g(r, 'order'));
    const netRaw = g(r, 'net');
    if (!plant && !orderRaw && (netRaw == null || netRaw === '')) continue;
    st.lines++;
    const net = num(netRaw), disc = num(g(r, 'discVal'));
    st.net += net; st.disc += disc;
    const sig = r.join('\u0001'); if (seen.has(sig)) st.identicalLines++; else seen.add(sig);
    let day = toDay(g(r, 'billing'));
    if (day) {
      const cr = toDay(g(r, 'created'));
      if (cr && Math.floor(day / 10000) > Math.floor(cr / 10000) && dayDiff(cr, day) > 180) {
        const y = Math.floor(cr / 10000), md = day % 10000, fixed = y * 10000 + md;
        if (validDay(y, Math.floor(md / 100), md % 100) && fixed >= cr && dayDiff(cr, fixed) <= 180) { st.dateFixes = (st.dateFixes || 0) + 1; if ((st.dateFixList = st.dateFixList || []).length < 60) st.dateFixList.push({ row: i + 1, order: orderRaw, from: day, to: fixed }); day = fixed; }
      }
    }
    if (!day) {
      st.invalidDate++; st.invalidDateNet += net;
      if (issues.length < 300) issues.push({ row: i + 1, plant, order: orderRaw, billing: str(g(r, 'billing')), net, disc, vin: str(g(r, 'vin')) });
      continue;
    }
    const order = orderRaw || 'NO-RO';
    if (!orderRaw) st.missingOrder++;
    const vin = str(g(r, 'vin')).toUpperCase();
    if (!vin) st.missingVin++;
    const ym = ymStr(ymOf(day));
    const mo = st.months[ym] || (st.months[ym] = { lines: 0, net: 0, disc: 0 });
    mo.lines++; mo.net += net; mo.disc += disc;
    if (!st.minDay || day < st.minDay) st.minDay = day;
    if (day > st.maxDay) st.maxDay = day;
    if (disc !== 0) st.discLines++;
    const job = str(g(r, 'job'));
    let jobI = -1;
    if (job && CANDIDATE_JOB.test(job)) {
      jobI = jobIx.get(job);
      if (jobI === undefined) { jobI = jobs.length; jobs.push(job); jobCount.push(0); jobIx.set(job, jobI); }
      jobCount[jobI]++;
    }
    const km = jobI >= 0 ? extractKm(job) : 0;
    const lopRaw = str(g(r, 'lop')), lop = /lab/i.test(lopRaw) ? 0 : /part/i.test(lopRaw) ? 1 : 2;
    let pJobI = jobI;
    if (pJobI < 0 && lop === 1 && job && PART_JOB.test(job)) { pJobI = jobIx.get(job); if (pJobI === undefined) { pJobI = jobs.length; jobs.push(job); jobCount.push(0); jobIx.set(job, pJobI); } }
    const qty = num(g(r, 'qty'));
    const pI = ix('plant', plant), aI = ix('act', str(g(r, 'act')).toUpperCase()), mI = ix('model', str(g(r, 'model'))), cI = ix('cw', str(g(r, 'cw'))), lI = ix('lvg', str(g(r, 'lvg')).toUpperCase()), sI = ix('split', str(g(r, 'split'))), pyI = ix('payer', str(g(r, 'payer')));
    const k = [day, pI, aI, order, ix('vin', vin), mI, ix('adv', str(g(r, 'adviser'))), cI, lI, sI, pyI];
    const key = k.join('|');
    let grp = groups.get(key);
    if (!grp) { grp = k.concat([0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]); groups.set(key, grp); gIndex.set(grp, out.length); out.push(grp); }
    { const cr = toDay(g(r, 'created')); if (cr && (!grp[23] || cr < grp[23])) grp[23] = cr; }
    { const jt = (job || '(no job description)').replace(/\s+/g, ' ').slice(0, 140); let oj = opJobIx.get(jt); if (oj === undefined) { oj = opJobs.length; opJobs.push(jt); opJobIx.set(jt, oj); }
      const gi = gIndex.get(grp), ok = gi + '|' + oj; let o = opMap.get(ok); if (!o) { o = [gi, oj, 0, 0, 0, 0, 0]; opMap.set(ok, o); ops.push(o); }
      o[2] += net; o[3 + lop] += net; if (lop === 0) o[6] += qty; }
    if (/EX_SRV/i.test(str(g(r, 'material')))) exsrv.push([gIndex.get(grp), Math.round(net * 100) / 100, Math.round(disc * 100) / 100, lop, job.slice(0, 80)]);
    grp[11] += net; grp[12] += disc; grp[13]++; if (disc !== 0) grp[14]++;
    if (jobI >= 0 && grp[15] < 0) grp[15] = jobI;
    if (km > grp[16]) grp[16] = km;
    grp[17 + lop] += net; grp[21 + lop] += disc;
    if (lop === 0) grp[20] += qty;
    if (lop === 0) st.labourNet += net; else if (lop === 1) st.partsNet += net; else st.otherNet += net;
    if (lop === 1) {
      const mat = ix('mat', str(g(r, 'material')).toUpperCase() || '(no part number)');
      // [14] = 1 when the advisor is A.M. Foad (code 3198), so the Amerya body-shop rule can move these parts to BS too
      const advRaw = str(g(r, 'adviser')), foad = norm(advRaw) === 'amfoad' || advRaw === '3198' ? 1 : 0;
      const pk = [ymOf(day), pI, aI, cI, lI, mat, mI, pJobI, sI, foad].join('|');
      let pg = pgroups.get(pk);
      if (!pg) { pg = [ymOf(day), pI, aI, cI, lI, mat, mI, pJobI, sI, 0, 0, 0, 0, new Set(), foad]; pgroups.set(pk, pg); pout.push(pg); }
      pg[9] += net; pg[10] += disc; pg[11] += qty; pg[12]++; pg[13].add(pI + '|' + order);
    }
  }
  const r2 = v => Math.round(v * 100) / 100;
  for (const grp of out) { for (const j of [11, 12, 17, 18, 19, 21, 22, 23]) grp[j] = r2(grp[j]); grp[20] = Math.round(grp[20] * 1000) / 1000; st.storedNet += grp[11]; }
  for (const o of ops) { o[2] = r2(o[2]); o[3] = r2(o[3]); o[4] = r2(o[4]); o[5] = r2(o[5]); o[6] = Math.round(o[6] * 1000) / 1000; }
  for (const pg of pout) { pg[9] = r2(pg[9]); pg[10] = r2(pg[10]); pg[11] = Math.round(pg[11] * 1000) / 1000; pg[13] = pg[13].size; }
  st.net = Math.round(st.net * 100) / 100; st.storedNet = Math.round(st.storedNet * 100) / 100; st.disc = Math.round(st.disc * 100) / 100;
  let period = null, best = -1;
  for (const [ym, m] of Object.entries(st.months)) if (m.lines > best) { best = m.lines; period = ym; }
  const fy = toYm(fileName || '');
  st.groups = out.length;
  return {
    ok: true, kind: 'txn', header: hdr, map, period, fileYm: fy ? ymStr(fy) : null, stats: st,
    asset: { v: 4, kind: 'txn', dicts: D, jobs, jobCount, rows: out, parts: pout, exsrv, opJobs, ops, issues },
  };
}

/* ===================== target (DSR summary) parsing ===================== */
function parseTargetRows(rows, fileName) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) if ((rows[i] || []).some(c => norm(c).startsWith('totalbudget'))) { h = i; break; }
  if (h < 0) return { ok: false, error: 'No "Total Budget" column found.' };
  const hn = rows[h].map(norm);
  const col = (pred) => hn.findIndex(pred);
  const C = {
    budget: col(x => x.startsWith('totalbudget')),
    actual: col(x => x.startsWith('totalactual')),
    prior: col(x => x.startsWith('totalact') && !x.startsWith('totalactual')),
    labB: col(x => x.startsWith('labourbudget') || x.startsWith('laborbudget')),
    labA: col(x => x.startsWith('labouractual') || x.startsWith('laboractual')),
    othB: col(x => x.startsWith('otherbudget')), othA: col(x => x.startsWith('otheractual')),
    parB: col(x => x.startsWith('partsbudget')), parA: col(x => x.startsWith('partsactual')),
    labP: col(x => x.startsWith('actlab')), othP: col(x => x.startsWith('actother')), parP: col(x => x.startsWith('actparts')),
  };
  let ym = null, wd = null, elapsed = null, reportDate = null;
  for (let i = 0; i < h; i++) {
    const r = rows[i] || [];
    for (let j = 0; j < r.length; j++) {
      const n = norm(r[j]);
      const next = () => { for (let k = j + 1; k < r.length; k++) if (r[k] != null && r[k] !== '') return r[k]; return null; };
      if (n === 'month' && ym == null) ym = toYm(next());
      if (n.startsWith('noofdaysinthemonth') || n.startsWith('workingdays')) {
        const v = next();
        if (typeof v === 'number') wd = v;
        else if (v != null) { const m = String(v).match(/(\d+)\s*\/\s*(\d+)/); if (m) { elapsed = +m[1]; wd = +m[2]; } else if (/^\d+$/.test(String(v).trim())) wd = +v; }
      }
      if (n === 'date' && reportDate == null) { const v = next(); reportDate = typeof v === 'number' ? toDay(v) : toDay(String(v || '').replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, '$3-$2-$1')); }
    }
  }
  const fy = toYm(fileName || '');
  const warnings = [];
  if (ym == null && fy) { ym = fy; warnings.push('Month read from file name.'); }
  if (ym == null) return { ok: false, error: 'Could not read the report month (cell next to "Month :" or the file name).' };
  if (fy && fy !== ym) warnings.push(`File name suggests ${ymStr(fy)} but the sheet says ${ymStr(ym)}; the sheet value is used.`);
  if (wd == null) warnings.push('Working days not found.');
  const entries = [], ext = {}, rebuilt = { budget: 0, actual: 0 }; let netRow = null;
  let sec = 1;
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || [], name = str(r[0]);
    if (!name) continue;
    const ms = name.match(/^(\d)\s*-/); if (ms) { sec = +ms[1]; continue; }
    if (sec > 1) {
      const n = norm(name), nv = c => (typeof r[c] === 'number' ? r[c] : null);
      const key = n.startsWith('countersales') ? 'counter' : n.startsWith('dealersales') ? 'dealer' : n.startsWith('wholesales') ? 'wholesale' : n.startsWith('subtotalexternal') ? 'external' : n.startsWith('grandtotalparts') ? 'partsTotal' : n.startsWith('totalsales') ? 'totalSales' : null;
      if (key) ext[key] = key === 'totalSales' ? { budget: nv(1), actual: nv(2), prior: nv(7) } : { budget: nv(1), actual: nv(2), prior: nv(5) };
      continue;
    }
    if (/total/i.test(name)) { if (norm(name) === 'totalwsbs') netRow = { labB: typeof r[C.labB] === 'number' ? r[C.labB] : null, othB: typeof r[C.othB] === 'number' ? r[C.othB] : null, parB: typeof r[C.parB] === 'number' ? r[C.parB] : null }; continue; }
    const v = (c) => (c >= 0 && typeof r[c] === 'number' ? r[c] : (c >= 0 && r[c] != null && r[c] !== '' && Number.isFinite(num(r[c])) ? num(r[c]) : null));
    /* files saved with formulas but no stored results leave the Total columns empty: add Labour + Other + Parts instead */
    const sum3 = (a, b2, c) => { const xs = [v(a), v(b2), v(c)].filter(x => x != null); return xs.length ? xs.reduce((t, x) => t + x, 0) : null; };
    let budget = v(C.budget), actual = v(C.actual);
    if (budget == null) { budget = sum3(C.labB, C.othB, C.parB); if (budget != null) { rebuilt.budget++; (rebuilt.names = rebuilt.names || []).push(name); } }
    if (actual == null) { actual = sum3(C.labA, C.othA, C.parA); if (actual != null) rebuilt.actual++; }
    let prior = v(C.prior); if (prior == null) prior = sum3(C.labP, C.othP, C.parP);
    entries.push({ raw: name, budget, actual, prior, labB: v(C.labB), labA: v(C.labA), othB: v(C.othB), othA: v(C.othA), parB: v(C.parB), parA: v(C.parA) });
  }
  if (!entries.length) return { ok: false, error: 'No unit rows found under the header.' };
  /* when the report's own "Total W/S + B/S" row is a typed number that differs from the sum of the branch rows
     (e.g. the network total carries an uplift the branch rows do not), the branch budgets are scaled to that total,
     so every month is read the same way as reported; use the per-year target adjustment to change it */
  if (netRow && rebuilt.budget) {
    const f = {}; let any = false;
    for (const k of ['labB', 'othB', 'parB']) { const s0 = entries.reduce((a, e) => a + (e[k] || 0), 0); f[k] = netRow[k] != null && s0 > 0 && Math.abs(netRow[k] / s0 - 1) > 0.002 ? netRow[k] / s0 : 1; if (f[k] !== 1) any = true; }
    if (any) {
      for (const e of entries) { for (const k of ['labB', 'othB', 'parB']) if (e[k] != null) e[k] *= f[k]; e.budget = [e.labB, e.othB, e.parB].some(x => x != null) ? (e.labB || 0) + (e.othB || 0) + (e.parB || 0) : e.budget; }
      const pc = x => ((x - 1) * 100).toFixed(1).replace(/\.0$/, '') + '%';
      warnings.push(`The report's "Total W/S + B/S" row is ${pc(f.labB)} (labour), ${pc(f.othB)} (other), ${pc(f.parB)} (parts) above the sum of the branch rows; branch budgets were scaled to the report total.`);
    }
  }
  /* spare-parts and total-sales lines left as formulas: rebuild them the way the report adds them up */
  if (ext.counter || ext.dealer) {
    const tot = (k, f) => entries.reduce((a, e) => a + (e[f] || 0), 0), xb = k => (ext[k] && ext[k].budget) || 0, xa = k => (ext[k] && ext[k].actual) || 0;
    const sB = xb('counter') + xb('dealer') + xb('wholesale'), sA = xa('counter') + xa('dealer') + xa('wholesale');
    const fill = (k, b, a) => { ext[k] = ext[k] || {}; if (ext[k].budget == null) ext[k].budget = b; if (ext[k].actual == null) ext[k].actual = a; };
    fill('external', sB, sA);
    fill('partsTotal', tot(0, 'parB') + ext.external.budget, tot(0, 'parA') + ext.external.actual);
    fill('totalSales', ext.partsTotal.budget + tot(0, 'labB') + tot(0, 'othB'), ext.partsTotal.actual + tot(0, 'labA') + tot(0, 'othA'));
  }
  if (rebuilt.budget) warnings.push(rebuilt.budget <= 3 ? `The Total Budget cell is blank for ${rebuilt.names.join(', ')} (no value and no saved result in the file); the app used Labour + Other + Parts budget instead.` : `Total Budget was blank for ${rebuilt.budget} rows (formulas saved without results); the app used Labour + Other + Parts budget instead.`);
  return { ok: true, kind: 'target', period: ymStr(ym), wd, elapsed, reportDate, entries, ext, warnings, header: rows[h].map(str) };
}
/* rows in old target reports for workshops that never opened (budget only, no sales): left out of every target */
const TARGET_IGNORE = [/new\s*cairo/i];
function resolveTargetRow(raw, cfg) {
  const o = (cfg.targetRows || {})[raw];
  if (o) return { unit: o === '-' ? null : o, source: 'admin' };
  if (TARGET_IGNORE.some(re => re.test(raw))) return { unit: null, source: 'ignored' };
  const b = ruleBranch(raw);
  if (!b) return { unit: null, source: 'unknown' };
  const scope = /body|b\/s/i.test(raw) ? 'BS' : 'EM';
  return { unit: `${b.branch} ${scope}`, source: 'rule' };
}

/* ===================== maintenance schedule parsing ===================== */
/* "40104184" (numeric cell) = 40K / 104K / 184K; "8,72,136,120" (text) = 8K / 72K / 136K / 120K */
function splitPacked(digits) {
  let best = null, bestG = 0;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (let L = 1; L <= 3; L++) {
    const out = [+digits.slice(0, L)]; let i = L, ok = out[0] > 0;
    while (ok && i < digits.length) {
      const two = +digits.slice(i, i + 2), three = +digits.slice(i, i + 3), prev = out[out.length - 1];
      if (i + 2 <= digits.length && two > prev && digits[i] !== '0') { out.push(two); i += 2; }
      else if (i + 3 <= digits.length && three > prev && digits[i] !== '0') { out.push(three); i += 3; }
      else ok = false;
    }
    if (ok && out.length > 1) { const g = out.reduce(gcd); if (g > bestG) { bestG = g; best = out; } }
  }
  return best;
}
function parseMilestones(v, thousandsMode) {
  if (v == null || v === '') return [];
  if (typeof v === 'number') {
    if (!thousandsMode) return [v];
    if (v < 1000) return [v * 1000];
    if (v % 1000 === 0) return [v];
    const sp = splitPacked(String(Math.round(v)));
    return sp ? sp.map(n => n * 1000) : [v];
  }
  const s = String(v).trim().replace(/(\d),(000)\b/g, '$1$2');
  return s.split(/[,\s]+/).filter(Boolean).map(t => Number(t.replace(/\./g, ''))).filter(n => n > 0).map(n => (thousandsMode && n < 1000 ? n * 1000 : n));
}
function parseScheduleSheet(rows, sheetName) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) if ((rows[i] || []).some(c => norm(c) === 'partname')) { h = i; break; }
  if (h < 0) return null;
  let model = sheetName;
  for (let i = h - 1; i >= 0; i--) { const c = (rows[i] || []).find(x => x != null && String(x).trim()); if (c && !/service\s*sche/i.test(String(c))) { model = String(c).trim(); break; } }
  const hdr = rows[h], cols = [];
  let full = false;
  for (let j = 3; j < hdr.length; j++) if (parseMilestones(hdr[j], false).some(n => n > 1000 && n % 1000 === 0)) full = true;
  for (let j = 3; j < hdr.length; j++) { const ms = parseMilestones(hdr[j], !full); if (ms.length) cols.push({ j, label: str(hdr[j]), km: ms }); }
  if (!cols.length) return null;
  const hoursRow = rows[h + 1] || [];
  const parts = [], partNos = [];
  for (let i = h + 2; i < rows.length; i++) { const r = rows[i] || []; const n = str(r[0]); if (!n) continue; parts.push(n); const pn = str(r[1]).toUpperCase(); if (pn && /[A-Z]{1,3}-?[A-Z0-9]{3,}/.test(pn)) partNos.push({ no: pn, name: n }); }
  const all = [...new Set(cols.flatMap(c => c.km))].sort((a, b) => a - b);
  const reg = all.filter(k => k > 1000);
  let interval = 0;
  for (let i = 1; i < reg.length; i++) { const d = reg[i] - reg[i - 1]; if (d > 0 && (!interval || d < interval)) interval = d; }
  if (!interval && reg.length) interval = reg[0];
  return { sheet: sheetName, model, interval, milestones: all, columns: cols.map(c => ({ label: c.label, km: c.km, hours: num(hoursRow[c.j]) || null })), parts: parts.slice(0, 40), partNos, timeMonths: 12 };
}

/* ===================== workbook sniffing ===================== */
function analyzeWorkbook(XLSX, wb, fileName) {
  const sheets = wb.SheetNames.map(n => ({ name: n, ws: wb.Sheets[n] }));
  const rowsOf = ws => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
  const peek = ws => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false, range: rangeTop(XLSX, ws, 20) });
  for (const s of sheets) { const top = peek(s.ws); if (findTxnHeader(top) >= 0) { const r = parseTxnRows(rowsOf(s.ws), fileName); r.sheet = s.name; return r; } }
  for (const s of sheets) { const top = peek(s.ws); if (top.some(r => (r || []).some(c => norm(c).startsWith('totalbudget')))) { const r = parseTargetRows(rowsOf(s.ws), fileName); r.sheet = s.name; return r; } }
  const sched = [];
  for (const s of sheets) { const top = peek(s.ws); if (top.some(r => (r || []).some(c => norm(c) === 'partname'))) { const p = parseScheduleSheet(rowsOf(s.ws), s.name); if (p) sched.push(p); } }
  if (sched.length) return { ok: true, kind: 'schedule', models: sched };
  return { ok: false, kind: 'unknown', error: 'Not recognised as a transaction export, a target (DSR summary) report or a service schedule.' };
}
function rangeTop(XLSX, ws, n) {
  const ref = ws['!ref']; if (!ref) return undefined;
  const r = XLSX.utils.decode_range(ref); r.e.r = Math.min(r.e.r, r.s.r + n - 1); return r;
}

function isPlaceholderVin(x) {
  if (!/^[A-Z0-9]{11,17}$/.test(x)) return true;
  if (/^0+$/.test(x) || /0{6,}/.test(x)) return true;
  return /OTHER|TEST|DUMMY|XXXX|UNKNOWN/.test(x);
}

/* ===================== VTP analysis ===================== */
function vtpAnalysis(S, f, opts) {
  opts = opts || {};
  const dim = opts.dim === 'branch' ? 'branch' : 'plant';
  const idx = select(S, Object.assign({}, f, { branches: f.branches }));
  const single = f.s === f.e;
  const ym0 = f.s;
  const unitOf = single ? (d => { const dd = d % 100; return dd <= 7 ? 0 : dd <= 14 ? 1 : dd <= 21 ? 2 : 3; }) : (d => { const ym = Math.floor(d / 100); return (Math.floor(ym / 100) - Math.floor(ym0 / 100)) * 12 + (ym % 100) - (ym0 % 100); });
  const dimName = dim === 'branch' ? S.branches : S.plantNames;
  const dimOf = dim === 'branch' ? (i => S.br[i]) : (i => S.pl[i]);
  // units
  const units = [];
  if (single) { const dm = daysInMonth(ym0), mn = MONTHS[ym0 % 100 - 1]; const cap = mn.charAt(0).toUpperCase() + mn.slice(1); units.push({ key: 'W1', label: `W1 (1–7 ${cap})` }, { key: 'W2', label: `W2 (8–14 ${cap})` }, { key: 'W3', label: `W3 (15–21 ${cap})` }, { key: 'W4', label: `W4 (22–${dm} ${cap})`, days: dm - 21 }); }
  else for (let m = f.s; m <= f.e; m = ymAdd(m, 1)) { const mn = MONTHS[m % 100 - 1]; units.push({ key: ymStr(m), label: `${mn.charAt(0).toUpperCase() + mn.slice(1)} ${Math.floor(m / 100)}`, ym: m }); }
  const U = units.length;
  // revenue order of branches
  const rev = new Map(); let lines = 0, blankLines = 0; const phLines = new Map();
  for (const i of idx) { const k = dimOf(i); rev.set(k, (rev.get(k) || 0) + S.net[i]); lines += S.lines[i]; const v = S.vin[i]; if (v === -1) blankLines += S.lines[i]; else if (v <= -2) { const nm = S.phNames[-2 - v]; phLines.set(nm, (phLines.get(nm) || 0) + S.lines[i]); } }
  const order = [...rev.keys()].sort((a, b) => rev.get(b) - rev.get(a));
  if (order.length > 30) order.length = 30;
  const pos = new Map(order.map((k, j) => [k, j]));
  const B = order.length;
  // one pass per VIN
  const nV = S.vins.length, mask = new Int32Array(nV), first = new Int16Array(nV).fill(-1), last = new Int16Array(nV).fill(-1), ros = new Int32Array(nV), firstDay = new Int32Array(nV), lastDay = new Int32Array(nV);
  const um = Array.from({ length: U }, () => new Int32Array(nV));
  const roSeen = new Int32Array(S.roKeys.length).fill(-1), roExtra = new Set();
  const touched = [];
  for (const i of idx) {
    const v = S.vin[i]; if (v < 0) continue;
    const j = pos.get(dimOf(i)); if (j === undefined) continue;
    const u = unitOf(S.day[i]); if (u < 0 || u >= U) continue;
    if (!mask[v] && first[v] < 0) touched.push(v);
    mask[v] |= 1 << j; um[u][v] |= 1 << j;
    if (first[v] < 0 || u < first[v]) first[v] = u; if (u > last[v]) last[v] = u;
    if (!firstDay[v] || S.day[i] < firstDay[v]) firstDay[v] = S.day[i]; if (S.day[i] > lastDay[v]) lastDay[v] = S.day[i];
    const r = S.ro[i];
    if (roSeen[r] === -1) { roSeen[r] = v; ros[v]++; } else if (roSeen[r] !== v) { const k = r + ':' + v; if (!roExtra.has(k)) { roExtra.add(k); ros[v]++; } }
  }
  const pop = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
  touched.sort((a, b) => (S.vins[a] < S.vins[b] ? -1 : 1));
  const name = j => dimName[order[j]];
  let vrows = touched.map(v => { const js = []; for (let j = 0; j < B; j++) if (mask[v] & (1 << j)) js.push(j); return { vin: S.vins[v], v, first: first[v], last: last[v], ros: ros[v], nb: js.length, js, combo: js.map(name).join(' + '), perUnit: um.map(a => pop(a[v])), firstDay: firstDay[v], lastDay: lastDay[v] }; });
  // branch filter: keep the vehicles that visited the chosen branch(es); their other branches stay visible
  if (opts.focus && opts.focus.size) {
    const keyBr = new Map(); for (const i of idx) { const k = dimOf(i); if (!keyBr.has(k)) keyBr.set(k, S.br[i]); }
    const fp = new Set(); order.forEach((k, j) => { if (opts.focus.has(dim === 'branch' ? k : keyBr.get(k))) fp.add(j); });
    vrows = vrows.filter(r => r.js.some(j => fp.has(j)));
  }
  const unique = vrows.length;
  const nbCount = { 1: 0, 2: 0, 3: 0, 4: 0 }; for (const r of vrows) nbCount[Math.min(4, r.nb)]++;
  const multi = unique - nbCount[1];
  // per unit
  const unitRows = units.map((u, k) => { let distinct = 0, nw = 0, mb = 0; for (const r of vrows) { if (r.perUnit[k] > 0) distinct++; if (r.perUnit[k] > 1) mb++; if (r.first === k) nw++; } return Object.assign({}, u, { distinct, new: nw, returning: distinct - nw, multi: mb }); });
  let acc = 0; for (const r of unitRows) { acc += r.new; r.acc = acc; }
  // overlap
  const grid = Array.from({ length: B }, () => new Array(B).fill(0)), shared = new Array(B).fill(0);
  for (const r of vrows) { for (const a of r.js) { for (const b of r.js) grid[a][b]++; if (r.nb > 1) shared[a]++; } }
  const branchLevel = grid.reduce((t, row, j) => t + row[j], 0);
  const branches = order.map((k, j) => ({ name: name(j), rev: rev.get(k), unique: grid[j][j], shared: shared[j], pctShared: grid[j][j] ? shared[j] / grid[j][j] : 0 }));
  const links = []; for (let a = 0; a < B; a++) for (let b = a + 1; b < B; b++) if (grid[a][b]) links.push({ a: name(a), b: name(b), n: grid[a][b] });
  links.sort((x, y) => y.n - x.n);
  const comboMap = new Map(); for (const r of vrows) if (r.nb > 1) { const c = comboMap.get(r.combo) || { combo: r.combo, nb: r.nb, n: 0 }; c.n++; comboMap.set(r.combo, c); }
  const combos = [...comboMap.values()].sort((a, b) => b.n - a.n || b.nb - a.nb || a.combo.localeCompare(b.combo));
  const multiRows = vrows.filter(r => r.nb > 1).sort((a, b) => b.nb - a.nb || b.ros - a.ros || a.vin.localeCompare(b.vin));
  return { dim, single, units: unitRows, unique, lines, blankLines, phLines: [...phLines].map(([n, c]) => ({ vin: n, lines: c })), nbCount, multi, one: nbCount[1], branchLevel, branches, grid, links, combos, multiRows, vrows, order, w4days: single ? units[3].days : null };
}

/* minimal OOXML writer for the VTP workbook (formulas + cached values + styles) */
function colL(n) { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
const xesc = t => String(t == null ? '' : t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function xlCell(ref, c) {
  if (c == null) return '';
  if (typeof c !== 'object') c = { v: c };
  const s = c.s ? ` s="${c.s}"` : '';
  if (c.f != null) {
    const fv = c.v == null ? '' : typeof c.v === 'number' ? `<v>${Number.isFinite(c.v) ? c.v : 0}</v>` : `<v>${xesc(c.v)}</v>`;
    return `<c r="${ref}"${s}${typeof c.v === 'string' ? ' t="str"' : ''}><f>${xesc(c.f)}</f>${fv}</c>`;
  }
  if (c.v == null || c.v === '') return c.s ? `<c r="${ref}"${s}/>` : '';
  if (typeof c.v === 'number') return `<c r="${ref}"${s}><v>${Number.isFinite(c.v) ? c.v : 0}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xesc(c.v)}</t></is></c>`;
}
function xlSheet(sh) {
  const rows = sh.rows.map((row, ri) => { if (!row) return ''; const r = ri + 1; const ht = sh.heights && sh.heights[r] ? ` ht="${sh.heights[r]}" customHeight="1"` : ''; return `<row r="${r}"${ht}>${row.map((c, ci) => xlCell(colL(ci) + r, c)).join('')}</row>`; }).join('');
  const pane = sh.freeze ? (() => { const [x, y] = sh.freeze; const tl = colL(x) + (y + 1); return `<pane${x ? ` xSplit="${x}"` : ''}${y ? ` ySplit="${y}"` : ''} topLeftCell="${tl}" activePane="${x && y ? 'bottomRight' : y ? 'bottomLeft' : 'topRight'}" state="frozen"/>`; })() : '';
  const cols = sh.cols ? `<cols>${sh.cols.map((w, i) => (w == null ? '' : typeof w === 'object' ? `<col min="${i + 1}" max="${i + 1}" width="${w.w}" customWidth="1"${w.hidden ? ' hidden="1"' : ''}/>` : `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)).join('')}</cols>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${sh.tab ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${sh.filter ? `<autoFilter ref="${sh.filter}"/>` : ''}</worksheet>`;
}
const XL_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><fonts count="5"><font><sz val="10"/><name val="Inter"/></font><font><b/><sz val="10"/><name val="Inter"/></font><font><b/><sz val="14"/><name val="Inter"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Inter"/></font><font><i/><sz val="9"/><color rgb="FF666666"/><name val="Inter"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF7B3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyBorder="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="3" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="4" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyBorder="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyBorder="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyBorder="1" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function vtpWorkbook(an, meta) {
  const ST = { title: 1, head: 2, int: 3, key: 4, pct: 5, tInt: 6, tPct: 7, note: 8, bold: 9, tText: 10, yText: 11 };
  const N = Math.max(2, an.vrows.length + 1), B = an.branches.length, U = an.units.length;
  const uv = "'Unique VTP'!";
  const rng = c => `${uv}$${c}$2:$${c}$${N}`;
  const unitCol = k => colL(6 + k), visCol = j => colL(6 + U + j);
  const unitWord = an.single ? 'week' : 'month';
  // --- Unique VTP sheet
  const uHead = ['VIN', 'First visit (key)', 'Last visit (key)', 'No. of ROs', 'No. of branches', 'Branches visited'].concat(an.units.map(u => `Branches in ${u.label}`)).concat(an.branches.map(b => `Visited ${b.name}`));
  const uRows = [uHead.map(h => ({ v: h, s: ST.head }))].concat(an.vrows.map(r => [r.vin, an.units[r.first].key, an.units[r.last].key, { v: r.ros, s: ST.int }, { v: r.nb, s: ST.int }, r.combo].concat(r.perUnit.map(x => ({ v: x, s: ST.int }))).concat(an.branches.map((b, j) => ({ v: r.js.includes(j) ? 1 : 0, s: ST.int })))));
  const uSheet = { name: 'Unique VTP', rows: uRows, heights: { 1: 32 }, freeze: [1, 1], filter: `A1:${colL(uHead.length - 1)}${N}`, cols: [21, 12, 12, 12, 12, 38].concat(Array(U + B).fill(12)) };
  // --- Branch Overlap
  const ovRows = [[{ v: `Shared vehicles between branches (${meta.period})`, s: ST.title }], [{ v: 'Each cell = unique VTP that visited both the row and the column branch. The diagonal (yellow) = the branch\'s own unique VTP.', s: ST.note }], [{ v: 'Branch', s: ST.head }].concat(an.branches.map(b => ({ v: b.name, s: ST.head })))];
  an.branches.forEach((b, a) => { ovRows.push([{ v: b.name, s: ST.bold }].concat(an.branches.map((c, j) => (a === j ? { f: `COUNTIF(${rng(visCol(a))},1)`, v: an.grid[a][a], s: ST.key } : { f: `COUNTIFS(${rng(visCol(a))},1,${rng(visCol(j))},1)`, v: an.grid[a][j], s: ST.int })))); });
  ovRows.push(null);
  const uR = ovRows.length + 1;
  ovRows.push([{ v: 'Branch unique VTP', s: ST.tText }].concat(an.branches.map((b, j) => ({ f: `${colL(j + 1)}${4 + j}`, v: b.unique, s: ST.tInt }))));
  ovRows.push([{ v: '…shared with another branch', s: ST.tText }].concat(an.branches.map((b, j) => ({ f: `COUNTIFS(${rng(visCol(j))},1,${rng('E')},">1")`, v: b.shared, s: ST.tInt }))));
  ovRows.push([{ v: '% shared', s: ST.tText }].concat(an.branches.map((b, j) => ({ f: `IF(${colL(j + 1)}${uR}=0,0,${colL(j + 1)}${uR + 1}/${colL(j + 1)}${uR})`, v: b.pctShared, s: ST.tPct }))));
  const ovSheet = { name: 'Branch Overlap', rows: ovRows, heights: { 3: 32 }, freeze: [1, 3], cols: [28].concat(Array(B).fill(12.5)) };
  // --- Summary
  const sm = [];
  sm[0] = [{ v: `VTP (unique vehicles) analysis — ${meta.period}, all ${B} branches, by billing date`, s: ST.title }];
  sm[2] = [{ v: '1. Removing duplicates from the VIN column', s: ST.bold }];
  const ph = an.phLines.map(p => `${p.vin} (${p.lines} line${p.lines > 1 ? 's' : ''})`).join(', ');
  sm[3] = ['VIN entries in the period', { v: an.lines, s: ST.int }, { v: `Typed: invoice lines billed in ${meta.period} from the CA_WR_PDI export${meta.excludedNote ? '; ' + meta.excludedNote : ''}.`, s: ST.note }];
  sm[4] = ['Blank VINs', { v: an.blankLines, s: ST.int }, { v: 'Typed: lines with an empty VIN.', s: ST.note }];
  sm[5] = ['Placeholder VIN lines (left out)', { v: an.phLines.reduce((t, p) => t + p.lines, 0), s: ST.int }, { v: ph ? `Typed: not real cars — ${ph}.` : 'Typed: none found.', s: ST.note }];
  sm[6] = [{ v: 'Unique VTP after removing duplicates', s: ST.yText }, { f: `COUNTA(${rng('A')})`, v: an.unique, s: ST.key }, { v: 'Distinct VIN (trimmed, upper case), placeholders and blanks excluded.', s: ST.note }];
  sm[7] = ['Visited more than 1 branch', { f: `COUNTIF(${rng('E')},">1")`, v: an.multi, s: ST.int }];
  sm[8] = ['   of which 2 branches', { f: `COUNTIF(${rng('E')},2)`, v: an.nbCount[2], s: ST.int }];
  sm[9] = ['   of which 3 branches', { f: `COUNTIF(${rng('E')},3)`, v: an.nbCount[3], s: ST.int }];
  sm[10] = ['   of which 4 or more branches', { f: `COUNTIF(${rng('E')},">=4")`, v: an.nbCount[4], s: ST.int }];
  sm[11] = ['Visited only 1 branch', { f: `COUNTIF(${rng('E')},1)`, v: an.one, s: ST.int }];
  sm[12] = ['Branch-level VTP', { f: `SUM('Branch Overlap'!B${uR}:${colL(B)}${uR})`, v: an.branchLevel, s: ST.int }, { v: 'A car counts once in every branch it visited, so this is higher than unique VTP.', s: ST.note }];
  sm[14] = [{ v: `2. VTP by ${unitWord}`, s: ST.bold }];
  sm[15] = ['Period', 'Distinct VTP', 'New VTP', 'Returning VTP', 'Accumulated VTP', `VTP at more than 1 branch in the same ${unitWord}`, null, 'Key'].map(h => (h == null ? null : { v: h, s: ST.head }));
  an.units.forEach((u, k) => { const r = 17 + k; sm[16 + k] = [u.label, { f: `COUNTIF(${rng(unitCol(k))},">0")`, v: u.distinct, s: ST.int }, { f: `COUNTIF(${rng('B')},H${r})`, v: u.new, s: ST.int }, { f: `B${r}-C${r}`, v: u.returning, s: ST.int }, { f: `SUM($C$17:C${r})`, v: u.acc, s: ST.int }, { f: `COUNTIF(${rng(unitCol(k))},">1")`, v: u.multi, s: ST.int }, null, u.key]; });
  const tr = 17 + U;
  sm[tr - 1] = [{ v: 'Total / check', s: ST.tText }, { f: `SUM(B17:B${tr - 1})`, v: an.units.reduce((t, u) => t + u.distinct, 0), s: ST.tInt }, { f: `SUM(C17:C${tr - 1})`, v: an.units.reduce((t, u) => t + u.new, 0), s: ST.tInt }, { f: `SUM(D17:D${tr - 1})`, v: an.units.reduce((t, u) => t + u.returning, 0), s: ST.tInt }, { f: `E${tr - 1}`, v: an.units.length ? an.units[U - 1].acc : 0, s: ST.tInt }, { v: '', s: ST.tText }];
  sm[tr] = [{ v: `Per-${unitWord} VTP add up to more than unique VTP because a car that comes back in another ${unitWord} is counted in each ${unitWord}. Accumulated must equal unique VTP.${an.single ? ` W4 has ${an.w4days} days.` : ''} "New" = first visit within the period of this file, not a first-ever visit.`, s: ST.note }];
  const smSheet = { name: 'Summary', rows: sm, heights: { 16: 32 }, cols: [46, 16, 21, 21, 21, 22, null, { w: 8, hidden: true }], tab: true };
  // --- Branch Combinations
  const cb = [[{ v: 'Which branches the multi-branch vehicles visited', s: ST.title }], null, ['Branches visited', 'No. of branches', 'Unique VTP', '% of multi-branch VTP'].map(h => ({ v: h, s: ST.head }))];
  const ctr = 4 + an.combos.length;
  an.combos.forEach((c, k) => { const r = 4 + k; cb.push([c.combo, { v: c.nb, s: ST.int }, { f: `COUNTIF(${rng('F')},A${r})`, v: c.n, s: ST.int }, { f: `IF($C$${ctr}=0,0,C${r}/$C$${ctr})`, v: an.multi ? c.n / an.multi : 0, s: ST.pct }]); });
  cb.push([{ v: 'Total multi-branch VTP', s: ST.tText }, { v: '', s: ST.tText }, { f: an.combos.length ? `SUM(C4:C${ctr - 1})` : '0', v: an.multi, s: ST.tInt }, { f: an.combos.length ? `SUM(D4:D${ctr - 1})` : '0', v: an.combos.length ? 1 : 0, s: ST.tPct }]);
  const cbSheet = { name: 'Branch Combinations', rows: cb, heights: { 3: 32 }, freeze: [0, 3], cols: [52, 14, 14, 16] };
  // --- Multi-Branch VTP
  const fd = d => (d ? `${d % 100} ${MONTHS[Math.floor(d / 100) % 100 - 1].replace(/^./, c => c.toUpperCase())} ${Math.floor(d / 10000)}` : '');
  const mb = [['VIN', 'No. of branches', 'Branches visited', 'No. of ROs', 'First visit', 'Last visit'].map(h => ({ v: h, s: ST.head }))].concat(an.multiRows.map(r => [r.vin, { v: r.nb, s: ST.int }, r.combo, { v: r.ros, s: ST.int }, fd(r.firstDay), fd(r.lastDay)]));
  const mbSheet = { name: 'Multi-Branch VTP', rows: mb, heights: { 1: 32 }, freeze: [0, 1], filter: `A1:F${Math.max(2, an.multiRows.length + 1)}`, cols: [21, 14, 52, 12, 14, 14] };
  const sheets = [smSheet, ovSheet, cbSheet, mbSheet, uSheet];
  const files = {};
  files['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  files['_rels/.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const defs = sheets.map((s, i) => (s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${s.name}'!$${s.filter.replace(':', ':$').replace(/([A-Z]+)(\d+)/g, '$1$$$2')}</definedName>` : '')).join('');
  files['xl/workbook.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xesc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defs ? `<definedNames>${defs}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  files['xl/_rels/workbook.xml.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  files['xl/styles.xml'] = XL_STYLES;
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = xlSheet(s); });
  return files;
}

/* operations: Arabic / English job descriptions normalised for search and grouping */
function normOp(s) {
  return String(s || '').toLowerCase().replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ـ/g, '').replace(/[\u064B-\u0652]/g, '')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\s+/g, ' ').replace(/^[\s\-_./]+|[\s\-_./]+$/g, '');
}
const DEFAULT_OP_GROUPS = () => [
  { name: 'Periodic maintenance', pattern: 'perio|maint|صيان|service \\d|سنوي|\\b\\d+ ?k\\b' },
  { name: 'Body & paint / insurance', pattern: 'دهان|paint|سمكر|body|تامين|insur|حادث|مقايس|quot|qutation|صدام|رفرف|كبوت' },
  { name: 'A/C', pattern: 'a/c|\\bac\\b|تكييف|تكيف|تبريد|فريون|كمبروسر|cooling' },
  { name: 'Brakes', pattern: 'brake|فرامل|فرمل|تيل|طنابير|ديسك' },
  { name: 'Suspension & steering', pattern: 'suspen|عفش|مساعد|عومان|ستيرنج|دركسيون|اتزان|ترصيص|alignment|ميزان|مطب|خبط|مقص' },
  { name: 'Gearbox & clutch', pattern: 'gear|فتيس|دبرياج|clutch|cvt|transm|تنتيش|نتشه|سرعات' },
  { name: 'Engine & ignition', pattern: 'engine|محرك|موتور|overheat|سخون|حراره|knock|ignition|دوار|تدور|starting|مارش|سلف|بوجيه|سير|كاتينه|belt' },
  { name: 'Leaks', pattern: 'تسريب|ترشيح|رشح|leak' },
  { name: 'Battery & electrical', pattern: 'batter|بطاري|كهرب|electr|lamp|فانوس|فوانيس|لمب|light|ليد|obd|dashboard|طبلون|سنسور|sensor|انوار|اشارات' },
  { name: 'Tyres & glass', pattern: 'كاوتش|فرده|tyre|tire|زجاج|glass|مساح|برابيز' },
  { name: 'Oil & quick service', pattern: 'oil|زيت|فلتر|filter|top up' },
  { name: 'Noise (not specified)', pattern: 'noise|صوت|زن|رجه|رجرجه|طقه' },
  { name: 'Diagnosis / check (general)', pattern: 'check|report|كشف|فحص|تقرير|diagnos' },
];
/* part categories from the settings: user categories in order, then service, then other */
function partCategories(cfg) {
  const COLORS = ['var(--c5)', 'var(--c8)', 'var(--c7)', 'var(--c10)', 'var(--c11)', 'var(--c12)', 'var(--c13)', 'var(--c6)'];
  const list = [], index = {}, rules = [];
  (cfg.partCats || []).forEach((c, k) => {
    if (!c || !c.id || c.id === 'service' || c.id === 'other' || index[c.id] != null) return;
    const i = list.length; index[c.id] = i;
    list.push({ id: c.id, name: c.name || c.id, color: COLORS[k % COLORS.length], custom: true });
    const up = a => (a || []).map(x => String(x).trim().toUpperCase()).filter(Boolean);
    const pre = up(c.prefixes), skip = up(c.jobsSkip), re = safeRe(c.pattern || ''), jre = safeRe(c.jobs || '');
    if (pre.length || re || jre) rules.push({ i, test: (code, job) => pre.some(x => code.startsWith(x)) || !!(re && re.test(code)) || !!(jre && job && jre.test(job) && !skip.some(x => code.startsWith(x))) });
  });
  index.service = list.length; list.push({ id: 'service', name: 'Service items', color: 'var(--c3)' });
  index.other = list.length; list.push({ id: 'other', name: 'Repair parts', color: 'var(--c1)' });
  return { list, index, rules };
}

/* ===================== analytics store ===================== */
function buildStore(assets, cfg, schedules) {
  const inc = safeRe(cfg.periodicInclude), exc = safeRe(cfg.periodicExclude);
  const owSplits = new Set(cfg.owSplits || []), owPay = safeRe(cfg.owPayerRe || '');
  let n = 0, np = 0; for (const a of assets) { n += a.rows.length; np += (a.parts || []).length; }
  const F64 = () => new Float64Array(n);
  const S = {
    n, day: new Int32Array(n), ym: new Int32Array(n), br: new Int16Array(n), unit: new Int16Array(n), act: new Int8Array(n), cw: new Int8Array(n),
    ro: new Int32Array(n), vin: new Int32Array(n), model: new Int32Array(n), adv: new Int32Array(n), net: F64(), disc: F64(),
    created: new Int32Array(n), netL: F64(), netP: F64(), netO: F64(), hours: F64(), discL: F64(), discP: F64(), split: new Int16Array(n), payer: new Int32Array(n), ow: new Uint8Array(n),
    dl: new Int32Array(n), per: new Uint8Array(n), km: new Int32Array(n), lines: new Int32Array(n),
    branches: [], branchInfo: [], units: [], unitBranch: [], unitScope: [], models: [], advs: [], advInfo: [], vins: [], roKeys: [], roBranch: [], splits: [], payers: [], mats: [],
    plants: new Map(), jobsMatched: new Map(), minDay: 0, maxDay: 0, src: new Int16Array(n), srcIds: [],
  };
  S.pl = new Int16Array(n); S.plantNames = []; S.phNames = []; const plM = new Map(), phM = new Map();
  const P = S.P = { n: np, ym: new Int32Array(np), br: new Int16Array(np), unit: new Int16Array(np), act: new Int8Array(np), cw: new Int8Array(np), mat: new Int32Array(np), model: new Int32Array(np), per: new Uint8Array(np), split: new Int16Array(np), svc: new Uint8Array(np), cat: new Int8Array(np), ow: new Uint8Array(np), net: new Float64Array(np), disc: new Float64Array(np), qty: new Float64Array(np), lines: new Int32Array(np), ros: new Int32Array(np) };
  const intern = (arr, map, v) => { let i = map.get(v); if (i === undefined) { i = arr.length; arr.push(v); map.set(v, i); } return i; };
  const bM = new Map(), uM = new Map(), mM = new Map(), aM = new Map(), vM = new Map(), rM = new Map(), sM = new Map(), pyM = new Map(), matM = new Map();
  const getBranch = (name, meta) => { const had = bM.has(name); const i = intern(S.branches, bM, name); if (!had) S.branchInfo[i] = meta; return i; };
  const getUnit = (bi, scope) => { const name = `${S.branches[bi]} ${scope}`; const had = uM.has(name); const i = intern(S.units, uM, name); if (!had) { S.unitBranch[i] = bi; S.unitScope[i] = scope; } return i; };
  // advisor IDs: the code list (Data & imports → Advisor IDs) maps ID → name; a name in the source finds its ID the other way
  const advNorm = v => String(v).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
  const advIdOf = new Map(); for (const [k, v] of Object.entries(cfg.advisers || {})) if (k !== '0' && v && !advIdOf.has(advNorm(v))) advIdOf.set(advNorm(v), k);
  const getAdv = (raw) => {
    let name, code = null, status = 'name';
    if (!raw) { name = '(No adviser)'; status = 'blank'; }
    else if (/^\d+$/.test(raw)) { code = raw; name = (cfg.advisers || {})[raw]; status = name ? 'mapped' : 'unknown'; if (!name) name = `Code ${raw}`; }
    else { name = raw.trim(); code = advIdOf.get(advNorm(name)) || null; }
    const label = code && status !== 'unknown' && code !== '0' ? `${name} (${code})` : name;
    const had = aM.has(label); const i = intern(S.advs, aM, label); if (!had) S.advInfo[i] = { code, status, name }; return i;
  };
  // service parts: schedule part numbers + admin list + prefixes (+ optionally any part on a periodic job)
  const svcSet = new Set((cfg.serviceParts || []).map(x => String(x).toUpperCase()));
  S.partNames = new Map();
  if (cfg.servicePartsFromSchedules !== false) for (const sc of schedules || []) for (const pn of sc.partNos || []) { svcSet.add(pn.no); if (!S.partNames.has(pn.no)) S.partNames.set(pn.no, pn.name); }
  for (const sc of schedules || []) for (const pn of sc.partNos || []) if (!S.partNames.has(pn.no)) S.partNames.set(pn.no, pn.name);
  const svcPre = (cfg.servicePartPrefixes || []).map(x => String(x).toUpperCase()).filter(Boolean);
  S.svcSet = svcSet;
  const cats = partCategories(cfg); S.partCats = cats.list;
  const svcCat = cats.index.service, otherCat = cats.index.other, override = cfg.partOverride || {};
  let p = 0, q = 0; S.exList = [];
  let nO = 0; for (const a of assets) nO += (a.ops || []).length;
  const O = S.O = { n: nO, row: new Int32Array(nO), job: new Int32Array(nO), net: new Float64Array(nO), netL: new Float64Array(nO), netP: new Float64Array(nO), hrs: new Float64Array(nO) };
  S.opJobs = []; S.opMembers = []; const opM = new Map(); let o = 0;
  // administrator edits: several wordings under one standard name, and a chosen group per operation
  const opAlias = cfg.opAlias || {}, opOverride = cfg.opOverride || {}; S.opsLoaded = assets.length > 0 && assets.every(a => Array.isArray(a.ops));
  for (const a of assets) {
    const p0 = p;
    const D = a.dicts;
    let srcI = S.srcIds.indexOf(a._src || ''); if (srcI < 0) { srcI = S.srcIds.length; S.srcIds.push(a._src || ''); }
    const plantT = D.plant.map(raw => {
      const r = resolvePlant(raw, cfg);
      const name = r.branch || `${raw || '(blank)'} (unmapped)`;
      const rec = S.plants.get(raw) || { raw, branch: r.branch, source: r.source, lines: 0, net: 0 };
      S.plants.set(raw, rec);
      return { bi: getBranch(name, { mapped: !!r.branch, source: r.source }), rec, isAmerya: r.branch === 'Amerya', pli: intern(S.plantNames, plM, raw || '(blank)') };
    });
    const actT = D.act.map(v => (/PDI/.test(v) ? 2 : /BS|BODY/.test(v) ? 1 : /EM/.test(v) ? 0 : -1));
    const lvgT = D.lvg.map(v => (/BS|BODY/.test(v) ? 'BS' : /EM/.test(v) ? 'EM' : null));
    const cwT = D.cw.map(v => (/warr/i.test(v) ? 1 : /pdi/i.test(v) ? 2 : 0));
    const advT = D.adv.map(getAdv);
    const foadT = D.adv.map(v => norm(v) === 'amfoad' || v === '3198');
    const modT = D.model.map(v => intern(S.models, mM, v || '(No model)'));
    const vinT = D.vin.map(v => { const x = String(v || '').trim().toUpperCase(); if (!x) return -1; if (isPlaceholderVin(x)) return -2 - intern(S.phNames, phM, x); return intern(S.vins, vM, x); });
    const splitT = (D.split || []).map(v => intern(S.splits, sM, v || '(blank)'));
    const owSplitT = (D.split || []).map(v => owSplits.has(v || '(blank)'));
    const payT = (D.payer || []).map(v => intern(S.payers, pyM, v || '(blank)'));
    const owPayT = (D.payer || []).map(v => !!(owPay && owPay.test(v || '')));
    const matT = (D.mat || []).map(v => intern(S.mats, matM, v));
    const jobT = (a.jobs || []).map(j => { const ok = !!(inc && inc.test(j) && !(exc && exc.test(j))); return ok; });
    (a.jobs || []).forEach((j, i) => { const rec = S.jobsMatched.get(j) || { job: j, count: 0, periodic: jobT[i] }; rec.count += (a.jobCount || [])[i] || 0; S.jobsMatched.set(j, rec); });
    const resolve = (pt, ai, li, adi) => { let act = actT[ai], scope = lvgT[li]; if (act < 0) act = scope === 'BS' ? 1 : 0; if (!scope) scope = act === 1 ? 'BS' : 'EM'; if (cfg.foadRule !== false && pt.isAmerya && foadT[adi]) { if (act === 0) act = 1; scope = 'BS'; } return [act, scope]; };
    for (const r of a.rows) {
      const [day, pi, ai, order, vi, mi, adi, ci, li, si, pyi, net, disc, lines, dl, ji, km, nL, nP, nO, hrs, dL, dP] = r;
      const pt = plantT[pi];
      const [act, scope] = resolve(pt, ai, li, adi);
      S.day[p] = day; S.ym[p] = ymOf(day); S.br[p] = pt.bi; S.unit[p] = getUnit(pt.bi, scope); S.act[p] = act;
      S.cw[p] = act === 2 ? 2 : cwT[ci];
      const rk = pt.bi + '|' + order; const had = rM.has(rk); const roi = intern(S.roKeys, rM, rk); if (!had) S.roBranch[roi] = pt.bi;
      S.ro[p] = roi; S.vin[p] = vinT[vi]; S.model[p] = modT[mi]; S.adv[p] = advT[adi];
      S.net[p] = net; S.disc[p] = disc; S.dl[p] = dl; S.lines[p] = lines; S.per[p] = ji >= 0 && jobT[ji] ? 1 : 0; S.km[p] = km; S.src[p] = srcI;
      S.pl[p] = pt.pli; S.created[p] = r[23] || 0;
      S.netL[p] = nL || 0; S.netP[p] = nP || 0; S.netO[p] = nO || 0; S.hours[p] = hrs || 0; S.discL[p] = dL || 0; S.discP[p] = dP || 0;
      S.split[p] = splitT[si] ?? -1; S.payer[p] = payT[pyi] ?? -1; S.ow[p] = (owSplitT[si] || owPayT[pyi]) && S.cw[p] === 1 ? 1 : 0;
      pt.rec.lines += lines; pt.rec.net += net;
      if (!S.minDay || day < S.minDay) S.minDay = day;
      if (day > S.maxDay) S.maxDay = day;
      p++;
    }
    { const jt = (a.opJobs || []).map(t0 => { const t = opAlias[t0] || t0; let i = opM.get(t); if (i === undefined) { i = S.opJobs.length; S.opJobs.push(t); opM.set(t, i); S.opMembers.push([]); } if (t !== t0 && !S.opMembers[i].includes(t0)) S.opMembers[i].push(t0); return i; });
      for (const r of a.ops || []) { const pp = p0 + r[0]; if (pp >= p) continue; O.row[o] = pp; O.job[o] = jt[r[1]]; O.net[o] = r[2]; O.netL[o] = r[3]; O.netP[o] = r[4]; O.hrs[o] = r[6]; o++; } }
    for (const e of a.exsrv || []) { const pp = p0 + e[0]; if (pp < p) S.exList.push({ p: pp, net: e[1], disc: e[2], lop: e[3], job: e[4] }); }
    for (const r of a.parts || []) {
      const [ym, pi, ai, ci, li, mati, mi, ji, si, net, disc, qty, lines, ros, foadP] = r;
      const pt = plantT[pi]; let [act, scope] = resolve(pt, ai, li, -1);
      if (foadP && cfg.foadRule !== false && pt.isAmerya) { if (act === 0) act = 1; scope = 'BS'; }
      P.ym[q] = ym; P.br[q] = pt.bi; P.unit[q] = getUnit(pt.bi, scope); P.act[q] = act; P.cw[q] = act === 2 ? 2 : cwT[ci];
      const m = matT[mati]; P.mat[q] = m; P.model[q] = modT[mi]; P.per[q] = ji >= 0 && jobT[ji] ? 1 : 0; P.split[q] = splitT[si] ?? -1;
      const code = S.mats[m];
      const isSvc = svcSet.has(code) || svcPre.some(x => code.startsWith(x)) || (cfg.servicePartsOnPeriodic && P.per[q]);
      let cat = override[code] != null && cats.index[override[code]] != null ? cats.index[override[code]] : -1;
      if (cat < 0) { const job = ji >= 0 ? (a.jobs || [])[ji] || '' : ''; for (const r2 of cats.rules) if (r2.test(code, job)) { cat = r2.i; break; } }
      if (cat < 0) cat = isSvc ? svcCat : otherCat;
      P.cat[q] = cat; P.svc[q] = cat === svcCat ? 1 : 0;
      P.ow[q] = owSplitT[si] && P.cw[q] === 1 ? 1 : 0;
      P.net[q] = net; P.disc[q] = disc; P.qty[q] = qty; P.lines[q] = lines; P.ros[q] = ros;
      q++;
    }
  }
  O.n = o;
  // per distinct job text: normalised text, operation group, km milestone
  const groupsC = (cfg.opGroups && cfg.opGroups.length ? cfg.opGroups : DEFAULT_OP_GROUPS()).map(g => ({ name: g.name, re: safeRe(g.pattern || '') })).filter(g => g.name);
  S.opGroups = groupsC.map(g => g.name).concat(['Other']);
  const nJ = S.opJobs.length; S.opNorm = new Array(nJ); S.opGroup = new Int16Array(nJ); S.opKm = new Int32Array(nJ);
  for (let j = 0; j < nJ; j++) {
    const mem = S.opMembers[j], t = normOp([S.opJobs[j]].concat(mem).join(' · ')); S.opNorm[j] = t;
    let gI = -1; const ov = opOverride[S.opJobs[j]];
    if (ov != null) gI = S.opGroups.indexOf(ov);
    if (gI < 0) { gI = groupsC.findIndex(g => g.re && g.re.test(t)); if (gI < 0) gI = groupsC.length; }
    S.opGroup[j] = gI; S.opKm[j] = extractKm(S.opJobs[j]) || mem.reduce((k, x) => k || extractKm(x), 0);
  }
  S.base = { net: S.net.slice(), netL: S.netL.slice(), netP: S.netP.slice(), netO: S.netO.slice(), disc: S.disc.slice() }; S.owState = '';
  return S;
}
/* one-off warranty: REN_EX_SRV lines at or above the threshold are taken out of revenue when enabled */
function applyOW(S, on, thr) {
  const key = on ? 'on:' + thr : ''; if (S.owState === key) return S.owLines || [];
  for (const k of ['net', 'netL', 'netP', 'netO', 'disc']) S[k].set(S.base[k]);
  S.owLines = [];
  if (on) for (const e of S.exList) if (e.net >= thr) { const comp = e.lop === 0 ? 'netL' : e.lop === 1 ? 'netP' : 'netO'; S.net[e.p] -= e.net; S[comp][e.p] -= e.net; S.disc[e.p] -= e.disc; S.owLines.push(e); }
  S.owState = key; clearCaches(S); return S.owLines;
}

/* ---- speed: distinct counting with typed-array stamps instead of Sets, and cached selections ---- */
const MK = { st: 0, a: {} };
function mk(name, size) { let a = MK.a[name]; if (!a || a.length < size) { a = MK.a[name] = new Uint32Array(Math.max(size + 1024, 4096)); } return a; }
function nextStamp() { if (++MK.st >= 4294967000) { MK.st = 1; for (const k in MK.a) MK.a[k].fill(0); } return MK.st; }
function clearCaches(S) { S._sel = new Map(); S._sum = new WeakMap(); S._memo = new Map(); S._opSel = new Map(); }
function memo(S, key, fn) { if (!S || typeof S !== 'object') return fn(); if (!S._memo) clearCaches(S); if (S._memo.has(key)) return S._memo.get(key); const v = fn(); if (S._memo.size > 150) S._memo.clear(); S._memo.set(key, v); return v; }
let TARGET_ID = 0;
function selKey(f) { const bs = f.branches ? [...f.branches].sort((x, y) => x - y).join(',') : '*'; return `${f.s}|${f.e}|${bs}|${f.act == null ? '' : f.act}|${f.noOW ? 1 : 0}|${f.cw == null ? '' : f.cw}`; }
function select(S, f) {
  if (!S._sel) clearCaches(S);
  const key = selKey(f), hit = S._sel.get(key); if (hit) return hit;
  const s = f.s * 100 + 1, e = f.e * 100 + 31, out = new Int32Array(S.n); let k = 0;
  const bs = f.branches, act = f.act, day = S.day, br = S.br, ac = S.act, ow = S.ow, noOW = !!f.noOW, cwF = f.cw === 0 || f.cw === 1 ? f.cw : -1, CW = S.cw;
  const bm = bs ? new Uint8Array(S.branches.length + 1) : null; if (bs) for (const b of bs) if (b >= 0 && b < bm.length) bm[b] = 1;
  const mode = act === 'nopdi' ? 1 : act === 'nobs' ? 2 : act != null && act !== 'all' ? 3 : 0;
  for (let i = 0; i < S.n; i++) {
    const d = day[i]; if (d < s || d > e) continue;
    if (bm && !bm[br[i]]) continue;
    if (mode === 1) { if (ac[i] === 2) continue; } else if (mode === 2) { if (ac[i] === 1) continue; } else if (mode === 3 && ac[i] !== act) continue;
    if (noOW && ow[i]) continue;
    if (cwF >= 0 && CW[i] !== cwF) continue;
    out[k++] = i;
  }
  const r = out.slice(0, k);
  if (S._sel.size > 60) S._sel.clear();
  S._sel.set(key, r); return r;
}
function summarize(S, idx) {
  if (!S._sum) clearCaches(S);
  if (idx && typeof idx === 'object') { const hit = S._sum.get(idx); if (hit) return hit; }
  const nR = S.roKeys.length, nV = S.vins.length, st = nextStamp();
  const mR = mk('ro', nR), mV = mk('vin', nV), mCE = mk('ce', nR), mD = mk('dro', nR), mP = mk('pro', nR), mPV = mk('pdiv', nV), mA0 = mk('a0', nR), mA1 = mk('a1', nR), mA2 = mk('a2', nR), mAp = mk('ap', nR), mW = mk('wk', nR);
  let rev = 0, disc = 0, nro = 0, nv = 0, nce = 0, nd = 0, np = 0, npv = 0, na0 = 0, na1 = 0, na2 = 0, nap = 0, nw = 0;
  const payer = [0, 0, 0], act = [0, 0, 0];
  let lines = 0, L = 0, Pn = 0, O = 0, hrs = 0, dP = 0, dL = 0;
  const apI = S._apI || (S._apI = S.splits ? Int8Array.from(S.splits.map(x => (/appoint/i.test(x) ? 1 : /walk/i.test(x) ? 2 : 0))) : new Int8Array(0));
  const NET = S.net, DISC = S.disc, LN = S.lines, RO = S.ro, VIN = S.vin, ACT = S.act, DL = S.dl, PER = S.per, CW = S.cw, SPL = S.split;
  const hasL = !!S.netL, NL = S.netL, NP = S.netP, NO = S.netO, HR = S.hours, DPa = S.discP, DLa = S.discL;
  const len = idx.length;
  for (let j = 0; j < len; j++) {
    const i = idx[j];
    const nt = NET[i]; rev += nt; disc += DISC[i]; lines += LN[i];
    const ro = RO[i], a = ACT[i];
    if (hasL) { L += NL[i]; Pn += NP[i]; O += NO[i]; hrs += HR[i]; dP += DPa[i]; dL += DLa[i]; const sp = SPL[i]; const t = sp >= 0 ? apI[sp] : 0; if (t === 1) { if (mAp[ro] !== st) { mAp[ro] = st; nap++; } } else if (t === 2) { if (mW[ro] !== st) { mW[ro] = st; nw++; } } }
    if (mR[ro] !== st) { mR[ro] = st; nro++; }
    const v = VIN[i];
    if (v >= 0 && mV[v] !== st) { mV[v] = st; nv++; }
    if (a !== 2) { if (mCE[ro] !== st) { mCE[ro] = st; nce++; } } else if (v >= 0 && mPV[v] !== st) { mPV[v] = st; npv++; }
    if (DL[i] > 0 && mD[ro] !== st) { mD[ro] = st; nd++; }
    if (PER[i] && mP[ro] !== st) { mP[ro] = st; np++; }
    payer[CW[i]] += nt; act[a] += nt;
    if (a === 0) { if (mA0[ro] !== st) { mA0[ro] = st; na0++; } } else if (a === 1) { if (mA1[ro] !== st) { mA1[ro] = st; na1++; } } else if (a === 2) { if (mA2[ro] !== st) { mA2[ro] = st; na2++; } }
  }
  const gross = rev + disc;
  const out = { rev, disc, gross, rate: gross !== 0 ? disc / gross : NaN, ros: nro, vins: nv, entries: nce, discRos: nd, perRos: np, pdiVins: npv, payer, act, actRos: [na0, na1, na2], lines, labour: L, parts: Pn, other: O, hours: hrs, discParts: dP, discLabour: dL, labourRate: hrs > 0 ? L / hrs : NaN, hoursPerRo: nce ? hrs / nce : NaN, partsPerRo: nro ? Pn / nro : NaN, apptRos: nap, walkRos: nw, apptRate: nap + nw ? nap / (nap + nw) : NaN, revPerRo: nro ? rev / nro : NaN, revPerVin: nv ? rev / nv : NaN };
  if (idx && typeof idx === 'object') S._sum.set(idx, out);
  return out;
}
function groupBy(S, idx, keyFn) {
  const m = new Map();
  for (const i of idx) { const k = keyFn(i); let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(i); }
  return m;
}
const roundPct = x => Math.round(x * 1000) / 10; // 0.99956 -> 100.0
function targetStatus(ach) { if (!Number.isFinite(ach)) return 'na'; const p = roundPct(ach); return p >= 100 ? 'on' : p >= 90 ? 'near' : 'below'; }

/* targets: [{period, wd, entries:[{raw,budget,actual}]}] → index */
/* per-year target adjustment (target only, never actuals): {2026: {mode: 'dec', pct: 10}}
   inc = target × (1 + p) · dec = target × (1 − p) · remove = target ÷ (1 + p) (takes out an uplift that was added) */
function targetFactor(cfg, ym) {
  const a = (cfg.targetAdj || {})[String(Math.floor(ym / 100))]; if (!a) return 1;
  const p = (Number(a.pct) || 0) / 100; if (!p) return 1;
  if (Array.isArray(a.months) && !a.months.includes(ym % 100)) return 1;
  return a.mode === 'inc' ? 1 + p : a.mode === 'dec' ? Math.max(0, 1 - p) : a.mode === 'remove' ? 1 / (1 + p) : 1;
}
/* does a target file carry a built-in uplift? Budgets typed as whole numbers × (1 + u) (e.g. 279 × 1.1 = 306.9) */
function detectUplift(entries) {
  const vals = []; for (const e of entries || []) for (const k of ['labB', 'othB', 'parB']) if (e[k] > 0) vals.push(e[k]);
  if (vals.length < 10) return 0;
  const whole = vals.filter(v => Math.abs(v - Math.round(v)) < 0.001).length / vals.length;
  for (const u of [0.1, 0.05, 0.15, 0.2]) { const hit = vals.filter(v => Math.abs(v / (1 + u) - Math.round(v / (1 + u))) < 0.006).length / vals.length; if (hit > 0.85 && whole < 0.4) return u; }
  return 0;
}
function buildTargets(targetDocs, cfg, S) {
  const scale = Number(cfg.targetScale) || 1;
  const byMonth = new Map(), unknownRows = new Map();
  for (const t of targetDocs) {
    const ym = ymFromStr(t.period);
    const tf = targetFactor(cfg, ym);
    const rec = { ym, wd: t.wd, elapsed: t.elapsed, units: new Map(), file: t.fileName, id: t.id, factor: tf };
    for (const e of t.entries || []) {
      const r = resolveTargetRow(e.raw, cfg);
      if (!r.unit) { if (r.source !== 'ignored' && !(cfg.targetRows || {})[e.raw]) { const u = unknownRows.get(e.raw) || 0; unknownRows.set(e.raw, u + 1); } continue; }
      const u = rec.units.get(r.unit) || { budget: 0, actual: 0, prior: 0, hasBudget: false, rows: [], labB: 0, labA: 0, parB: 0, parA: 0, othB: 0, othA: 0 };
      for (const k of ['labA', 'parA', 'othA']) if (e[k] != null) u[k] += e[k] * scale;
      for (const k of ['labB', 'parB', 'othB']) if (e[k] != null) u[k] += e[k] * scale * tf;
      if (e.budget != null) { u.budget += e.budget * scale * tf; u.hasBudget = true; }
      if (e.actual != null) u.actual += e.actual * scale;
      if (e.prior != null) u.prior += e.prior * scale;
      u.rows.push(e.raw);
      rec.units.set(r.unit, u);
    }
    byMonth.set(ym, rec);
  }
  return { byMonth, unknownRows, _id: ++TARGET_ID, adjKey: JSON.stringify(cfg.targetAdj || {}) };
}
/* achievement over a period for selected branches & activity scope */
function achievement(S, T, f, comp) {
  comp = comp || 'total';
  const months = []; for (let m = f.s; m <= f.e; m = ymAdd(m, 1)) months.push(m);
  if (f.act === 2) return { target: NaN, revenue: NaN, ach: NaN, missingMonths: [], noTargetUnits: [], rows: [], note: 'PDI has no target scope.' };
  const scopes = f.act === 0 || f.act === 'nobs' ? ['EM'] : f.act === 1 ? ['BS'] : ['EM', 'BS'];
  const val = comp === 'L' ? S.netL : comp === 'P' ? S.netP : comp === 'O' ? S.netO : S.net;
  const bk = comp === 'L' ? 'labB' : comp === 'P' ? 'parB' : comp === 'O' ? 'othB' : 'budget', ak = comp === 'L' ? 'labA' : comp === 'P' ? 'parA' : comp === 'O' ? 'othA' : 'actual';
  const unitOk = ui => (!f.branches || f.branches.has(S.unitBranch[ui])) && scopes.includes(S.unitScope[ui]);
  // revenue per month × unit for this scope
  const mu = new Map(), s0 = f.s * 100 + 1, e0 = f.e * 100 + 31;
  for (let i = 0; i < S.n; i++) {
    const d = S.day[i]; if (d < s0 || d > e0) continue;
    if (f.act === 'nopdi' && S.act[i] === 2) continue;
    if (f.noOW && S.ow[i]) continue;
    const k = S.ym[i] * 1000 + S.unit[i]; mu.set(k, (mu.get(k) || 0) + val[i]);
  }
  let target = 0, revenue = 0, dsr = 0; const missingMonths = [], noTarget = new Set(); const perUnit = new Map();
  for (const ym of months) {
    const t = T.byMonth.get(ym);
    if (!t) { missingMonths.push(ym); continue; }
    for (let ui = 0; ui < S.units.length; ui++) {
      if (!unitOk(ui)) continue;
      const a = mu.get(ym * 1000 + ui) || 0; const tu = t.units.get(S.units[ui]);
      const pu = perUnit.get(ui) || { rev: 0, target: 0, dsr: 0, revNoTarget: 0 };
      if (!tu || !(tu[bk] > 0)) { if (a) { noTarget.add(S.units[ui]); pu.revNoTarget += a; } perUnit.set(ui, pu); continue; }
      pu.target += tu[bk]; pu.dsr += tu[ak]; pu.rev += a;
      target += tu[bk]; revenue += a; dsr += tu[ak];
      perUnit.set(ui, pu);
    }
    for (const [uname, tu] of t.units) {
      if (S.units.includes(uname)) continue;
      const bName = uname.replace(/ (EM|BS)$/, ''), sc = uname.slice(-2), bi = S.branches.indexOf(bName);
      if (f.branches && (bi < 0 || !f.branches.has(bi))) continue;
      if (!scopes.includes(sc) || !(tu[bk] > 0)) continue;
      target += tu[bk]; dsr += tu[ak];
    }
  }
  const rows = [...perUnit].map(([ui, v]) => ({ unit: S.units[ui], ui, rev: v.rev, target: v.target, dsr: v.dsr, revNoTarget: v.revNoTarget, ach: v.target > 0 ? v.rev / v.target : NaN }));
  return { target, revenue, dsr, ach: target > 0 ? revenue / target : NaN, missingMonths, noTargetUnits: [...noTarget], rows, comp };
}

/* ===================== parts ===================== */
function selectParts(S, f) {
  const P = S.P; if (!P) return [];
  if (!S._sel) clearCaches(S);
  const exList = (f.exCats || []).map(id => (S.partCats || []).findIndex(c => c.id === id)).filter(i => i >= 0);
  if (f.noSvc) { const si = (S.partCats || []).findIndex(c => c.id === 'service'); if (si >= 0 && !exList.includes(si)) exList.push(si); }
  const key = 'P|' + selKey(f) + '|' + exList.sort().join(','), hit = S._sel.get(key); if (hit) return hit;
  const exM = new Uint8Array(32); for (const i of exList) exM[i] = 1; const CT = P.cat, useEx = exList.length > 0, cwF = f.cw === 0 || f.cw === 1 ? f.cw : -1, PCW = P.cw;
  const out = new Int32Array(P.n); let k = 0;
  const bs = f.branches, act = f.act, noOW = !!f.noOW;
  const bm = bs ? new Uint8Array(S.branches.length + 1) : null; if (bs) for (const b of bs) if (b >= 0 && b < bm.length) bm[b] = 1;
  const mode = act === 'nopdi' ? 1 : act === 'nobs' ? 2 : act != null && act !== 'all' ? 3 : 0;
  const YM = P.ym, BR = P.br, AC = P.act, OW = P.ow;
  for (let i = 0; i < P.n; i++) {
    const ym = YM[i]; if (ym < f.s || ym > f.e) continue;
    if (bm && !bm[BR[i]]) continue;
    if (mode === 1) { if (AC[i] === 2) continue; } else if (mode === 2) { if (AC[i] === 1) continue; } else if (mode === 3 && AC[i] !== act) continue;
    if (noOW && OW[i]) continue;
    if (useEx && exM[CT[i]]) continue;
    if (cwF >= 0 && PCW[i] !== cwF) continue;
    out[k++] = i;
  }
  const r = out.slice(0, k);
  if (S._sel.size > 60) S._sel.clear();
  S._sel.set(key, r); return r;
}
function sumParts(S, ix) {
  if (!S._sum) clearCaches(S);
  if (ix && typeof ix === 'object') { const hit = S._sum.get(ix); if (hit) return hit; }
  const P = S.P; let net = 0, disc = 0, qty = 0, ros = 0, svc = 0, lines = 0, nm = 0;
  const st = nextStamp(), mM = mk('mat', S.mats.length);
  const N = P.net, D = P.disc, Q = P.qty, R = P.ros, L = P.lines, SV = P.svc, M = P.mat;
  for (let j = 0, n = ix.length; j < n; j++) { const i = ix[j]; net += N[i]; disc += D[i]; qty += Q[i]; ros += R[i]; lines += L[i]; if (SV[i]) svc += N[i]; const m = M[i]; if (mM[m] !== st) { mM[m] = st; nm++; } }
  const gross = net + disc;
  const out = { net, disc, qty, ros, lines, svc, mats: nm, rate: gross ? disc / gross : NaN, avgPrice: qty ? net / qty : NaN };
  if (ix && typeof ix === 'object') S._sum.set(ix, out);
  return out;
}
const MY_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';
function vinModelYear(vin, maxYear) {
  if (!vin || vin.length !== 17) return null;
  const c = vin[9], i = MY_CODES.indexOf(c); if (i < 0) return null;
  let y = 1980 + i; while (y + 30 <= maxYear + 1) y += 30;
  return y;
}

/* ===================== retention ===================== */
function buildVisits(S) {
  if (S._visits) return S._visits;
  const nR = S.roKeys.length;
  const roDay = new Int32Array(nR).fill(99999999), roAct = new Int8Array(nR).fill(-1), roPer = new Uint8Array(nR), roCash = new Int32Array(nR), roWar = new Int32Array(nR), roVin = new Int32Array(nR).fill(-1);
  const pdi = new Map(); // vin -> {day, br}
  for (let i = 0; i < S.n; i++) {
    const v = S.vin[i];
    if (S.act[i] === 2) { if (v >= 0) { const o = pdi.get(v); if (!o || S.day[i] < o.day) pdi.set(v, { day: S.day[i], br: S.br[i] }); } continue; }
    const r = S.ro[i];
    if (S.day[i] < roDay[r]) roDay[r] = S.day[i];
    if (roAct[r] !== 1) roAct[r] = S.act[i];
    if (S.per[i]) roPer[r] = 1;
    if (S.cw[i] === 1) roWar[r]++; else roCash[r]++;
    if (v >= 0) roVin[r] = v;
  }
  const byVin = new Map();
  for (let r = 0; r < nR; r++) { if (roAct[r] < 0 || roVin[r] < 0) continue; let a = byVin.get(roVin[r]); if (!a) { a = []; byVin.set(roVin[r], a); } a.push(r); }
  S._visits = { roDay, roAct, roPer, roCash, roWar, roVin, pdi, byVin };
  return S._visits;
}
const RETURN_TYPES = {
  maintenance: { label: 'Scheduled-maintenance return', test: (V, r) => V.roAct[r] === 0 && V.roPer[r] === 1 },
  mechanical: { label: 'Any mechanical-service return', test: (V, r) => V.roAct[r] === 0 },
  warranty: { label: 'Warranty-only mechanical visit', test: (V, r) => V.roAct[r] === 0 && V.roWar[r] > 0 && V.roCash[r] === 0 },
  bodyshop: { label: 'Body-shop visit', test: (V, r) => V.roAct[r] === 1 },
};
function retention(S, opts) {
  const V = buildVisits(S), cutoff = S.maxDay, W = opts.quarters * 3, T = RETURN_TYPES[opts.type];
  const cohorts = new Map();
  for (const [vin, p] of V.pdi) {
    if (opts.branches && !opts.branches.has(p.br)) continue;
    const y = Math.floor(p.day / 10000), q = Math.ceil((Math.floor(p.day / 100) % 100) / 3), key = `${y} Q${q}`;
    if (opts.fromYm && ymOf(p.day) < opts.fromYm) continue;
    if (opts.toYm && ymOf(p.day) > opts.toYm) continue;
    const c = cohorts.get(key) || cohorts.set(key, { key, pdi: 0, eligible: 0, returned: 0, same: 0, pending: 0 }).get(key);
    c.pdi++;
    const end = addMonthsInt(p.day, W);
    if (end > cutoff) { c.pending++; continue; }
    c.eligible++;
    let ret = false, same = false;
    for (const r of V.byVin.get(vin) || []) {
      const d = V.roDay[r]; if (d <= p.day || d > end || !T.test(V, r)) continue;
      ret = true; if (S.roBranch[r] === p.br) { same = true; break; }
    }
    if (ret) c.returned++; if (same) c.same++;
  }
  const rows = [...cohorts.values()].sort((a, b) => a.key.localeCompare(b.key)).map(c => ({ ...c, noReturn: c.eligible - c.returned, rate: c.eligible ? c.returned / c.eligible : NaN, noRate: c.eligible ? (c.eligible - c.returned) / c.eligible : NaN, sameRate: c.eligible ? c.same / c.eligible : NaN }));
  const tot = rows.reduce((t, c) => { for (const k of ['pdi', 'eligible', 'returned', 'same', 'pending', 'noReturn']) t[k] += c[k]; return t; }, { pdi: 0, eligible: 0, returned: 0, same: 0, pending: 0, noReturn: 0 });
  tot.rate = tot.eligible ? tot.returned / tot.eligible : NaN; tot.noRate = tot.eligible ? tot.noReturn / tot.eligible : NaN; tot.sameRate = tot.eligible ? tot.same / tot.eligible : NaN;
  return { rows, tot, cutoff, label: T.label };
}

/* ===================== maintenance follow-up ===================== */
const ROMAN = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V' };
function genOf(t, isSheet) {
  let m = t.match(/\b(IV|III|II|I|V)\b/); if (m) return m[1];
  m = t.match(/\bMEG[A-Z]*\s*\.?\s*([1-5])\b(?!\.[0-9])/); if (m) return ROMAN[m[1]];
  return null;
}
const MODEL_WORDS = { MEG: /\bMEG/, AUSTRAL: /AUSTRAL/, TALIANT: /TAL[IE]A?NT/, KARDIAN: /KARDIAN/, DUSTER: /DUSTER/, EXPRESS: /EXPRESS/, LOGAN: /LOGAN/, SANDERO: /SANDERO/, CAPTUR: /CAPTUR/, CLIO: /CLIO/, FLUENCE: /FLUENCE/, SYMBOL: /SYMBOL/, KOLEOS: /KOLEOS/, STEPWAY: /STEPWAY/, SCALA: /SCALA/, BOREAL: /BOREAL/, KWID: /KWID/, ARKANA: /ARKANA/, KADJAR: /KADJAR/, LODGY: /LODGY/, DOKKER: /DOKKER/, SCENIC: /SCENIC/, ESPACE: /ESPACE/ };
function matchSchedule(model, schedules, cfg) {
  const o = (cfg.modelSchedule || {})[model];
  if (o === '-') return null;
  if (o) return schedules.find(s => s.model === o) || null;
  const M = model.toUpperCase().replace('CAPTURE', 'CAPTUR');
  let best = null, bestScore = 0;
  for (const s of schedules) {
    const joined = (s.model + ' / ' + s.sheet).toUpperCase().replace(/CAPTURE/g, 'CAPTUR'), parts = joined.split(/\s*\/\s*/), gAll = genOf(s.model.toUpperCase());
    for (const nm of parts) {
      const words = Object.values(MODEL_WORDS).filter(re => re.test(nm));
      if (!words.length || !words.some(re => re.test(M))) continue;
      let score = 10;
      const eng = nm.match(/1\.[0-9]|2000CC/), engM = M.match(/1\.[0-9]|2000CC/);
      if (eng) score += engM && engM[0] === eng[0] ? 5 : engM ? -20 : -1;
      const g = genOf(nm) || gAll, gM = genOf(M);
      if (g) score += gM === g ? 4 : -12; else if (gM) score -= 1;
      const at = /\bA[.\-]?T\b|AUTO/, mt = /\bM[.\-]?T\b/;
      if (at.test(nm) || mt.test(nm)) { const sa = at.test(nm), ma = at.test(M), mm = mt.test(M); score += (sa && ma) || (!sa && mm) ? 3 : (ma || mm) ? -6 : 0; }
      if (score > bestScore) { bestScore = score; best = s; }
    }
  }
  return best;
}
function followUp(S, schedules, cfg, opts) {
  const V = buildVisits(S), cutoff = S.maxDay, soon = addMonthsInt(cutoff, 1);
  const last = new Map(); // vin -> info
  for (let i = 0; i < S.n; i++) {
    const v = S.vin[i]; if (v < 0) continue;
    if (opts.branches && !opts.branches.has(S.br[i])) continue;
    let o = last.get(v); if (!o) { o = { vin: v, lastVisit: 0, lastPer: 0, perKm: 0, kmPts: [], pdi: 0, br: S.br[i], model: S.model[i] }; last.set(v, o); }
    if (S.day[i] > o.lastVisit) { o.lastVisit = S.day[i]; o.br = S.br[i]; o.model = S.model[i]; }
    if (S.act[i] === 2) { if (!o.pdi || S.day[i] < o.pdi) o.pdi = S.day[i]; continue; }
    if (S.per[i] && S.act[i] === 0) {
      if (S.day[i] >= o.lastPer) { if (S.day[i] > o.lastPer) o.perKm = 0; o.lastPer = S.day[i]; if (S.km[i] > o.perKm) o.perKm = S.km[i]; }
      if (S.km[i] > 0) o.kmPts.push([S.day[i], S.km[i]]);
    }
  }
  const out = []; const counts = { overdue: 0, soon: 0, upcoming: 0, total: 0 };
  const schedCache = new Map();
  for (const o of last.values()) {
    const base = o.lastPer || o.pdi; if (!base) continue;
    const basis = o.lastPer ? 'Last recognised maintenance' : 'PDI date (proxy for delivery)';
    let due = addMonthsInt(base, 12), dueBy = 'Time: 12 months';
    const modelName = S.models[o.model];
    let sch = schedCache.get(modelName); if (sch === undefined) { sch = matchSchedule(modelName, schedules, cfg); schedCache.set(modelName, sch); }
    let nextKm = null, rate = null;
    if (sch && o.perKm) {
      nextKm = sch.milestones.find(k => k > o.perKm) || (sch.interval ? o.perKm + sch.interval : null);
      const pts = o.kmPts.sort((a, b) => a[0] - b[0]);
      if (pts.length >= 2) {
        const a = pts[0], b = pts[pts.length - 1], days = dayDiff(a[0], b[0]);
        if (days >= 30 && b[1] > a[1]) rate = (b[1] - a[1]) / days;
      }
      if (rate && nextKm) {
        const dk = Math.round((nextKm - o.perKm) / rate);
        const d2 = dateToInt(new Date(intToDate(o.lastPer).getTime() + dk * 86400000));
        if (d2 < due) { due = d2; dueBy = `Mileage: ${Math.round(nextKm / 1000)}K km (est. ${Math.round(rate * 30)} km/month)`; }
      }
    }
    if (o.lastVisit > due) {/* visited after due, but no recognised maintenance */}
    const status = due < cutoff ? 'overdue' : due <= soon ? 'soon' : 'upcoming';
    counts[status]++; counts.total++;
    out.push({ vin: S.vins[o.vin], model: modelName, branch: S.branches[o.br], base, basis, perKm: o.perKm, nextKm, due, dueBy, status, lastVisit: o.lastVisit, schedule: sch ? sch.model : null });
  }
  out.sort((a, b) => a.due - b.due);
  return { rows: out, counts, cutoff };
}

/* ===================== periods & series ===================== */
const bucketOf = (ym, g) => (g === 'year' ? String(Math.floor(ym / 100)) : g === 'quarter' ? `${Math.floor(ym / 100)} Q${Math.ceil((ym % 100) / 3)}` : ymStr(ym));
function bucketMonths(b, g) {
  if (g === 'year') { const y = +b; return Array.from({ length: 12 }, (_, i) => y * 100 + i + 1); }
  if (g === 'quarter') { const y = +b.slice(0, 4), q = +b.slice(-1); return [1, 2, 3].map(i => y * 100 + (q - 1) * 3 + i); }
  return [ymFromStr(b)];
}
function series(S, idx, f, g, byBranch, coverage) {
  const buckets = []; for (let m = f.s; m <= f.e; m = ymAdd(m, 1)) { const b = bucketOf(m, g); if (buckets[buckets.length - 1] !== b) buckets.push(b); }
  const acc = new Map();
  for (const i of idx) {
    const b = bucketOf(S.ym[i], g), k = byBranch ? b + '|' + S.br[i] : b;
    let a = acc.get(k); if (!a) { a = { rev: 0, disc: 0, ros: new Set() }; acc.set(k, a); }
    a.rev += S.net[i]; a.disc += S.disc[i]; a.ros.add(S.ro[i]);
  }
  const cutYm = ymOf(S.maxDay), cutPartial = S.maxDay % 100 < daysInMonth(cutYm);
  const info = buckets.map(b => {
    const ms = bucketMonths(b, g).filter(m => m >= f.s && m <= f.e);
    const full = bucketMonths(b, g).length;
    const covered = ms.filter(m => coverage.has(m));
    let status = covered.length === 0 ? 'missing' : (covered.length < full || ms.length < full) ? 'partial' : 'complete';
    if (status === 'complete' && ms.includes(cutYm) && cutPartial) status = 'partial';
    return { bucket: b, months: ms, covered: covered.length, expected: full, status };
  });
  const keys = byBranch ? [...new Set([...idx].map(i => S.br[i]))].sort((a, b) => S.branches[a].localeCompare(S.branches[b])) : [null];
  const out = [];
  for (const bi of keys) for (const inf of info) {
    const a = acc.get(bi == null ? inf.bucket : inf.bucket + '|' + bi);
    const gross = a ? a.rev + a.disc : 0;
    out.push({ bucket: inf.bucket, branch: bi == null ? 'Combined' : S.branches[bi], bi, status: inf.status, hasData: !!a, missing: inf.status === 'missing' && !a, rev: a ? a.rev : null, disc: a ? a.disc : null, ros: a ? a.ros.size : null, rate: a && gross !== 0 ? a.disc / gross : NaN });
  }
  return { points: out, info };
}

const API = {
  norm, str, num, toDay, toYm, ymStr, ymFromStr, ymAdd, ymOf, daysInMonth, addMonthsInt, intToDate, dateToInt, dayDiff, dInt,
  STANDARD_UNITS, ruleBranch, resolvePlant, DEFAULT_CONFIG, DEFAULT_ADVISERS, safeRe, TXN_LABELS,
  parseTxnRows, parseTargetRows, targetFactor, detectUplift, resolveTargetRow, parseScheduleSheet, parseMilestones, analyzeWorkbook,
  buildStore, partCategories, normOp, DEFAULT_OP_GROUPS, select, summarize, groupBy, selectParts, sumParts, vinModelYear, applyOW, isPlaceholderVin, colL, roundPct, targetStatus, buildTargets, vtpWorkbook,
  // results are kept per filter until the data or the one-off warranty setting changes
  vtpAnalysis: (S, f, o) => memo(S, 'vtp|' + selKey(f) + '|' + ((o && o.dim) || '') + '|' + (o && o.focus ? [...o.focus].join(',') : ''), () => vtpAnalysis(S, f, o)),
  achievement: (S, T, f, comp) => memo(S, 'ach|' + (T ? T._id : 0) + '|' + selKey(f) + '|' + (f.noSvc ? 1 : 0) + '|' + (comp || 'total'), () => achievement(S, T, f, comp)),
  buildVisits, RETURN_TYPES, retention, matchSchedule, bucketOf, bucketMonths, series,
  followUp: (S, sch, cfg, o) => memo(S, 'fu|' + (o && o.branches ? [...o.branches].sort((x, y) => x - y).join(',') : '*') + '|' + (sch ? sch.length : 0), () => followUp(S, sch, cfg, o)),
};
G.CORE = API;
if (typeof module !== 'undefined') module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
