// Rebuild with: node scripts/build-social-image.mjs
// Original card images: api.gatcg.com/cards/images/{0ueslsle3w,h4zzb4evm9,4e5l418snu}.jpg
// Background: existing official .asphodel/paradise product banner.
// Forecast snapshot: app/src/pages/HomeDamageForecast.tsx (Water Diao Chan).
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const embed = async (path, mime = 'image/jpeg') => `data:${mime};base64,${(await readFile(new URL(path, root))).toString('base64')}`;
const background = await embed('app/public/media/products/PRD/banner.jpg');
const logo = await embed('app/public/media/brand/fanofinsightlogo.svg', 'image/svg+xml');
const card = async (file, x, y, angle) => `<image href="${await embed(`scripts/assets/social/${file}.jpg`)}" x="${x}" y="${y}" width="230" height="322" transform="rotate(${angle} ${x + 115} ${y + 161})"/>`;
const points = [[7, 5.2], [10, 9.9], [15, 20.5], [20, 34.1]];
const px = (seen) => 792 + (seen - 7) / 13 * 332;
const py = (value) => 554 - value / 40 * 92;
const line = points.map(([seen, value]) => `${px(seen)},${py(value)}`).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="shade"><stop stop-color="#101214" stop-opacity=".92"/><stop offset=".54" stop-color="#101214" stop-opacity=".5"/><stop offset="1" stop-color="#101214" stop-opacity=".12"/></linearGradient></defs>
<image href="${background}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
<path fill="url(#shade)" d="M0 0h1200v630H0z"/>
<image href="${logo}" x="42" y="80" width="72" height="48"/>
<g font-family="Arial, sans-serif" fill="#f0f0f0">
<text x="128" y="120" font-size="42" font-weight="700">Fan of Insight</text>
<text x="46" y="248" font-size="55" font-weight="700">Your next deck</text>
<text x="46" y="309" font-size="55" font-weight="700">starts with</text>
<text x="46" y="380" font-size="69" font-weight="700" fill="#a4c8e1">insight.</text>
<text x="48" y="433" font-size="23">Grand Archive decks · stats · collection</text>
<text x="48" y="589" font-size="24" fill="#b9c2ca">fanofin.site</text>
</g>
${await card('burst-asunder', 546, 155, -13)}
${await card('shimmering-refraction', 939, 190, 15)}
${await card('diao-chan-enchantress', 760, 102, 8)}
<rect x="733" y="374" width="433" height="230" rx="17" fill="#171e25" stroke="#5c6873" stroke-width="2"/>
<g font-family="Arial, sans-serif" fill="#f0f0f0">
<text x="752" y="405" font-size="25" font-weight="700">Damage forecast</text>
<text x="752" y="427" font-size="17" fill="#a4c8e1">Water Diao Chan</text>
<text x="752" y="450" font-size="14">Expected printed damage · optimistic ceiling</text>
<path d="M792 462V554H1138" fill="none" stroke="#87949e"/>
<polygon points="792,554 ${line} 1124,554" fill="#a4c8e1" opacity=".16"/>
<polyline points="${line}" fill="none" stroke="#a4c8e1" stroke-width="3"/>
${[0,20,40].map(value => `<text x="780" y="${py(value)+4}" text-anchor="end" font-size="12" fill="#b9c2ca">${value}</text>`).join('')}
${points.map(([seen,value]) => `<circle cx="${px(seen)}" cy="${py(value)}" r="4" fill="#a4c8e1"/><text x="${px(seen)}" y="${py(value)-10}" text-anchor="middle" font-size="13">${value}</text><text x="${px(seen)}" y="574" text-anchor="middle" font-size="13">${seen}</text>`).join('')}
<text x="958" y="592" text-anchor="middle" font-size="13" fill="#b9c2ca">Cards seen</text>
</g></svg>`;
await sharp(Buffer.from(svg)).jpeg({ quality: 92, mozjpeg: true }).toFile(new URL('app/public/media/social/fan-of-insight-v1.jpg', root).pathname);
