import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 현재 위치</Text>
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
        <Text style={styles.buttonText}>
          {isWatching ? '📍 추적 중지' : '📍 실시간 추적'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
  },
  trackButton: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  tracking: {
    backgroundColor: '#ef4444',
  },
  notTracking: {
    backgroundColor: '#10b981',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  locationInfo: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  noLocationText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

