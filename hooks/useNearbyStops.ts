import { useState, useEffect } from 'react';
import { BusStop, Location } from '../types';
import { searchNearbyBusStops } from '../utils/busApi';
import { saveFavorite, removeFavorite, isFavorite } from '../utils/storage';

export function useNearbyStops(
  currentLocation: Location | null,
  radiusMeters: number = 1000
) {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(radiusMeters);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fetchNearby = async () => {
    if (!currentLocation) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchNearbyBusStops(
        currentLocation.latitude,
        currentLocation.longitude,
        radius
      );
      setStops(results);
    } catch (err: any) {
      setError(err.message || '주변 정류장을 불러올 수 없습니다.');
      setStops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation?.latitude, currentLocation?.longitude, radius]);

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  const loadFavorites = async () => {
    if (stops.length === 0) return;
    const favs = await Promise.all(
      stops.map((stop) => isFavorite(stop.id))
    );
    const favSet = new Set<string>();
    stops.forEach((stop, i) => {
      if (favs[i]) favSet.add(stop.id);
    });
    setFavorites(favSet);
  };

  const toggleFavorite = async (stop: BusStop) => {
    const isFav = favorites.has(stop.id);
    if (isFav) {
      await removeFavorite(stop.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(stop.id);
        return next;
      });
    } else {
      await saveFavorite(stop);
      setFavorites((prev) => new Set(prev).add(stop.id));
    }
  };

  return {
    stops,
    isLoading,
    error,
    radius,
    setRadius,
    favorites,
    toggleFavorite,
    fetchNearby,
  };
}

