import { NextResponse } from 'next/server';

// app.js (the unmodified original engine) fetches stored file chunks from
// "/_blob/<id>", which used to be the local Node server's blob route.
// next.config.js rewrites that path here; we redirect it to the real object
// in Supabase Storage, so the original fetchAsset() code keeps working unchanged.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!base || !/^[0-9a-f]+$/i.test(params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const target = `${base}/storage/v1/object/public/blobs/${params.id}`;
  return NextResponse.redirect(target, 307);
}
