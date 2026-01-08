import { Location, BusStop, WalkingRoute } from '../../../types';

const KAKAO_HOST = 'https://dapi.kakao.com';

/**
 * 현재 위치부터 버스 정류장까지의 도보 시간 계산
 * 카카오 길찾기 API를 사용하여 실제 도로 경로 기반 계산
 * API 호출 실패 시 하버사인 공식으로 폴백
 */
export async function calculateWalkingTime(
  from: Location,
  to: BusStop
): Promise<WalkingRoute> {
  try {
    // 카카오 길찾기 API 호출
    const result = await requestKakaoDirections(from, to);
    if (result) {
      return result;
    }
  } catch (error) {
    console.warn('카카오 길찾기 API 호출 실패, 직선 거리로 계산:', error);
  }

  // API 호출 실패 시 하버사인 공식으로 폴백
  return calculateWalkingTimeFallback(from, to);
}

/**
 * 카카오 자동차 길찾기 API를 사용한 경로 거리 조회
 * 주의: 카카오 길찾기 API는 자동차 전용이지만, 거리 정보를 가져와서 도보 속도로 시간 계산
 */
async function requestKakaoDirections(
  from: Location,
  to: BusStop
): Promise<WalkingRoute | null> {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;
  if (!apiKey) {
    console.warn('카카오 API 키가 없습니다. 직선 거리로 계산합니다.');
    return null;
  }

  // 카카오 API는 경도,위도 순서
  const origin = `${from.longitude},${from.latitude}`;
  const destination = `${to.longitude},${to.latitude}`;

  const url = new URL(`${KAKAO_HOST}/v1/directions`);
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  // mode 파라미터 제거: 카카오 길찾기 API는 자동차 전용이지만 거리 정보는 활용 가능

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`카카오 길찾기 API 오류 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // 응답 구조: routes[0].summary.distance (자동차 경로 거리)
    // 자동차 경로의 거리를 도보 속도로 계산
    if (data?.routes && data.routes.length > 0) {
      const summary = data.routes[0].summary;
      if (summary?.distance) {
        const distance = summary.distance; // 미터 (자동차 경로 거리)
        
        // 평균 도보 속도: 4km/h = 1.11m/s
        const walkingSpeed = 1.11; // m/s
        const duration = Math.ceil(distance / walkingSpeed); // 초
        
        return {
          distance: distance,
          duration: duration, // 도보 속도로 계산한 시간
        };
      }
    }

    return null;
  } catch (error) {
    console.error('카카오 길찾기 API 호출 오류:', error);
    return null;
  }
}

/**
 * 하버사인 공식을 사용한 직선 거리 기반 계산 (폴백)
 */
function calculateWalkingTimeFallback(
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
 * 빠른 거리 계산 (동기 함수)
 * 리스트 표시용으로 사용 - 하버사인 공식으로 직선 거리만 계산
 */
export function calculateDistanceQuick(
  from: Location,
  to: BusStop
): number {
  return calculateDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );
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

