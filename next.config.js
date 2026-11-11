/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // app.js (unmodified) calls "/_blob/<id>" to fetch stored file chunks.
      // Next.js treats "_"-prefixed folders as private/non-routable, so this
      // rewrite maps that external path to a normal API route instead.
      { source: '/_blob/:id', destination: '/api/blob/:id' },
    ];
  },
};
module.exports = nextConfig;
