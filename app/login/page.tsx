'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    window.location.href = '/studio.html';
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f4f5',
      fontFamily: '"Google Sans", Roboto, Arial, sans-serif', color: '#171717', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', border: '1px solid #e3e5e8', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: '#171717', color: '#fff', padding: 22, borderBottom: '4px solid #efdf00' }}>
          <b style={{ display: 'block', fontSize: 18, letterSpacing: '.5px' }}>RENAULT</b>
          <small style={{ color: '#bbbcbc', fontSize: 11, letterSpacing: '1.3px' }}>AFTER-SALES STUDIO · SUPABASE</small>
        </div>
        <form onSubmit={onSubmit} style={{ padding: 22, display: 'grid', gap: 14 }}>
          {error && <div style={{ background: '#fdeaea', color: '#b3261e', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
          <label style={{ fontSize: 11, fontWeight: 700, color: '#646b72', textTransform: 'uppercase', letterSpacing: '.6px', display: 'grid', gap: 6 }}>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoFocus
              style={{ font: 'inherit', border: '1px solid #e3e5e8', borderRadius: 8, padding: '11px 12px', minHeight: 44 }} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#646b72', textTransform: 'uppercase', letterSpacing: '.6px', display: 'grid', gap: 6 }}>
            Password
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
              style={{ font: 'inherit', border: '1px solid #e3e5e8', borderRadius: 8, padding: '11px 12px', minHeight: 44 }} />
          </label>
          <button type="submit" disabled={busy}
            style={{ font: 'inherit', fontWeight: 700, minHeight: 44, border: 0, borderRadius: 8, background: '#efdf00', color: '#151515', cursor: 'pointer' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
