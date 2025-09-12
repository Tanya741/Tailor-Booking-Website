import { useCallback, useEffect, useRef, useState } from 'react';

export default function useGeolocation(options = {}) {
  const [coords, setCoords] = useState(null); // { latitude, longitude, accuracy }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const getOnce = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError(new Error('Geolocation not supported'));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000, ...options }
    );
  }, [options]);

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError(new Error('Geolocation not supported'));
      return;
    }
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setCoords(pos.coords),
      (err) => setError(err),
      { enableHighAccuracy: true, maximumAge: 60000, ...options }
    );
  }, [options]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  return { coords, loading, error, getOnce, startWatch, stopWatch };
}
