const fs = require('fs');
const { SitemapStream, streamToPromise } = require('sitemap');

// Replace this with your real website URL:
const siteUrl = 'https://piqui-iota.vercel.app/';

// Add all your important pages here:
const pages = [
  '/',
  '/dashboard',
  '/daily-quiz',
  '/live-quiz',
  '/notes',
  '/chat',
  '/profile'
];

(async () => {
  const stream = new SitemapStream({ hostname: siteUrl });

  pages.forEach((page) => {
    stream.write({ url: page, changefreq: 'weekly' });
  });

  stream.end();

  const sitemap = await streamToPromise(stream);
  fs.writeFileSync('./public/sitemap.xml', sitemap.toString());
})();
