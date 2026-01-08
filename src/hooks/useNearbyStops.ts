import { useState, useEffect } from 'react';
import { BusStop, Location } from '../types';
import { searchNearbyBusStops } from '../services/api';
import { saveFavorite, removeFavorite, isFavorite } from '../services/storage/storage';

export function useNearbyStops(
  currentLocation: Location | null
) {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fetchNearby = async () => {
    if (!currentLocation) return;
    setIsLoading(true);
    setError(null);
    try {
      // TAGO API 사용 (500m 고정)
      const results = await searchNearbyBusStops(
        currentLocation.latitude,
        currentLocation.longitude
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
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  const loadFavorites = async () => {
    if (stops.length === 0) return;
    try {
      const favs = await Promise.all(
        stops.map((stop) => isFavorite(stop.id))
      );
      const favSet = new Set<string>();
      stops.forEach((stop, i) => {
        if (favs[i]) favSet.add(stop.id);
      });
      setFavorites(favSet);
    } catch (error) {
      console.error('즐겨찾기 불러오기 실패:', error);
      // 에러 발생 시 빈 Set으로 초기화
      setFavorites(new Set());
    }
  };

  const toggleFavorite = async (stop: BusStop) => {
    const isFav = favorites.has(stop.id);
    try {
      if (isFav) {
        const success = await removeFavorite(stop.id);
        if (success) {
          setFavorites((prev) => {
            const next = new Set(prev);
            next.delete(stop.id);
            return next;
          });
        }
      } else {
        const success = await saveFavorite(stop);
        if (success) {
          setFavorites((prev) => new Set(prev).add(stop.id));
        }
      }
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      // 에러 발생 시 UI는 변경하지 않음 (원래 상태 유지)
    }
  };

  return {
    stops,
    isLoading,
    error,
    favorites,
    toggleFavorite,
    fetchNearby,
  };
}

