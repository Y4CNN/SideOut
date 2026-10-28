import sharp from 'sharp';
import { mkdir, readFile, writeFile, stat, readdir, copyFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'public/images';
const source = join(root, 'source');
await mkdir(root, { recursive: true });
for (const name of await readdir(root)) if (/^[a-z-]+-1024\.(webp|avif)$/.test(name)) await unlink(join(root,name));
const names = ['logo', 'welcome', 'onboarding-score', 'onboarding-rotation', 'onboarding-timeout', 'empty-players', 'empty-matches', 'match-end', 'court-pattern'];
const manifest = {};
const missing = [];
const fallback = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" rx="32" fill="#0A2A66"/><circle cx="240" cy="160" r="70" fill="none" stroke="white" stroke-width="8"/><path d="M170 160h140M240 90v140" stroke="white" stroke-width="4"/></svg>');
async function input(name) {
  try { return await readFile(join(source, `${name}.png`)); }
  catch { missing.push(`${name}.png`); return fallback; }
}
for (const name of names) {
  const data = await input(name);
  const meta = await sharp(data).metadata();
  manifest[name] = { width: meta.width, height: meta.height, widths: [320, 480, 768] };
  for (const width of manifest[name].widths) {
    await sharp(data).resize({ width }).webp({ quality: 30, alphaQuality: 45, effort: 6 }).toFile(join(root, `${name}-${width}.webp`));
    await sharp(data).resize({ width }).avif({ quality: 25, effort: 5 }).toFile(join(root, `${name}-${width}.avif`));
  }
  await sharp(data).resize({ width: 320 }).png({ palette: true, colours: 16, effort: 10, dither: 0 }).toFile(join(root, `${name}.png`));
}
const icon = await input('icon');
for (const size of [16, 32, 180, 192, 512]) {
  await sharp(icon).resize(size, size).png({ palette: true, colours: 64 }).toFile(join(root, `icon-${size}.png`));
}
// The complete original icon fits within the central 80% safe circle.
const inner = await sharp(icon).resize(280, 280).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 3, background: '#0A2A66' } }).composite([{ input: inner, gravity: 'centre' }]).png({ palette: true, colours: 64 }).toFile(join(root, 'icon-maskable-512.png'));
const frames = await Promise.all([16, 32].map(size => readFile(join(root, `icon-${size}.png`))));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const at = 6 + i * 16; header[at] = [16, 32][i]; header[at + 1] = header[at];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(frame.length, at + 8); header.writeUInt32LE(offset, at + 12); offset += frame.length;
});
await writeFile(join(root, 'favicon.ico'), Buffer.concat([header, ...frames]));

// CSS viewport sizes + device scale cover SE, mini, 15/16, Pro and Max.
const phones = [[320,568,2],[375,667,2],[414,736,3],[375,812,3],[390,844,3],[393,852,3],[402,874,3],[414,896,2],[428,926,3],[430,932,3],[440,956,3]];
const logo = await input('logo');
const links = [];
for (const [w,h,dpr] of phones) for (const landscape of [false,true]) {
  const width = (landscape ? h : w) * dpr, height = (landscape ? w : h) * dpr;
  const mark = await sharp(logo).resize({ width: Math.round(Math.min(width,height) * 0.18) }).png().toBuffer();
  const filename = `splash-${width}x${height}.png`;
  await sharp({ create: { width, height, channels: 3, background: '#0A2A66' } }).composite([{ input: mark, gravity: 'centre' }]).png({ palette: true, colours: 16, dither: 0 }).toFile(join(root, filename));
  links.push(`    <link rel="apple-touch-startup-image" href="%BASE_URL%images/${filename}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${landscape ? 'landscape' : 'portrait'})" />`);
}
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
let html = await readFile('index.html', 'utf8');
html = html.replace(/\s*<!-- ios-splash:start -->[\s\S]*?<!-- ios-splash:end -->/, '');
html = html.replace('</head>', `<!-- ios-splash:start -->\n${links.join('\n')}\n    <!-- ios-splash:end -->\n  </head>`);
await writeFile('index.html', html);
// Fonts are bundled locally, including their upstream licenses.
await mkdir('public/fonts', { recursive: true });
for (const [family,weights] of [['inter',[400,600,800]],['barlow-condensed',[700]]]) {
  for (const weight of weights) await copyFile(`node_modules/@fontsource/${family}/files/${family}-latin-${weight}-normal.woff2`, `public/fonts/${family}-${weight}.woff2`);
  await copyFile(`node_modules/@fontsource/${family}/LICENSE`, `public/fonts/${family}-LICENSE.txt`);
}
const files = (await readdir(root)).filter(f => /\.(png|webp|avif|ico)$/.test(f));
const total = (await Promise.all(files.map(f => stat(join(root,f))))).reduce((n,s) => n+s.size,0);
await mkdir('reports', { recursive: true });
await writeFile('reports/images.json', JSON.stringify({ bytes: total, budget: 1500000, missing: [...new Set(missing)], files }, null, 2) + '\n');
console.log(`${files.length} images : ${(total/1000).toFixed(1)} ko / 1 500 ko. Sources manquantes : ${[...new Set(missing)].join(', ') || 'aucune'}`);
if (total >= 1500000) throw new Error('Budget images dépassé : ajuster les encodeurs avant de livrer.');
