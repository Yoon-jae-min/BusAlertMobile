import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusStop, Location } from '../types';
import { searchNearbyBusStops } from '../utils/busApi';
import { calculateDistanceQuick } from '../utils/walkingTime';
import { saveFavorite, removeFavorite, isFavorite } from '../utils/storage';

interface NearbyStopsProps {
  currentLocation: Location | null;
  onStopSelect: (stop: BusStop) => void;
  selectedStop: BusStop | null;
  radiusMeters?: number;
}

export default function NearbyStops({
  currentLocation,
  onStopSelect,
  selectedStop,
  radiusMeters = 1000,
}: NearbyStopsProps) {
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

  const handleToggleFavorite = async (stop: BusStop) => {
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

  const renderItem = ({ item }: { item: BusStop }) => {
    const distance = currentLocation
      ? Math.round(calculateDistanceQuick(currentLocation, item))
      : null;

    const isSelected = selectedStop?.id === item.id;
    const isFav = favorites.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.stopItem, isSelected && styles.selectedItem]}
        onPress={() => onStopSelect(item)}
        activeOpacity={0.8}
      >
        <View style={styles.stopContent}>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{item.name}</Text>
            {item.number && <Text style={styles.stopNumber}>번호: {item.number}</Text>}
            {item.address && <Text style={styles.stopAddress}>{item.address}</Text>}
            {distance !== null && (
              <Text style={styles.stopDistance}>거리: {distance}m</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            style={styles.favoriteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={24}
              color={isFav ? '#fbbf24' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="location" size={18} color="#38bdf8" style={styles.titleIcon} />
            <Text style={styles.title}>내 주변 정류장</Text>
          </View>
          <View style={styles.radiusRow}>
            {[
              { label: '500m', value: 500 },
              { label: '1km', value: 1000 },
              { label: '2km', value: 2000 },
            ].map((opt) => {
              const isActive = radius === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setRadius(opt.value)}
                  style={[
                    styles.radiusChip,
                    isActive && styles.radiusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      isActive && styles.radiusChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity
          onPress={fetchNearby}
          disabled={isLoading || !currentLocation}
          style={[
            styles.refreshButton,
            (!currentLocation || isLoading) && styles.disabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshText}>새로고침</Text>
          )}
        </TouchableOpacity>
      </View>

      {!currentLocation && (
        <Text style={styles.helperText}>위치 정보를 가져오면 주변 정류장을 보여드립니다.</Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>정류장 불러오는 중...</Text>
        </View>
      )}

      {!isLoading && currentLocation && (
        <View style={styles.listContainer}>
          <FlatList
            data={stops}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>주변에 정류장이 없습니다.</Text>
            }
            scrollEnabled={stops.length > 5}
            nestedScrollEnabled={stops.length > 5}
            showsVerticalScrollIndicator={stops.length > 5}
            contentContainerStyle={styles.listContent}
            style={styles.list}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    backgroundColor: '#020617',
  },
  radiusChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(8,47,73,0.95)',
  },
  radiusChipText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  radiusChipTextActive: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  refreshButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  helperText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  errorText: {
    color: '#fecaca',
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    color: '#9ca3af',
  },
  listContainer: {
    maxHeight: 300,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 4,
  },
  stopItem: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
  },
  selectedItem: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(8,47,73,0.95)',
  },
  stopContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  favoriteButton: {
    padding: 4,
    marginLeft: 8,
  },
  stopNumber: {
    fontSize: 14,
    color: '#cbd5f5',
  },
  stopAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  stopDistance: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 4,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

