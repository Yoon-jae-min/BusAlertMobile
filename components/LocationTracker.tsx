import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Location as LocationType } from '../types';
import { getCurrentLocation, startLocationTracking } from '../utils/location';

interface LocationTrackerProps {
  onLocationUpdate: (location: LocationType | null) => void;
  currentLocation: LocationType | null;
}

export default function LocationTracker({
  onLocationUpdate,
  currentLocation,
}: LocationTrackerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const handleGetLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      onLocationUpdate(location);
    } catch (err: any) {
      setError(err.message || '위치를 가져올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWatching = async () => {
    try {
      const sub = await startLocationTracking((location) => {
        onLocationUpdate(location);
      });
      setSubscription(sub);
      setIsWatching(true);
    } catch (err: any) {
      setError(err.message || '위치 추적을 시작할 수 없습니다.');
    }
  };

  const handleStopWatching = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
      setIsWatching(false);
    }
  };

  useEffect(() => {
    handleGetLocation();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location" size={20} color="#38bdf8" style={styles.titleIcon} />
          <Text style={styles.title}>현재 위치</Text>
        </View>
        <TouchableOpacity
          onPress={handleGetLocation}
          disabled={isLoading}
          style={[styles.button, styles.refreshButton, isLoading && styles.disabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>새로고침</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {currentLocation ? (
        <View style={styles.locationInfo}>
          <Text style={styles.infoText}>
            위도: {currentLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            경도: {currentLocation.longitude.toFixed(6)}
          </Text>
          {currentLocation.accuracy && (
            <Text style={styles.infoText}>
              정확도: {Math.round(currentLocation.accuracy)}m
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noLocationText}>위치 정보 없음</Text>
      )}

      <TouchableOpacity
        onPress={isWatching ? handleStopWatching : handleStartWatching}
        style={[
          styles.button,
          styles.trackButton,
          isWatching ? styles.tracking : styles.notTracking,
        ]}
      >
        <Ionicons
          name={isWatching ? 'stop-circle' : 'play-circle'}
          size={18}
          color="#fff"
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>
          {isWatching ? '추적 중지' : '실시간 추적'}
        </Text>
      </TouchableOpacity>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  buttonIcon: {
    marginRight: 6,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButton: {
    backgroundColor: '#0ea5e9',
  },
  trackButton: {
    marginTop: 14,
    width: '100%',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  tracking: {
    backgroundColor: '#f97316',
  },
  notTracking: {
    backgroundColor: '#22c55e',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#0b1120',
    fontWeight: '700',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(248,113,113,0.14)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 14,
  },
  locationInfo: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#cbd5f5',
    marginBottom: 4,
  },
  noLocationText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

