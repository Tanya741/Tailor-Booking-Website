// Canonical specializations used by customers and tailors.
// Keep label user-facing and slug stable for API and URLs.
export const SPECIALIZATIONS = [
  { label: 'Blouse Tailoring', slug: 'blouse-tailoring' },
  { label: 'Lehenga Tailoring', slug: 'lehenga-tailoring' },
  { label: 'Kurti Tailoring', slug: 'kurti-tailoring' },
  { label: 'Dress Tailoring', slug: 'dress-tailoring' },
  { label: 'Skirt Tailoring', slug: 'skirt-tailoring' },
  { label: 'Saree Stitching (ready-to-wear, pre-stitched)', slug: 'saree-stitching' },
  { label: 'Fall / Pico Work', slug: 'fall-pico-work' },
  { label: 'Top/Western Wear Tailoring', slug: 'top-western-wear-tailoring' },
];

export function getSpecializationLabel(slug) {
  const item = SPECIALIZATIONS.find((s) => s.slug === slug);
  return item ? item.label : slug;
}
