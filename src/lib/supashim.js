/* Supabase adapter: gives the studio the same storage interface it expects (window.claude),
   backed by a Supabase Postgres table ("documents"), Supabase Storage ("blobs" bucket) and Supabase Auth. */
(function () {
  'use strict';
  const sb = window.__SUPABASE_CLIENT__;
  if (!sb) { console.error('Supabase client not initialised'); return; }
  const COLLECTIONS = new Set(['imports', 'config', 'audit', 'members', 'views']);

  const listeners = new Map(); // col -> Set(fn)
  const errListeners = new Map(); // col -> Set(errFn)
  const cache = new Map(); // col -> docs[]

  async function fetchCol(col) {
    const { data, error } = await sb.from('documents').select('id, data').eq('collection', col);
    if (error) throw error;
    cache.set(col, data || []);
    return data || [];
  }
  function notify(col) { for (const fn of listeners.get(col) || []) try { fn(); } catch (e) { console.error(e); } }
  function notifyErr(col, e) { for (const fn of errListeners.get(col) || []) try { fn(e); } catch (e2) { console.error(e2); } }
  async function pull(col) {
    try { await fetchCol(col); notify(col); }
    catch (e) { console.error('[supashim] failed to load collection "' + col + '":', e); notifyErr(col, e); }
  }
  setInterval(() => { for (const col of listeners.keys()) pull(col); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const col of listeners.keys()) pull(col); });
  const subscribe = (col, fn, errFn) => {
    if (!listeners.has(col)) listeners.set(col, new Set());
    listeners.get(col).add(fn);
    if (errFn) { if (!errListeners.has(col)) errListeners.set(col, new Set()); errListeners.get(col).add(errFn); }
    if (cache.has(col)) setTimeout(fn, 0); else pull(col);
    return () => { listeners.get(col).delete(fn); if (errFn) errListeners.get(col).delete(errFn); };
  };
  const afterWrite = col => pull(col);

  const snapOf = (docs, q) => {
    let d = docs.slice();
    if (q && q.orderBy) { const [f, dir] = q.orderBy; d.sort((a, b) => ((a.data[f] > b.data[f]) - (a.data[f] < b.data[f])) * (dir === 'desc' ? -1 : 1)); } else d.sort((a, b) => (a.id < b.id ? -1 : 1));
    if (q && q.limit) d = d.slice(0, q.limit);
    const out = d.map(x => ({ id: x.id, exists: true, data: () => x.data, metadata: { fromCache: false, hasPendingWrites: false } }));
    return { docs: out, size: out.length, empty: !out.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  };

  function requireCol(col) { if (!COLLECTIONS.has(col)) throw new Error('Unknown collection: ' + col); }

  function docRef(col, id) {
    requireCol(col);
    return {
      id, path: col + '/' + id,
      async get() {
        const { data, error } = await sb.from('documents').select('data').eq('collection', col).eq('id', id).maybeSingle();
        if (error) throw error;
        return { id, exists: !!data, data: () => (data ? data.data : undefined), metadata: {} };
      },
      async set(data) {
        const { error } = await sb.from('documents').upsert({ collection: col, id, data, updated_at: new Date().toISOString() });
        if (error) throw Object.assign(new Error(error.message), { code: error.code === '42501' ? 'not_granted' : 'unavailable' });
        afterWrite(col);
      },
      async update(data) {
        const { data: cur, error: gErr } = await sb.from('documents').select('data').eq('collection', col).eq('id', id).maybeSingle();
        if (gErr) throw gErr;
        if (!cur) throw new Error('Document does not exist');
        const merged = merge(cur.data, data);
        const { error } = await sb.from('documents').update({ data: merged, updated_at: new Date().toISOString() }).eq('collection', col).eq('id', id);
        if (error) throw Object.assign(new Error(error.message), { code: error.code === '42501' ? 'not_granted' : 'unavailable' });
        afterWrite(col);
      },
      async delete() {
        const { error } = await sb.from('documents').delete().eq('collection', col).eq('id', id);
        if (error) throw Object.assign(new Error(error.message), { code: error.code === '42501' ? 'not_granted' : 'unavailable' });
        afterWrite(col);
      },
      onSnapshot(next, onError) {
        return subscribe(col, () => {
          const d = (cache.get(col) || []).find(x => x.id === id);
          next({ id, exists: !!d, data: () => (d ? d.data : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
        }, onError);
      },
    };
  }
  function merge(a, b) {
    const o = Object.assign({}, a);
    for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], v) : v;
    return o;
  }
  function query(col, q) {
    requireCol(col);
    return {
      orderBy(f, dir) { return query(col, Object.assign({}, q, { orderBy: [f, dir || 'asc'] })); },
      limit(n) { return query(col, Object.assign({}, q, { limit: n })); },
      where() { return query(col, q); },
      async get() { await fetchCol(col); return snapOf(cache.get(col) || [], q); },
      onSnapshot(next, onError) { return subscribe(col, () => next(snapOf(cache.get(col) || [], q)), onError); },
      doc(id) { return docRef(col, id); },
    };
  }
  const db = Object.freeze({ collection: col => query(col, {}), doc: p => { const [c, id] = p.split('/'); return docRef(c, id); } });

  const BUCKET = 'blobs';
  const assets = Object.freeze({
    async upload(blob) {
      const id = crypto.randomUUID().replace(/-/g, '');
      const { error } = await sb.storage.from(BUCKET).upload(id, blob, { contentType: blob.type || 'application/octet-stream' });
      if (error) throw Object.assign(new Error(error.message), { code: 'unavailable' });
      const { data } = sb.storage.from(BUCKET).getPublicUrl(id);
      await sb.from('blobs').insert({ id, content_type: blob.type || 'application/octet-stream', size_bytes: blob.size || 0 });
      return { id, url: data.publicUrl, sizeBytes: blob.size || 0, contentType: blob.type || 'application/octet-stream' };
    },
    async delete(id) {
      id = String(id).replace(/^.*\//, '');
      await sb.storage.from(BUCKET).remove([id]);
      await sb.from('blobs').delete().eq('id', id);
      return { deleted: true };
    },
    async list() { return { assets: [], usage: {} }; },
  });

  let mePromise = null;
  async function loadMe() {
    const { data: auth } = await sb.auth.getUser();
    const u = auth && auth.user;
    if (!u) return null;
    const { data: profile } = await sb.from('profiles').select('name, role').eq('id', u.id).maybeSingle();
    return { id: u.id, login: u.email, name: (profile && profile.name) || u.email, admin: !!profile && profile.role === 'admin', local: false, auth: 'password' };
  }
  const me = () => (mePromise = mePromise || loadMe());
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') location.href = '/login'; });

  const user = Object.freeze({
    async canEdit() { const m = await me(); return !!(m && m.admin); },
    async isOwner() { const m = await me(); return !!(m && m.local); },
    async can() { const m = await me(); return !!(m && m.admin); },
    async id() { const m = await me(); return m ? m.id : null; },
    async me() { const m = await me(); return m ? { id: m.id, name: m.name || '', email: m.login || null } : { id: '', name: '', email: null }; },
    async name() { const m = await me(); return m ? (m.name || '') : ''; },
    async profiles(ids) {
      const { data } = await sb.from('profiles').select('id, name, email:id').in('id', ids);
      const o = {};
      for (const id of ids) { const p = (data || []).find(x => x.id === id); o[id] = { id, name: p ? p.name : '', email: null }; }
      return o;
    },
    async search(q) {
      const { data } = await sb.from('profiles').select('id, name').ilike('name', `%${q || ''}%`).limit(20);
      return (data || []).map(u => ({ id: u.id, name: u.name, email: null }));
    },
  });

  const downloads = Object.freeze({
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return { status: 'saved' };
    },
  });

  const caps = { db, assets, user, downloads };

  me().then(m => {
    if (!m) { location.href = '/login'; return; }
    const go = async () => { try { await sb.auth.signOut(); } catch (e) {} location.href = '/login'; };
    const add = () => {
      const sbEl = document.getElementById('sidebar'); if (!sbEl || document.getElementById('signout')) return;
      const b = document.createElement('button'); b.id = 'signout'; b.type = 'button';
      b.textContent = 'Sign out · ' + (m.name || m.login);
      b.style.cssText = 'margin:8px 10px 0;width:calc(100% - 20px);min-height:38px;border:1px solid #3a3c3f;border-radius:8px;background:transparent;color:#bac0c5;font:inherit;font-size:12px;cursor:pointer';
      b.onclick = go; sbEl.appendChild(b);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  });

  window.claude = Object.freeze({ use: name => Promise.resolve(caps[name] || null), standalone: true });
})();
