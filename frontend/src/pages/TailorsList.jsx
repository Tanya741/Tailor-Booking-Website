import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import RatingStars from '../components/RatingStars.jsx';
import { getSpecializationLabel } from '../constants/specializations';

const MOCK_TAILORS = [
  { id: 1, name: 'Ayesha Khan', city: 'Mumbai', rating: 4.8, reviews: 126, specialty: 'Bridal & Couture' },
  { id: 2, name: 'Rohan Mehta', city: 'Delhi', rating: 4.6, reviews: 89, specialty: 'Men’s Suits' },
  { id: 3, name: 'Sara Ali', city: 'Bangalore', rating: 4.9, reviews: 210, specialty: 'Alterations' },
  { id: 4, name: 'Vikram Singh', city: 'Pune', rating: 4.5, reviews: 72, specialty: 'Ethnic Wear' },
];

export default function TailorsList() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const activeSpec = params.get('specialization') || '';
  const activeLocation = params.get('location') || '';
  const lat = params.get('lat');
  const lng = params.get('lng');
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Top Tailors near you</h2>
            <p className="text-gray-500">Handpicked professionals with great reviews</p>
          </div>
          <div className="flex gap-2">
            <Button>Filters</Button>
            <Button className="bg-gray-900 hover:bg-black">Sort</Button>
          </div>
        </div>

        {(activeSpec || activeLocation || (lat && lng)) && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {activeLocation && (
              <span className="px-3 py-1 rounded-full border border-accent text-primary text-sm bg-accent/10">
                Location: {activeLocation}
              </span>
            )}
            {activeSpec && (
              <span className="px-3 py-1 rounded-full border border-accent text-primary text-sm bg-accent/10">
                Specialization: {getSpecializationLabel(activeSpec)}
              </span>
            )}
            {lat && lng && (
              <span className="px-3 py-1 rounded-full border border-accent text-primary text-sm bg-accent/10">
                Coords: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </span>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {MOCK_TAILORS.map(t => (
            <Card key={t.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 grid place-items-center text-gray-400">
                Photo
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t.name}</h3>
                  <span className="text-xs text-gray-500">{t.city}</span>
                </div>
                <p className="text-sm text-gray-600">{t.specialty}</p>
                <div className="flex items-center gap-2">
                  <RatingStars value={Math.round(t.rating)} />
                  <span className="text-sm text-gray-500">{t.rating} • {t.reviews} reviews</span>
                </div>
                <div className="pt-2">
                  <Button className="w-full">View Profile</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
