const fs = require('fs');
const { SitemapStream, streamToPromise } = require('sitemap');

// Website URL - use environment variable for flexibility
const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.VITE_API_URL ? process.env.VITE_API_URL.replace('/api', '') : 'https://piqui-iota.vercel.app');

// All important pages with priorities and change frequencies
const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/signin', changefreq: 'monthly', priority: 0.8, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/forgot-password', changefreq: 'monthly', priority: 0.5, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/dashboard', changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/daily-quiz', changefreq: 'daily', priority: 0.9, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/quiz-browser', changefreq: 'weekly', priority: 0.8, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/live-quiz', changefreq: 'weekly', priority: 0.8, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/notes', changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/chat', changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/leaderboard', changefreq: 'daily', priority: 0.8, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/profile', changefreq: 'weekly', priority: 0.6, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/progress', changefreq: 'weekly', priority: 0.7, lastmod: new Date().toISOString().split('T')[0] }
];

(async () => {
  try {
    const stream = new SitemapStream({ hostname: siteUrl });

    pages.forEach((page) => {
      stream.write({
        url: page.url,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: page.lastmod
      });
    });

    stream.end();

    const sitemap = await streamToPromise(stream);
    
    // Write to public folder - Vite will copy it to dist during build
    const publicDir = './public';
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(`${publicDir}/sitemap.xml`, sitemap.toString());
    console.log('✅ Sitemap generated successfully at ./public/sitemap.xml');
    console.log(`📄 Generated ${pages.length} URLs`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    // Don't exit process in Vercel - just log and continue
    console.log('⚠️  Continuing build without sitemap...');
  }
})();