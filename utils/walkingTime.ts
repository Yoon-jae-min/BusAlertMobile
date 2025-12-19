import { Location, BusStop, WalkingRoute } from '../types';

/**
 * 현재 위치부터 버스 정류장까지의 도보 시간 계산
 * 하버사인 공식을 사용한 직선 거리 기반 계산
 */
export function calculateWalkingTime(
  from: Location,
  to: BusStop
): WalkingRoute {
  // 하버사인 공식으로 직선 거리 계산 (미터)
  const distance = calculateDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );

  // 평균 도보 속도: 4km/h = 1.11m/s
  const walkingSpeed = 1.11; // m/s
  const duration = Math.ceil(distance / walkingSpeed); // 초

  return {
    distance,
    duration,
  };
}

/**
 * 하버사인 공식으로 두 지점 간의 거리 계산 (미터)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

