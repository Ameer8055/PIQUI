const fs = require('fs');
const { SitemapStream, streamToPromise } = require('sitemap');

// Website URL - use environment variable for flexibility
const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://piqui-iota.vercel.app';

// All important pages with priorities and change frequencies
const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString().split('T')[0] },
  { url: '/signin', changefreq: 'monthly', priority: 0.8, lastmod: new Date().toISOString().split('T')[0] },
  // ... your other pages
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
    
    // Vercel-compatible path handling
    const publicDir = './dist'; // or './out' depending on your build output
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(`${publicDir}/sitemap.xml`, sitemap.toString());
    console.log('✅ Sitemap generated successfully');
    console.log(`📄 Generated ${pages.length} URLs`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    // Don't exit process in Vercel - just log and continue
    console.log('⚠️  Continuing build without sitemap...');
  }
})();