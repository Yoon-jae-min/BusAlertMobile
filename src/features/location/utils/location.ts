import * as Location from 'expo-location';
import { Location as LocationType } from '../../../types';

/**
 * 위치 권한 요청 및 현재 위치 가져오기
 */
export async function getCurrentLocation(): Promise<LocationType> {
  // 위치 권한 확인
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('위치 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.');
  }

  // 현재 위치 가져오기
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy || undefined,
  };
}

/**
 * 위치 추적 시작
 */
export async function startLocationTracking(
  callback: (location: LocationType) => void
): Promise<Location.LocationSubscription> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('위치 권한이 거부되었습니다.');
  }

  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5초마다 업데이트
      distanceInterval: 10, // 10미터 이동 시 업데이트
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      });
    }
  );
}

