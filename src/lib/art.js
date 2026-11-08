// Sample "photos" for the seeded listings, drawn as SVG so the prototype needs no image files.
// Real listings use photos uploaded by the agent (Listings → Photos).
//   photo('house', 0, 17) → data:image/svg+xml,...   variant 0 = exterior, 1 = dusk, 2 = living room, 3 = bedroom

const WALLS = ['#F4EDE1', '#E9EEF2', '#F3E3D3', '#E4ECE4', '#F6F1EA', '#DCE6EF'];
const ROOFS = ['#7A3E2E', '#3D4B5C', '#8C5A3C', '#2F5D50', '#5B4A6B', '#A0522D'];
const CARS = ['#C0392B', '#1F4E8C', '#F2F2F2', '#2D2D2D', '#7F8C8D', '#D4A017', '#2E7D5B', '#8E1F2F'];
const ACCENTS = ['#2E6F95', '#B5651D', '#5E8C61', '#8A5A83', '#C08A2E', '#3F6E8C'];

const pick = (arr, seed, salt = 0) => arr[Math.abs(Math.floor(seed * 7 + salt * 13)) % arr.length];
const enc = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const wrap = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;

function sky(dusk, id) {
  const [a, b] = dusk ? ['#F7A86B', '#6C5B9E'] : ['#9FD3F7', '#EAF6FF'];
  return {
    defs: `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${dusk ? a : b}"/><stop offset="1" stop-color="${dusk ? b : a}"/></linearGradient>`,
    body: `<rect width="800" height="560" fill="url(#${id})"/>${dusk ? '<circle cx="640" cy="330" r="46" fill="#FFD9A0" opacity=".85"/>' : '<circle cx="660" cy="90" r="38" fill="#FFF6C9"/><g fill="#fff" opacity=".9"><ellipse cx="180" cy="90" rx="70" ry="18"/><ellipse cx="230" cy="78" rx="48" ry="20"/><ellipse cx="520" cy="130" rx="60" ry="14"/></g>'}`,
  };
}

function tree(x, y, s = 1, c = '#3E7D4E') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="44" fill="#6B4B32"/><circle cx="0" cy="-14" r="34" fill="${c}"/><circle cx="-22" cy="4" r="22" fill="${c}"/><circle cx="22" cy="2" r="24" fill="${c}"/></g>`;
}

function windowBox(x, y, w, h, lit) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${lit ? '#FFE3A3' : '#A9CBE3'}" stroke="#fff" stroke-width="5"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="#fff" stroke-width="3"/>`;
}

function houseScene(seed, dusk, twoStorey) {
  const s = sky(dusk, 'sk');
  const wall = pick(WALLS, seed); const roof = pick(ROOFS, seed, 1);
  const grass = dusk ? '#4F7A55' : '#7DBB6E';
  const top = twoStorey ? 170 : 250;
  return wrap(`${s.body}
    <rect y="420" width="800" height="140" fill="${grass}"/>
    ${tree(110, 360, 1.3, dusk ? '#2F5E3D' : '#3E7D4E')}${tree(700, 370, 1.1, dusk ? '#2F5E3D' : '#4E8F57')}
    <rect x="230" y="${top}" width="340" height="${430 - top}" fill="${wall}"/>
    <polygon points="200,${top + 4} 400,${top - 110} 600,${top + 4}" fill="${roof}"/>
    ${twoStorey ? `${windowBox(270, 200, 70, 60, dusk)}${windowBox(460, 200, 70, 60, dusk)}<rect x="230" y="290" width="340" height="10" fill="${roof}" opacity=".35"/>` : ''}
    ${windowBox(265, 320, 80, 64, dusk)}${windowBox(455, 320, 80, 64, dusk)}
    <rect x="370" y="330" width="60" height="100" rx="4" fill="${roof}"/><circle cx="418" cy="384" r="4" fill="#F2C14E"/>
    <path d="M370 560 L400 430 L430 430 L470 560Z" fill="#D9CBB3"/>
    <g stroke="#fff" stroke-width="6" opacity=".9"><path d="M0 450h200M600 450h200"/>${[20, 60, 100, 140, 180, 620, 660, 700, 740, 780].map((x) => `<path d="M${x} 430v40"/>`).join('')}</g>`, s.defs);
}

function condoScene(seed, dusk) {
  const s = sky(dusk, 'sk');
  const c = pick(['#C9D6E3', '#D8D2C8', '#B9C7D6', '#CFD9D2'], seed);
  const win = (x, y, cols, rows, w, h, gap) => Array.from({ length: rows * cols }, (_, i) => {
    const cx = x + (i % cols) * (w + gap); const cy = y + Math.floor(i / cols) * (h + gap);
    const lit = dusk && (i * 7 + seed) % 3 !== 0;
    return `<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${lit ? '#FFE3A3' : '#7FA7C9'}" opacity="${lit ? 1 : 0.85}"/>`;
  }).join('');
  return wrap(`${s.body}
    <rect x="40" y="250" width="150" height="310" fill="#AEBBC8"/>${win(55, 265, 4, 9, 24, 18, 10)}
    <rect x="610" y="210" width="160" height="350" fill="#A8B6C4"/>${win(625, 225, 4, 10, 26, 20, 11)}
    <rect x="270" y="60" width="260" height="500" fill="${c}"/>
    <rect x="262" y="48" width="276" height="20" fill="#7D8C9C"/>
    ${win(290, 85, 6, 15, 30, 18, 9)}
    <rect y="520" width="800" height="40" fill="#8D9AA6"/>${tree(230, 500, 0.8)}${tree(570, 500, 0.8)}`, s.defs);
}

function townhouseScene(seed, dusk) {
  const s = sky(dusk, 'sk');
  const units = [0, 1, 2].map((i) => {
    const x = 120 + i * 190; const wall = pick(WALLS, seed, i + 2); const roof = pick(ROOFS, seed, 1);
    return `<rect x="${x}" y="200" width="180" height="240" fill="${wall}"/><polygon points="${x - 10},204 ${x + 90},130 ${x + 190},204" fill="${roof}"/>
      ${windowBox(x + 25, 225, 55, 50, dusk)}${windowBox(x + 100, 225, 55, 50, dusk)}<rect x="${x + 25}" y="330" width="50" height="110" fill="${roof}" opacity=".9"/>${windowBox(x + 100, 330, 55, 55, dusk)}`;
  }).join('');
  return wrap(`${s.body}<rect y="440" width="800" height="120" fill="${dusk ? '#4F7A55' : '#86C27A'}"/>${units}<rect y="470" width="800" height="30" fill="#BDB6A8"/>${tree(60, 400, 0.9)}${tree(750, 400, 0.9)}`, s.defs);
}

function lotScene(seed, dusk) {
  const s = sky(dusk, 'sk');
  return wrap(`${s.body}
    <path d="M0 330 L160 230 L300 320 L470 200 L640 310 L800 240 L800 560 L0 560Z" fill="${dusk ? '#5C6E8A' : '#8FB3C9'}" opacity=".8"/>
    <path d="M0 380 Q200 340 400 370 T800 360 L800 560 L0 560Z" fill="${dusk ? '#5D8A4F' : '#8CC56A'}"/>
    <path d="M0 450 Q300 420 800 440 L800 560 L0 560Z" fill="${dusk ? '#4E7A43' : '#77B45A'}"/>
    ${tree(120, 380, 1)}${tree(620, 370, 1.2)}${tree(720, 390, 0.8)}
    <g stroke="#8A6A45" stroke-width="6">${Array.from({ length: 12 }, (_, i) => `<path d="M${40 + i * 64} 470v50"/>`).join('')}<path d="M40 482h710M40 505h710" stroke-width="3"/></g>
    <g transform="translate(360 330)"><rect x="-4" y="40" width="8" height="90" fill="#6B4B32"/><rect x="-70" y="0" width="140" height="56" rx="6" fill="#fff"/><text x="0" y="36" font-family="Arial" font-weight="700" font-size="22" text-anchor="middle" fill="${pick(ACCENTS, seed)}">LOT FOR SALE</text></g>`, s.defs);
}

function commercialScene(seed, dusk) {
  const s = sky(dusk, 'sk');
  const a = pick(ACCENTS, seed);
  const stripes = Array.from({ length: 10 }, (_, i) => `<rect x="${170 + i * 46}" y="250" width="23" height="46" fill="${a}"/>`).join('');
  return wrap(`${s.body}<rect y="470" width="800" height="90" fill="#A3A7AD"/>
    <rect x="150" y="120" width="500" height="350" fill="${pick(WALLS, seed, 3)}"/>
    <rect x="150" y="120" width="500" height="70" fill="#3C4654"/><text x="400" y="167" font-family="Arial" font-weight="700" font-size="30" text-anchor="middle" fill="#fff">COMMERCIAL SPACE</text>
    <rect x="170" y="250" width="460" height="46" fill="#fff"/>${stripes}
    <rect x="190" y="310" width="250" height="160" fill="${dusk ? '#FFE3A3' : '#A9CBE3'}" stroke="#3C4654" stroke-width="6"/>
    <rect x="470" y="310" width="140" height="160" fill="#3C4654"/><rect x="480" y="320" width="120" height="150" fill="${dusk ? '#FFD27F' : '#8FB8D8'}"/>
    ${tree(80, 430, 0.9)}${tree(720, 430, 0.9)}`, s.defs);
}

function livingRoom(seed) {
  const wall = pick(['#EFE6DA', '#E3EAF0', '#EDE3E6', '#E6EDE4'], seed); const sofa = pick(['#5B7C99', '#8A6E5A', '#6E8B6B', '#9A5B5B', '#4F5D75'], seed, 2);
  return wrap(`<rect width="800" height="560" fill="${wall}"/><rect y="400" width="800" height="160" fill="#C49A6C"/>
    <g stroke="#B3875A" stroke-width="2">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 100} 400v160"/>`).join('')}</g>
    <rect x="470" y="80" width="230" height="240" fill="#BFE0F5" stroke="#fff" stroke-width="12"/><path d="M585 80v240M470 200h230" stroke="#fff" stroke-width="6"/>
    <rect x="130" y="120" width="160" height="110" fill="${pick(ACCENTS, seed)}" stroke="#7A5B3A" stroke-width="8"/><path d="M140 220l45-50 35 35 25-20 35 35z" fill="#F4EDE1" opacity=".8"/>
    <ellipse cx="400" cy="500" rx="300" ry="40" fill="#E9DCC6"/>
    <rect x="110" y="330" width="380" height="110" rx="26" fill="${sofa}"/><rect x="110" y="290" width="380" height="70" rx="26" fill="${sofa}" opacity=".85"/>
    <rect x="90" y="320" width="50" height="120" rx="20" fill="${sofa}"/><rect x="460" y="320" width="50" height="120" rx="20" fill="${sofa}"/>
    <rect x="250" y="440" width="200" height="16" rx="6" fill="#7A5B3A"/><rect x="265" y="456" width="10" height="40" fill="#7A5B3A"/><rect x="425" y="456" width="10" height="40" fill="#7A5B3A"/>
    <g transform="translate(640 300)"><rect x="-26" y="70" width="52" height="60" rx="8" fill="#D7C2A3"/><circle cy="40" r="44" fill="#4E8F57"/><circle cx="-30" cy="60" r="26" fill="#3E7D4E"/><circle cx="30" cy="58" r="28" fill="#5DA067"/></g>
    <g transform="translate(560 300)"><rect x="-4" y="0" width="8" height="130" fill="#555"/><path d="M-36 0h72l-16-50h-40z" fill="#F7E7B9"/></g>`);
}

function bedroom(seed) {
  const wall = pick(['#E8E1EE', '#E4EEF0', '#F1E8DD', '#E5EBE2'], seed, 1); const bed = pick(['#F5F5F5', '#E8EEF5', '#F4ECE2'], seed);
  const blanket = pick(['#6F8FAF', '#C08A5B', '#7FA38A', '#A0708A'], seed, 3);
  return wrap(`<rect width="800" height="560" fill="${wall}"/><rect y="420" width="800" height="140" fill="#B8936A"/>
    <rect x="80" y="70" width="190" height="230" fill="#BFE0F5" stroke="#fff" stroke-width="12"/><path d="M175 70v230" stroke="#fff" stroke-width="6"/>
    <rect x="300" y="170" width="380" height="140" rx="18" fill="#7A5B3A"/>
    <rect x="290" y="290" width="400" height="150" rx="14" fill="${bed}"/><rect x="290" y="340" width="400" height="100" rx="14" fill="${blanket}"/>
    <rect x="320" y="250" width="150" height="60" rx="20" fill="#fff"/><rect x="500" y="250" width="150" height="60" rx="20" fill="#fff"/>
    <rect x="700" y="330" width="80" height="90" rx="6" fill="#8C6A48"/><circle cx="740" cy="300" r="26" fill="#F7E7B9"/><rect x="736" y="310" width="8" height="22" fill="#555"/>`);
}

function carScene(seed, studio) {
  const body = pick(CARS, seed); const s = sky(false, 'sk');
  const bg = studio
    ? '<defs><radialGradient id="st" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#F7F8FA"/><stop offset="1" stop-color="#C9CFD8"/></radialGradient></defs><rect width="800" height="560" fill="url(#st)"/><ellipse cx="400" cy="440" rx="330" ry="26" fill="#9BA3AF" opacity=".5"/>'
    : `${s.body}<rect y="380" width="800" height="180" fill="#6D7178"/><path d="M0 470h800" stroke="#fff" stroke-width="6" stroke-dasharray="50 40"/>${tree(80, 330, 0.9)}${tree(720, 330, 1)}`;
  const suv = seed % 3 === 0;
  const roofY = suv ? 205 : 230;
  return wrap(`${bg}
    <path d="M110 400 L120 330 Q130 300 175 295 L250 290 L320 ${roofY} Q340 ${roofY - 12} 380 ${roofY - 12} L520 ${roofY - 12} Q560 ${roofY - 10} 590 ${roofY + 20} L640 290 L690 300 Q720 310 720 340 L720 400Z" fill="${body}" stroke="#1f1f1f" stroke-opacity=".25" stroke-width="3"/>
    <path d="M270 292 L330 ${roofY + 8} Q345 ${roofY - 2} 375 ${roofY - 2} L430 ${roofY - 2} L430 292Z" fill="#2B3A4A" opacity=".85"/>
    <path d="M445 292 L445 ${roofY - 2} L515 ${roofY - 2} Q550 ${roofY} 570 ${roofY + 22} L610 292Z" fill="#2B3A4A" opacity=".85"/>
    <rect x="690" y="318" width="26" height="16" rx="4" fill="#FFE9A8"/><rect x="112" y="318" width="20" height="16" rx="4" fill="#D9534F"/>
    <path d="M110 368h610" stroke="#000" stroke-opacity=".12" stroke-width="4"/>
    ${[230, 600].map((x) => `<circle cx="${x}" cy="400" r="54" fill="#1E1E1E"/><circle cx="${x}" cy="400" r="30" fill="#BFC5CC"/><circle cx="${x}" cy="400" r="8" fill="#555"/>`).join('')}`, studio ? '' : s.defs);
}

function carInterior(seed) {
  const trim = pick(['#2B2B2B', '#5A4636', '#3B4652', '#D8CBB5'], seed);
  return wrap(`<rect width="800" height="560" fill="#9FC7E6"/><rect y="0" width="800" height="120" fill="#2B2B2B"/>
    <path d="M0 260 Q400 200 800 260 L800 560 L0 560Z" fill="${trim}"/>
    <rect x="300" y="300" width="200" height="90" rx="12" fill="#111"/><rect x="312" y="312" width="176" height="66" rx="8" fill="#2E6F95"/>
    <circle cx="200" cy="380" r="120" fill="none" stroke="#151515" stroke-width="30"/><circle cx="200" cy="380" r="34" fill="#151515"/><path d="M90 380h220M200 380v110" stroke="#151515" stroke-width="22"/>
    <circle cx="610" cy="330" r="34" fill="#1d1d1d"/><circle cx="690" cy="330" r="34" fill="#1d1d1d"/>`);
}

function motorcycleScene(seed) {
  const c = pick(CARS, seed, 2); const s = sky(false, 'sk');
  return wrap(`${s.body}<rect y="400" width="800" height="160" fill="#6D7178"/>${tree(100, 350, 0.9)}${tree(700, 350, 0.9)}
    <circle cx="250" cy="400" r="70" fill="none" stroke="#1E1E1E" stroke-width="22"/><circle cx="560" cy="400" r="70" fill="none" stroke="#1E1E1E" stroke-width="22"/>
    <path d="M250 400 L340 320 L470 320 L560 400" stroke="#555" stroke-width="12" fill="none"/>
    <path d="M320 330 Q360 270 440 280 L500 300 L470 340 L340 340Z" fill="${c}"/>
    <path d="M430 285 L470 250 L520 250" stroke="#333" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="300" y="300" width="90" height="22" rx="10" fill="#222"/>`, s.defs);
}

/** kind: house | condo | townhouse | lot | commercial | car | motorcycle */
export function photo(kind, variant = 0, seed = 1) {
  switch (kind) {
    case 'house': return enc([houseScene(seed, false, seed % 2 === 0), houseScene(seed, true, seed % 2 === 0), livingRoom(seed), bedroom(seed)][variant % 4]);
    case 'condo': return enc([condoScene(seed, false), livingRoom(seed + 1), bedroom(seed + 2), condoScene(seed, true)][variant % 4]);
    case 'townhouse': return enc([townhouseScene(seed, false), livingRoom(seed + 3), bedroom(seed), townhouseScene(seed, true)][variant % 4]);
    case 'lot': return enc([lotScene(seed, false), lotScene(seed, true)][variant % 2]);
    case 'commercial': return enc([commercialScene(seed, false), commercialScene(seed, true), livingRoom(seed)][variant % 3]);
    case 'motorcycle': return enc(motorcycleScene(seed + variant));
    default: return enc([carScene(seed, false), carScene(seed, true), carInterior(seed)][variant % 3]);
  }
}

export const ART_KIND = { house_lot: 'house', condo: 'condo', townhouse: 'townhouse', lot: 'lot', commercial: 'commercial', car: 'car', motorcycle: 'motorcycle' };

/** Photo list for a listing: uploaded photos, or the generated sample art. */
export function listingPhotos(l) {
  if (l.photos && l.photos.length) return l.photos;
  const kind = ART_KIND[l.category] || 'house';
  const n = kind === 'lot' ? 2 : kind === 'motorcycle' ? 2 : kind === 'car' || kind === 'commercial' ? 3 : 4;
  return Array.from({ length: n }, (_, i) => photo(kind, i, l.artSeed || 1));
}

export const coverPhoto = (l) => listingPhotos(l)[0];
