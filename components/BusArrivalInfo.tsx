import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusStop, BusArrival } from '../types';
import { getBusArrivalInfo } from '../utils/busApi';
import { scheduleNotification, requestNotificationPermission, isExpoGoEnvironment } from '../utils/notifications';
import { calculateWalkingTime } from '../utils/walkingTime';
import { Location } from '../types';
import { addAlertHistory } from '../utils/storage';

interface BusArrivalInfoProps {
  busStop: BusStop;
  currentLocation: Location;
  walkingTime: number | null;
  inline?: boolean;
}

export default function BusArrivalInfo({
  busStop,
  currentLocation,
  walkingTime,
  inline = false,
}: BusArrivalInfoProps) {
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const fetchArrivalInfo = async () => {
    setIsLoading(true);
    try {
      const arrivals = await getBusArrivalInfo(
        busStop.id,
        busStop.name,
        busStop.latitude,
        busStop.longitude
      );
      setArrivals(arrivals);
    } catch (error) {
      console.error('도착 정보 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArrivalInfo();
    const interval = setInterval(fetchArrivalInfo, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [busStop]);

  const calculateDepartureTime = (arrivalTime: number): Date | null => {
    if (!walkingTime) return null;
    const now = new Date();
    const departureSeconds = arrivalTime - walkingTime - 60; // 1분 여유
    if (departureSeconds <= 0) return null;
    return new Date(now.getTime() + departureSeconds * 1000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}분`;
    }
    return `${seconds}초`;
  };

  const handleSetAlert = async (route: BusArrival) => {
    const isExpoGo = isExpoGoEnvironment();
    
    const departureTime = calculateDepartureTime(route.arrivalTime);
    if (!departureTime) {
      Alert.alert('알림 설정 불가', '출발 시간을 계산할 수 없습니다.');
      return;
    }

    const now = new Date();
    const delay = departureTime.getTime() - now.getTime();

    if (delay <= 0) {
      Alert.alert('알림 설정 불가', '이미 출발 시간이 지났습니다.');
      return;
    }

    // Expo Go에서는 알림 대신 Alert로 표시
    if (isExpoGo) {
      const minutes = Math.floor(delay / 1000 / 60);
      Alert.alert(
        '🚌 출발 알림',
        `${route.routeName} 버스를 타기 위해 ${departureTime.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })}에 출발하세요!\n\n(Expo Go에서는 푸시 알림을 사용할 수 없습니다. 개발 빌드에서 사용하세요.)`,
        [{ text: '확인' }]
      );
      setSelectedRoute(route.routeId);
      return;
    }

    // 개발 빌드에서는 실제 알림 사용
    try {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요.');
        return;
      }

      const notificationId = await scheduleNotification(
        '🚌 버스 출발 시간',
        `${route.routeName} 버스를 타기 위해 지금 출발하세요!`,
        Math.floor(delay / 1000)
      );

      if (notificationId) {
        setSelectedRoute(route.routeId);
        
        // 알림 히스토리에 저장
        await addAlertHistory({
          id: `${busStop.id}-${route.routeId}-${Date.now()}`,
          busStopName: busStop.name,
          routeName: route.routeName,
          alertTime: new Date().toISOString(),
          departureTime: departureTime.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          completed: false,
        });
        
        Alert.alert('알림 설정 완료', `출발 시간에 알림을 받으실 수 있습니다.`);
      } else {
        Alert.alert('알림 설정 실패', '알림을 설정할 수 없습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '알림 설정에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>도착 정보 조회 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, inline && styles.containerInline]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" size={20} color="#38bdf8" style={styles.titleIcon} />
          <Text style={styles.title}>도착 정보</Text>
        </View>
        <TouchableOpacity
          onPress={fetchArrivalInfo}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshButtonText}>새로고침</Text>
        </TouchableOpacity>
      </View>

      {arrivals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>도착 예정인 버스가 없습니다.</Text>
        </View>
      ) : (
        <View style={[styles.scrollView, inline && styles.scrollViewInline]}>
          {arrivals.map((arrival) => {
            const departureTime = calculateDepartureTime(arrival.arrivalTime);
            const isSelected = selectedRoute === arrival.routeId;

            return (
              <View
                key={arrival.routeId}
                style={[
                  styles.arrivalCard,
                  isSelected && styles.selectedCard,
                ]}
              >
                <View style={styles.routeHeader}>
                  <Text style={styles.routeName}>{arrival.routeName}</Text>
                  {arrival.routeType && (
                    <Text style={styles.routeType}>({arrival.routeType})</Text>
                  )}
                  {arrival.lowPlate && (
                    <View style={styles.lowPlateBadge}>
                      <Text style={styles.lowPlateText}>저상</Text>
                    </View>
                  )}
                </View>

                <View style={styles.arrivalInfo}>
                  <View style={styles.arrivalRow}>
                    <Text style={styles.arrivalLabel}>첫 번째 버스:</Text>
                    <Text style={styles.arrivalTime}>
                      {formatTime(arrival.arrivalTime)} 후 도착
                    </Text>
                  </View>
                  {arrival.arrivalTime2 && (
                    <View style={styles.arrivalRow}>
                      <Text style={styles.arrivalLabel}>두 번째 버스:</Text>
                      <Text style={styles.arrivalTime2}>
                        {formatTime(arrival.arrivalTime2)} 후 도착
                      </Text>
                    </View>
                  )}

                  {walkingTime && departureTime && (
                    <View style={styles.departureInfo}>
                      <Text style={styles.departureLabel}>출발 시간:</Text>
                      <Text style={styles.departureTime}>
                        {departureTime.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleSetAlert(arrival)}
                  style={[
                    styles.alertButton,
                    isSelected && styles.alertButtonActive,
                  ]}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'notifications-outline'}
                    size={18}
                    color="#fff"
                    style={styles.alertButtonIcon}
                  />
                  <Text style={styles.alertButtonText}>
                    {isSelected ? '알림 설정됨' : '출발 알림 설정'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 34,
    elevation: 8,
  },
  containerInline: {
    marginBottom: 0,
    marginHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollViewInline: {
    maxHeight: undefined,
    flexGrow: 1,
  },
  arrivalCard: {
    backgroundColor: '#020617',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(30,64,175,0.8)',
  },
  selectedCard: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(8,47,73,0.95)',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e5e7eb',
  },
  routeType: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  lowPlateBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  lowPlateText: {
    color: '#022c22',
    fontSize: 12,
    fontWeight: '500',
  },
  arrivalInfo: {
    marginBottom: 12,
  },
  arrivalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrivalLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  arrivalTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38bdf8',
  },
  arrivalTime2: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5f5',
  },
  departureInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departureLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  departureTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
  },
  alertButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonActive: {
    backgroundColor: '#0284c7',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

