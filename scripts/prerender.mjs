import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});
try {
  const { HomePage } = await server.ssrLoadModule('/src/HomePage.tsx');
  const markup = renderToString(createElement(HomePage, { onOpen: () => {}, hasProject: false }));
  if (!markup.includes('home-faq') || !markup.includes('DemoTake'))
    throw Error('Homepage prerender is incomplete.');
  const html = await readFile('dist/index.html', 'utf8');
  if (!html.includes('<div id="root"></div>'))
    throw Error('Could not find homepage prerender target.');
  await writeFile(
    'dist/index.html',
    html.replace('<div id="root"></div>', '<div id="root">' + markup + '</div>'),
  );
  console.log('Prerendered DemoTake homepage with product copy, features and FAQs.');
} finally {
  await server.close();
}
