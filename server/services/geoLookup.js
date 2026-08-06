const crypto = require('crypto');

const KNOWN_LOCATIONS = {
  '102.89.32.10': { city: 'Oghara', country: 'Nigeria', lat: 5.9386, lng: 5.9243 },
  '102.89.32.11': { city: 'Oghara', country: 'Nigeria', lat: 5.9386, lng: 5.9243 },
  '105.112.102.170': { city: 'Delta', country: 'Nigeria', lat: 6.335, lng: 5.616 },
  '197.210.28.200': { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  '41.79.99.99': { city: 'Abuja', country: 'Nigeria', lat: 9.0579, lng: 7.4951 },
  '154.113.10.50': { city: 'Port Harcourt', country: 'Nigeria', lat: 4.8156, lng: 7.0498 },
  '1.2.3.4': { city: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  '8.8.8.8': { city: 'Mountain View', country: 'USA', lat: 37.422, lng: -122.084 },
  '203.0.113.10': { city: 'Testville', country: 'Unknown', lat: 0, lng: 0 },
  '198.51.100.20': { city: 'Faraway', country: 'Unknown', lat: -30.5595, lng: 22.9375 },
};

const FALLBACK_POOL = [
  { city: 'Warri', country: 'Nigeria', lat: 5.5174, lng: 5.7506 },
  { city: 'Benin City', country: 'Nigeria', lat: 6.335, lng: 5.616 },
  { city: 'Sapele', country: 'Nigeria', lat: 5.894, lng: 5.6933 },
  { city: 'Agbor', country: 'Nigeria', lat: 6.254, lng: 6.194 },
  { city: 'Enugu', country: 'Nigeria', lat: 6.5244, lng: 7.5186 },
];

const hashToIndex = (str, len) => {
  const h = crypto.createHash('sha256').update(String(str)).digest();
  return h.readUInt32BE(0) % len;
};

const lookup = (ip) => {
  if (!ip) {
    return { city: 'Unknown', country: 'Unknown', lat: 0, lng: 0 };
  }
  if (KNOWN_LOCATIONS[ip]) {
    return { ...KNOWN_LOCATIONS[ip], source: 'stub-map' };
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return { city: 'Localhost', country: 'Local', lat: 5.9386, lng: 5.9243, source: 'stub-local' };
  }
  return { ...FALLBACK_POOL[hashToIndex(ip, FALLBACK_POOL.length)], source: 'stub-hash' };
};

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

module.exports = { lookup, haversineKm, KNOWN_LOCATIONS };
