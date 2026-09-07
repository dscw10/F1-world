/** @type {import('next').NextConfig} */

// GitHub Pages serves a *project* site from a sub-path:
//   https://<user>.github.io/<repo>/
// Every asset URL must carry that prefix or the page loads and the CSS 404s,
// which looks like a broken stylesheet rather than a path problem. The deploy
// workflow sets NEXT_PUBLIC_BASE_PATH; locally it is empty so `npm run dev`
// serves from the root as normal.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig = {
  // Emit plain static HTML/CSS/JS to ./out. No Node server at runtime, which is
  // what lets this live on GitHub Pages for free. See context.md 5.0.
  output: 'export',

  basePath,
  assetPrefix: basePath || undefined,

  // next/image optimisation needs a server. There isn't one.
  images: { unoptimized: true },

  // Emit /about/index.html rather than /about.html, so GitHub Pages resolves
  // directory URLs without a trailing-slash redirect it cannot perform.
  trailingSlash: true,
};

export default nextConfig;
