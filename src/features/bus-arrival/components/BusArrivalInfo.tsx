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
import { BusStop, BusArrival, Location } from '../../../types';
import { 
  detectRegion, 
  getRegionName, 
  getRegionSupportMessage,
  findStationInfoByNameTago,
  getBusArrivalInfoTago
} from '../../../services/api';
import { scheduleNotification, requestNotificationPermission, isExpoGoEnvironment } from '../../../services/notifications/notifications';
import { calculateWalkingTime } from '../../walking/utils/walkingTime';
import { addAlertHistory } from '../../../services/storage/storage';

interface BusArrivalInfoProps {
  busStop: BusStop;
  currentLocation: Location;
  cityCode?: string | null;
  inline?: boolean;
}

export default function BusArrivalInfo({
  busStop,
  currentLocation,
  cityCode,
  inline = false,
}: BusArrivalInfoProps) {
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [selectedBusIndex, setSelectedBusIndex] = useState<number | null>(null); // 선택된 버스 인덱스 (첫 번째=0, 두 번째=1)
  const [walkingTime, setWalkingTime] = useState<number | null>(null); // 노선 선택 시 조회하는 도보 시간
  const [isLoadingWalkingTime, setIsLoadingWalkingTime] = useState(false);

  const fetchArrivalInfo = async () => {
    if (!cityCode) {
      console.warn('도시 코드가 없어 도착 정보를 조회할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    try {
      // 정류소 정보 조회 (nodeId 얻기)
      const stationInfo = await findStationInfoByNameTago(busStop.name, cityCode);
      if (!stationInfo) {
        console.warn('정류소 정보를 찾을 수 없습니다.');
        setArrivals([]);
        return;
      }

      // 정류소 정보를 얻었으니 바로 도착 정보 조회
      const arrivalData = await getBusArrivalInfoTago(stationInfo.stationId, cityCode);
      setArrivals(arrivalData);
    } catch (error) {
      console.error('도착 정보 조회 오류:', error);
      setArrivals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 지역 지원 여부 확인
    const message = getRegionSupportMessage(busStop.latitude, busStop.longitude);
    setSupportMessage(message);
    
    // 정류장이 변경되면 도보 시간 및 선택 상태 초기화
    setWalkingTime(null);
    setSelectedRoute(null);
    setSelectedBusIndex(null);
    
    if (!message && cityCode) {
      fetchArrivalInfo();
      const interval = setInterval(fetchArrivalInfo, 30000); // 30초마다 갱신
      return () => clearInterval(interval);
    }
  }, [busStop, cityCode]);

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
        {!supportMessage && (
          <TouchableOpacity
            onPress={fetchArrivalInfo}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>새로고침</Text>
          </TouchableOpacity>
        )}
      </View>

      {supportMessage ? (
        <View style={styles.notSupportedContainer}>
          <Ionicons name="warning-outline" size={32} color="#f59e0b" style={styles.warningIcon} />
          <Text style={styles.notSupportedTitle}>지원되지 않는 지역</Text>
          <Text style={styles.notSupportedText}>{supportMessage}</Text>
        </View>
      ) : arrivals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>도착 예정인 버스가 없습니다.</Text>
        </View>
      ) : (
        <View style={[styles.scrollView, inline && styles.scrollViewInline]}>
          {arrivals.map((arrival) => {
            const isRouteSelected = selectedRoute === arrival.routeId;
            const handleRoutePress = async () => {
              if (isRouteSelected && selectedBusIndex !== null) {
                // 이미 선택된 노선을 다시 클릭하면 해제
                setSelectedRoute(null);
                setSelectedBusIndex(null);
                setWalkingTime(null);
              } else {
                // 노선 선택 (기본적으로 첫 번째 버스 선택)
                setSelectedRoute(arrival.routeId);
                setSelectedBusIndex(0);
                
                // 노선 선택 시 도보 시간 조회
                if (!walkingTime) {
                  setIsLoadingWalkingTime(true);
                  try {
                    const route = await calculateWalkingTime(currentLocation, busStop);
                    if (route) {
                      setWalkingTime(route.duration);
                    }
                  } catch (error) {
                    console.error('도보 시간 조회 오류:', error);
                  } finally {
                    setIsLoadingWalkingTime(false);
                  }
                }
              }
            };

            return (
              <TouchableOpacity
                key={arrival.routeId}
                onPress={handleRoutePress}
                activeOpacity={0.7}
                style={[
                  styles.arrivalCard,
                  isRouteSelected && styles.selectedCard,
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
                  <TouchableOpacity
                    style={styles.arrivalRow}
                    onPress={async (e) => {
                      e.stopPropagation();
                      setSelectedRoute(arrival.routeId);
                      setSelectedBusIndex(0);
                      
                      // 첫 번째 버스 선택 시 도보 시간 조회 (아직 조회하지 않은 경우)
                      if (!walkingTime) {
                        setIsLoadingWalkingTime(true);
                        try {
                          const route = await calculateWalkingTime(currentLocation, busStop);
                          if (route) {
                            setWalkingTime(route.duration);
                          }
                        } catch (error) {
                          console.error('도보 시간 조회 오류:', error);
                        } finally {
                          setIsLoadingWalkingTime(false);
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.arrivalLabel}>첫 번째 버스:</Text>
                    <View style={styles.arrivalDetails}>
                      {arrival.locationNo1 !== undefined && (
                        <Text style={styles.arrivalDetailText}>
                          남은 정류장: {arrival.locationNo1}개
                        </Text>
                      )}
                      {arrival.vehicleType1 && (
                        <Text style={styles.arrivalDetailText}>
                          차량유형: {arrival.vehicleType1}
                        </Text>
                      )}
                      <Text style={styles.arrivalTime}>
                        도착예상시간: {formatTime(arrival.arrivalTime)}
                      </Text>
                      {isRouteSelected && selectedBusIndex === 0 && (() => {
                        if (isLoadingWalkingTime) {
                          return (
                            <Text style={styles.loadingMessage}>
                              도보 시간 계산 중...
                            </Text>
                          );
                        }
                        if (!walkingTime) {
                          return null;
                        }
                        const departureTimeSeconds = arrival.arrivalTime - walkingTime;
                        if (departureTimeSeconds <= 0) {
                          return (
                            <Text style={styles.lateMessage}>
                              ⚠️ 이미 늦었습니다.{'\n'}다음 버스를 이용하세요.
                            </Text>
                          );
                        }
                        return (
                          <View>
                            <Text style={styles.departureTimeInfo}>
                              출발 시간: {formatTime(departureTimeSeconds)} 후
                              {' (도착 '}
                              {formatTime(arrival.arrivalTime)}
                              {' - 도보 '}
                              {formatTime(walkingTime)}
                              {')'}
                            </Text>
                            <Text style={styles.departureTimeNote}>
                              * 자동차 경로 거리 기준으로 계산된 대략적인 시간입니다
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </TouchableOpacity>
                  {arrival.arrivalTime2 && (
                      <TouchableOpacity
                      style={styles.arrivalRow}
                      onPress={async (e) => {
                        e.stopPropagation();
                        setSelectedRoute(arrival.routeId);
                        setSelectedBusIndex(1);
                        
                        // 두 번째 버스 선택 시 도보 시간 조회 (아직 조회하지 않은 경우)
                        if (!walkingTime) {
                          setIsLoadingWalkingTime(true);
                          try {
                            const route = await calculateWalkingTime(currentLocation, busStop);
                            if (route) {
                              setWalkingTime(route.duration);
                            }
                          } catch (error) {
                            console.error('도보 시간 조회 오류:', error);
                          } finally {
                            setIsLoadingWalkingTime(false);
                          }
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.arrivalLabel}>두 번째 버스:</Text>
                      <View style={styles.arrivalDetails}>
                        {arrival.locationNo2 !== undefined && (
                          <Text style={styles.arrivalDetailText}>
                            남은 정류장: {arrival.locationNo2}개
                          </Text>
                        )}
                        {arrival.vehicleType2 && (
                          <Text style={styles.arrivalDetailText}>
                            차량유형: {arrival.vehicleType2}
                          </Text>
                        )}
                        <Text style={styles.arrivalTime2}>
                          도착예상시간: {formatTime(arrival.arrivalTime2)}
                        </Text>
                        {isRouteSelected && selectedBusIndex === 1 && (() => {
                          if (isLoadingWalkingTime) {
                            return (
                              <Text style={styles.loadingMessage}>
                                도보 시간 계산 중...
                              </Text>
                            );
                          }
                          if (!walkingTime) {
                            return null;
                          }
                          const departureTimeSeconds = arrival.arrivalTime2 - walkingTime;
                          if (departureTimeSeconds <= 0) {
                            return (
                              <Text style={styles.lateMessage}>
                                ⚠️ 이미 늦었습니다.{'\n'}다음 버스를 이용하세요.
                              </Text>
                            );
                          }
                          return (
                            <View>
                              <Text style={styles.departureTimeInfo}>
                                출발 시간: {formatTime(departureTimeSeconds)} 후
                                {' (도착 '}
                                {formatTime(arrival.arrivalTime2)}
                                {' - 도보 '}
                                {formatTime(walkingTime)}
                                {')'}
                              </Text>
                              <Text style={styles.departureTimeNote}>
                                * 자동차 경로 거리 기준으로 계산된 대략적인 시간입니다
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                  <TouchableOpacity
                    onPress={() => handleSetAlert(arrival)}
                    style={[
                      styles.alertButton,
                      isRouteSelected && styles.alertButtonActive,
                    ]}
                >
                  <Ionicons
                    name={isRouteSelected ? 'checkmark-circle' : 'notifications-outline'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.alertButtonText}>
                    {isRouteSelected ? '알림 설정됨' : '출발 알림 설정'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      
      {/* 데이터 출처 표기 */}
      {!supportMessage && (
        <View style={styles.attribution}>
          <Text style={styles.attributionText}>
            {process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY 
              ? '데이터 제공: 국토교통부(TAGO)'
              : `데이터 제공: ${getRegionName(detectRegion(busStop.latitude, busStop.longitude))}`
            }
          </Text>
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
    marginBottom: 12,
  },
  arrivalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
  },
  arrivalDetails: {
    flexDirection: 'column',
  },
  arrivalDetailText: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 4,
  },
  arrivalTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 4,
  },
  arrivalTime2: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5f5',
    marginTop: 4,
  },
  departureTimeInfo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
  },
  departureTimeNote: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  loadingMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 8,
    padding: 8,
    fontStyle: 'italic',
  },
  lateMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
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
  attribution: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  notSupportedContainer: {
    alignItems: 'center',
    padding: 24,
  },
  warningIcon: {
    marginBottom: 12,
  },
  notSupportedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  notSupportedText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});

