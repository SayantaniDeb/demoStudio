export function seoPlugin(siteUrl = '') {
  let origin;
  if (siteUrl) {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:') throw Error('SITE_URL must be your public HTTPS origin.');
    origin = url.origin;
  }
  return {
    name: 'site-seo',
    transformIndexHtml(html) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'DemoTake',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        description:
          'Browser-based screen recorder and product demo maker with camera overlays, captions, timeline editing, and website-to-video creation.',
        featureList: [
          'Screen recording',
          'Camera overlays',
          'Timeline editing',
          'Captions',
          'Website to video',
          'Local video rendering',
        ],
        ...(origin ? { url: origin + '/' } : {}),
      };
      const tags = [
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          children: JSON.stringify(schema).replace(/</g, '\\u003c'),
          injectTo: 'head',
        },
      ];
      if (origin)
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: origin + '/' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: origin + '/' }, injectTo: 'head' },
        );
      return { html, tags };
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source:
          'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /tests/\nDisallow: /cursor-test.html\n' +
          (origin ? 'Sitemap: ' + origin + '/sitemap.xml\n' : ''),
      });
      if (origin)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' +
            origin.replace(/&/g, '&amp;') +
            '/</loc></url></urlset>',
        });
    },
  };
}
