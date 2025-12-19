import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LocationTracker from './components/LocationTracker';
import BusStopSearch from './components/BusStopSearch';
import BusArrivalInfo from './components/BusArrivalInfo';
import { Location, BusStop } from './types';
import { calculateWalkingTime } from './utils/walkingTime';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [walkingTime, setWalkingTime] = useState<number | null>(null);

  // 도보 시간 계산
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🚌 버스 도착 알림</Text>
          <Text style={styles.headerSubtitle}>
            현재 위치부터 정류장까지의 시간을 계산하여 출발 시간을 알려드립니다
          </Text>
        </View>

        <LocationTracker
          onLocationUpdate={setCurrentLocation}
          currentLocation={currentLocation}
        />

        <BusStopSearch
          onStopSelect={setSelectedStop}
          selectedStop={selectedStop}
        />

        {selectedStop && currentLocation && walkingTime && (
          <View style={styles.walkingInfo}>
            <Text style={styles.walkingTitle}>🚶 도보 정보</Text>
            <Text style={styles.walkingTime}>
              소요 시간: {formatTime(walkingTime)}
            </Text>
          </View>
        )}

        {selectedStop && currentLocation && (
          <BusArrivalInfo
            busStop={selectedStop}
            currentLocation={currentLocation}
            walkingTime={walkingTime}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  walkingInfo: {
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
  walkingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  walkingTime: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
