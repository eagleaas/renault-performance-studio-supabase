import { NextResponse } from 'next/server';

// Served at /supabase-config.js. The anon key is meant to be public (it is
// restricted entirely by the Row Level Security policies in supabase/schema.sql).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const body = `window.__SUPABASE_CLIENT__ = supabase.createClient(${JSON.stringify(url)}, ${JSON.stringify(key)}, { auth: { persistSession: true, autoRefreshToken: true } });`;
  return new NextResponse(body, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
}
