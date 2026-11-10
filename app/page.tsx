import { redirect } from 'next/navigation';

// The studio itself is the static bundle at /studio.html (built by scripts/build-studio.mjs).
// supashim.js inside it checks the Supabase session and bounces to /login if signed out.
export default function Home() {
  redirect('/studio.html');
}
