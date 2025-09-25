// Simple geocoding using OpenStreetMap Nominatim (for development/testing).
// NOTE: Nominatim has usage policies; for production, consider Google Maps, Mapbox, etc.

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

function buildQueryVariants(q) {
  const original = q.trim();
  const cleaned = original
    .replace(/[\.]/g, ' ') // remove stray dots
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
  // common typo fix: fostel -> hostel
  const typoFixed = cleaned.replace(/\bfostel\b/i, 'hostel');

  const variants = [original];
  if (typoFixed !== original) variants.push(typoFixed);
  if (cleaned !== original) variants.push(cleaned);

  // If it seems like a campus building, append campus/city/country context
  const lower = typoFixed.toLowerCase();
  const withCampus = /subansiri|hostel|iit/.test(lower)
    ? `${typoFixed}, IIT Guwahati, Assam, India`
    : `${typoFixed}, India`;
  variants.push(withCampus);

  // Deduplicate while preserving order
  return Array.from(new Set(variants)).slice(0, 5);
}

function pickBest(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  // Prefer highest importance if provided, else first result
  const withScore = items.filter((it) => typeof it.importance === 'number');
  if (withScore.length) {
    return withScore.reduce((best, it) => (it.importance > (best.importance ?? -Infinity) ? it : best));
  }
  return items[0];
}

export async function geocodeAddress(query) {
  if (!query) return null;
  // Nominatim with helpful variants
  const variants = buildQueryVariants(query);
  for (const q of variants) {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '5',
      countrycodes: 'in',
      addressdetails: '0',
    });
    const res = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) continue;
    const list = await res.json();
    const item = pickBest(list);
    if (item) {
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        name: item.display_name,
      };
    }
  }
  return null;
}

export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    zoom: '14',
  });
  const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  const name = data.display_name || null;
  return name ? { lat: Number(lat), lng: Number(lng), name } : null;
}
