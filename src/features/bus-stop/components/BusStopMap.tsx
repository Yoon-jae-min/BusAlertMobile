/**
 * 정류장 지도 컴포넌트
 * 주변 정류장을 지도에 마커로 표시
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Location, BusStop } from '../../../types';

interface BusStopMapProps {
  currentLocation: Location | null;
  busStops: BusStop[];
  selectedStop: BusStop | null;
  onStopSelect: (stop: BusStop) => void;
}

export default function BusStopMap({
  currentLocation,
  busStops,
  selectedStop,
  onStopSelect,
}: BusStopMapProps) {
  // 지도 초기 영역 계산 (현재 위치와 모든 정류장을 포함)
  const initialRegion = useMemo<Region | undefined>(() => {
    if (!currentLocation) return undefined;

    if (busStops.length === 0) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // 모든 정류장의 위도/경도 범위 계산
    const latitudes = [currentLocation.latitude, ...busStops.map((s) => s.latitude)];
    const longitudes = [currentLocation.longitude, ...busStops.map((s) => s.longitude)];

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    // 여백을 위해 델타 값 계산
    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lonDelta = (maxLon - minLon) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(latDelta, 0.005),
      longitudeDelta: Math.max(lonDelta, 0.005),
    };
  }, [currentLocation, busStops]);

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>위치 정보를 가져오면 지도를 표시합니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={false}
        mapType="standard"
      >
        {/* 현재 위치 마커 (사용자 위치는 showsUserLocation으로 표시됨) */}
        
        {/* 정류장 마커 */}
        {busStops.map((stop) => {
          const isSelected = selectedStop?.id === stop.id;
          return (
            <Marker
              key={stop.id}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              title={stop.name}
              description={stop.address || `거리: ${stop.distance || 0}m`}
              onPress={() => onStopSelect(stop)}
            >
              <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
                <Ionicons
                  name="bus"
                  size={20}
                  color="#fff"
                />
                {isSelected && (
                  <View style={styles.markerSelectedRing} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* 정류장 개수 표시 */}
      {busStops.length > 0 && (
        <View style={styles.infoOverlay}>
          <View style={styles.infoBox}>
            <Ionicons name="location" size={16} color="#38bdf8" />
            <Text style={styles.infoText}>
              주변 정류장 {busStops.length}개
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  markerContainer: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  markerSelected: {
    backgroundColor: '#38bdf8',
    transform: [{ scale: 1.15 }],
    borderColor: '#60a5fa',
    borderWidth: 4,
  },
  markerSelectedRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#38bdf8',
    opacity: 0.5,
  },
  infoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
  },
  infoBox: {
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  infoText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
});

