import React, { useState, useEffect, useMemo } from 'react';
import { SectionList, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationTracker from '../components/LocationTracker';
import BusStopSearch from '../components/BusStopSearch';
import BusArrivalInfo from '../components/BusArrivalInfo';
import { Location, BusStop } from '../types';
import { calculateWalkingTime } from '../utils/walkingTime';
import { getSettings } from '../utils/storage';
import { useNearbyStops } from '../hooks/useNearbyStops';

type SectionData = {
  type: 'header' | 'location' | 'nearby-header' | 'nearby-stop' | 'search' | 'walking' | 'arrival';
  data?: any;
};

export default function HomeScreen() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [walkingTime, setWalkingTime] = useState<number | null>(null);
  const [defaultRadius, setDefaultRadius] = useState(1000);

  const nearbyStops = useNearbyStops(currentLocation, defaultRadius);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setDefaultRadius(settings.defaultRadius);
  };

  useEffect(() => {
    if (currentLocation && selectedStop) {
      const route = calculateWalkingTime(currentLocation, selectedStop);
      setWalkingTime(route.duration);
    } else {
      setWalkingTime(null);
    }
  }, [currentLocation, selectedStop]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`;
    }
    return `${remainingSeconds}초`;
  };

  const renderStopItem = ({ item }: { item: BusStop }) => {
    const distance = currentLocation
      ? Math.round(calculateWalkingTime(currentLocation, item).distance)
      : null;
    const isSelected = selectedStop?.id === item.id;
    const isFav = nearbyStops.favorites.has(item.id);
    const itemWalkingTime = isSelected && currentLocation && selectedStop
      ? calculateWalkingTime(currentLocation, selectedStop).duration
      : null;

    return (
      <View>
        <TouchableOpacity
          style={[styles.stopItem, isSelected && styles.selectedItem]}
          onPress={() => setSelectedStop(isSelected ? null : item)}
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
              onPress={() => nearbyStops.toggleFavorite(item)}
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
        
        {/* 선택된 정류장 바로 아래에 도보 정보와 도착 정보 표시 */}
        {isSelected && currentLocation && (
          <View style={styles.selectedStopInfo}>
            {itemWalkingTime && (
              <View style={styles.walkingInfoInline}>
                <View style={styles.walkingTitleRow}>
                  <Ionicons name="walk" size={18} color="#38bdf8" style={styles.walkingIcon} />
                  <Text style={styles.walkingTitle}>도보 정보</Text>
                </View>
                <Text style={styles.walkingTime}>
                  소요 시간: {formatTime(itemWalkingTime)}
                </Text>
              </View>
            )}
            <BusArrivalInfo
              busStop={item}
              currentLocation={currentLocation}
              walkingTime={itemWalkingTime}
              inline={true}
            />
          </View>
        )}
      </View>
    );
  };

  const sections = useMemo(() => {
    const result: Array<{ title: string; data: SectionData[] }> = [];

    // Header section
    result.push({
      title: 'header',
      data: [{ type: 'header' }],
    });

    // Location section
    result.push({
      title: 'location',
      data: [{ type: 'location' }],
    });

    // Search section (정류장 목록 위로)
    result.push({
      title: 'search',
      data: [{ type: 'search' }],
    });

    // Nearby stops section
    if (currentLocation) {
      result.push({
        title: 'nearby',
        data: [
          { type: 'nearby-header' },
          ...nearbyStops.stops.map((stop) => ({ type: 'nearby-stop' as const, data: stop })),
        ],
      });
    }

    return result;
  }, [currentLocation, nearbyStops.stops, selectedStop, walkingTime]);

  const renderItem = ({ item }: { item: SectionData }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="bus" size={28} color="#38bdf8" />
              <Text style={styles.headerTitle}>버스 도착 알림</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              현재 위치부터 정류장까지의 시간을 계산하여 출발 시간을 알려드립니다
            </Text>
          </View>
        );
      case 'location':
        return (
          <LocationTracker
            onLocationUpdate={setCurrentLocation}
            currentLocation={currentLocation}
          />
        );
      case 'nearby-header':
        return (
          <View style={styles.nearbyHeader}>
            <View style={styles.nearbyHeaderContent}>
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
                  const isActive = nearbyStops.radius === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => nearbyStops.setRadius(opt.value)}
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
              onPress={nearbyStops.fetchNearby}
              disabled={nearbyStops.isLoading || !currentLocation}
              style={[
                styles.refreshButton,
                (!currentLocation || nearbyStops.isLoading) && styles.disabled,
              ]}
            >
              {nearbyStops.isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.refreshText}>새로고침</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'nearby-stop':
        return renderStopItem({ item: item.data as BusStop });
      case 'search':
        return (
          <BusStopSearch
            onStopSelect={setSelectedStop}
            selectedStop={selectedStop}
          />
        );
      default:
        return null;
    }
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => {
    if (section.title === 'nearby' && !currentLocation) {
      return (
        <View style={styles.nearbyContainer}>
          <Text style={styles.helperText}>위치 정보를 가져오면 주변 정류장을 보여드립니다.</Text>
        </View>
      );
    }
    if (section.title === 'nearby' && nearbyStops.error) {
      return (
        <View style={styles.nearbyContainer}>
          <Text style={styles.errorText}>{nearbyStops.error}</Text>
        </View>
      );
    }
    if (section.title === 'nearby' && nearbyStops.isLoading) {
      return (
        <View style={styles.nearbyContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>정류장 불러오는 중...</Text>
          </View>
        </View>
      );
    }
    if (section.title === 'nearby' && nearbyStops.stops.length === 0 && !nearbyStops.isLoading) {
      return (
        <View style={styles.nearbyContainer}>
          <Text style={styles.emptyText}>주변에 정류장이 없습니다.</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e5e7eb',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 20,
  },
  nearbyContainer: {
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
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyHeaderContent: {
    flex: 1,
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
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  stopItem: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 18,
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
  selectedStopInfo: {
    marginHorizontal: 18,
    marginBottom: 10,
    flex: 1,
  },
  walkingInfoInline: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  walkingInfo: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 6,
  },
  walkingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walkingIcon: {
    marginRight: 8,
  },
  walkingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  walkingTime: {
    fontSize: 16,
    color: '#38bdf8',
    fontWeight: '700',
  },
});

