// Sample photos for the seeded listings: real photos from Unsplash (Unsplash License,
// free to use), stored in public/photos so the demo does not depend on another site.
// Real listings use the photos uploaded by the agent (Listings → Photos).

const POOLS = {
  house_new: [
    '1600596542815-ffad4c1539a9',
    '1600585154340-be6161a56a0c',
    '1580587771525-78b9dba3b914',
    '1613490493576-7fde63acd811',
    '1600047509807-ba8f99d2cdde',
    '1512917774080-9991f1c4c750',
    '1523217582562-09d0def993a6',
    '1564013799919-ab600027ffc6'
  ],
  house_old: [
    '1570129477492-45c003edd2be',
    '1572120360610-d971b9d7767c',
    '1449844908441-8829872d2607',
    '1568605114967-8130f3a36994',
    '1583608205776-bfd35f0d9f83',
    '1598228723793-52759bba239c',
    '1592595896551-12b371d546d5',
    '1576941089067-2de3c901e126',
    '1558036117-15d82a90b9b1',
    '1599809275671-b5942cabc7a2',
    '1416331108676-a22ccb276e35',
    '1582268611958-ebfd161ef9cf'
  ],
  town: [
    '1567496898669-ee935f5f647a',
    '1605276374104-dee2a0ed3cd6',
    '1555636222-cae831e670b3'
  ],
  living: [
    '1522708323590-d24dbb6b0267',
    '1502672260266-1c1ef2d93688',
    '1586023492125-27b2c045efd7',
    '1600210492486-724fe5c67fb0',
    '1560448204-e02f11c3d0e2',
    '1600607687939-ce8a6c25118c',
    '1617806118233-18e1de247200',
    '1616486338812-3dadae4b4ace',
    '1493809842364-78817add7ffb',
    '1604014237800-1c9102c219da'
  ],
  kitchen: [
    '1484154218962-a197022b5858',
    '1556911220-bff31c812dba',
    '1600489000022-c2086d79f9d4'
  ],
  bedroom: [
    '1595526114035-0d45ed16cfbf',
    '1540518614846-7eded433c457',
    '1522771739844-6a9f6d5f14af',
    '1512918728675-ed5a9ecdebfd'
  ],
  bath: [
    '1584622650111-993a426fbf0a',
    '1552321554-5fefe8c9ef14'
  ],
  condo: [
    '1545324418-cc1a3fa10c00',
    '1574362848149-11496d93a7c7',
    '1460317442991-0ec209397118',
    '1515263487990-61b07816b324'
  ],
  amenity: [
    '1576013551627-0cc20b96c2a7',
    '1571896349842-33c89424de2d'
  ],
  commercial: [
    '1486406146926-c627a92ad1ab',
    '1497366216548-37526070297c',
    '1497366811353-6870744d04b2',
    '1441986300917-64674bd600d8'
  ],
  land: [
    '1500382017468-9049fed747ef',
    '1500076656116-558758c991c1',
    '1464822759023-fed622ff2c3b'
  ],
  suv: [
    '1533473359331-0135ef1b58bf',
    '1519641471654-76ce0107ad1b'
  ],
  pickup: [
    '1559416523-140ddc3d238c'
  ],
  sedan: [
    '1621007947382-bb3c3994e3fb',
    '1619767886558-efdc259cde1a',
    '1555215695-3004980ad54e',
    '1590362891991-f776e747a588',
    '1580273916550-e323be2ae537'
  ],
  hatch: [
    '1549317661-bd32c8ce0db2',
    '1489824904134-891ab64532f1'
  ],
  coupe: [
    '1502877338535-766e1452684a',
    '1568605117036-5fe5e7bab0b7',
    '1494976388531-d1058494cdd8',
    '1552519507-da3b142c6e3d'
  ],
  carint: [
    '1449965408869-eaa3f722e40d'
  ],
  moto: [
    '1622185135505-2d795003994a',
    '1591637333184-19aa84b3e01f',
    '1558981806-ec527fa84c39',
    '1558980664-10e7170b5df9',
    '1449426468159-d96dbf08f19f',
    '1568772585407-9361f9bf3a87'
  ]
};

const url = (id) => `/photos/${id}.jpg`;
// Different steps per pool so neighbouring listings do not share the same photos.
const pick = (pool, n, step = 1) => url(POOLS[pool][(n * step) % POOLS[pool].length]);

const BODY = { SUV: 'suv', MPV: 'suv', Van: 'suv', Pickup: 'pickup', Sedan: 'sedan', Hatchback: 'hatch', Coupe: 'coupe' };

/** Photo list for a listing: uploaded photos, or matching sample photos. */
export function listingPhotos(l) {
  if (l.photos && l.photos.length) return l.photos;
  const n = Math.max(0, Math.round(((l.artSeed || 1) - 1) / 3));
  const isNew = l.condition === 'brand_new' || l.condition === 'pre_selling';
  switch (l.category) {
    case 'condo': return [pick('condo', n), pick('living', n, 3), pick('bedroom', n), pick('kitchen', n), pick('amenity', n)];
    case 'townhouse': return [pick('town', n), pick('living', n, 7), pick('kitchen', n, 2), pick('bedroom', n, 3), pick('bath', n)];
    case 'lot': return [pick('land', n), pick('land', n + 1)];
    case 'commercial': return [pick('commercial', n), pick('commercial', n + 1), pick('commercial', n + 2)];
    case 'car': { const body = BODY[l.specs?.bodyType] || 'sedan'; return [pick(body, n), pick(body, n + 1), pick('carint', n)]; }
    case 'motorcycle': return [pick('moto', n), pick('moto', n + 3)];
    default: return [pick(isNew ? 'house_new' : 'house_old', n, 5), pick('living', n, 3), pick('kitchen', n), pick('bedroom', n, 3), pick('bath', n)];
  }
}

export const coverPhoto = (l) => listingPhotos(l)[0];
