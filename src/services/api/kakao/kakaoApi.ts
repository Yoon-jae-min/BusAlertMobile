/**
 * 카카오 로컬 API 관련 함수
 */
import { BusStop } from '../../../types';
import { KAKAO_HOST, KAKAO_CATEGORY_STOP, DEFAULT_PAGE_SIZE } from '../common/constants';
import { KakaoPlace } from '../common/types';
import { getDummyBusStops } from '../common/dummyData';

/**
 * 카카오 API 요청
 */
async function requestKakao(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<{ documents: KakaoPlace[] }> {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;
  if (!apiKey) {
    throw new Error('Kakao REST API 키가 없습니다. .env에 EXPO_PUBLIC_KAKAO_REST_KEY를 설정하세요.');
  }

  const url = new URL(path, KAKAO_HOST);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao API 오류 (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * 카카오 Place를 BusStop으로 변환
 */
function mapKakaoPlaces(places: KakaoPlace[]): BusStop[] {
  console.log('mapKakaoPlaces', places);
  return places.map((p) => ({
    id: p.id,
    name: p.place_name, // 정류소명
    // number: 카카오 API로는 정확한 정류장 번호(ARS 번호)를 얻을 수 없음
    // 정확한 정류장 번호는 TAGO API를 사용해야 함
    latitude: parseFloat(p.y),
    longitude: parseFloat(p.x),
    address: p.road_address_name || p.address_name || undefined,
    distance: p.distance ? parseInt(p.distance, 10) : undefined, // API에서 제공하는 거리 (미터)
  }));
}

/**
 * 키워드로 정류장 검색 (카카오 로컬 API)
 * API 키가 없거나 오류가 나면 더미 데이터로 대체
 */
export async function searchBusStops(query: string): Promise<BusStop[]> {
  if (!query.trim()) return [];

  try {
    const data = await requestKakao('/v2/local/search/keyword.json', {
      query,
      category_group_code: KAKAO_CATEGORY_STOP,
      size: DEFAULT_PAGE_SIZE,
    });
    return mapKakaoPlaces(data.documents);
  } catch (error) {
    console.warn('정류장 검색 실패, 더미 데이터 사용:', error);
    return getDummyBusStops(query);
  }
}

/**
 * 현재 위치 기준 반경 내 정류장 검색 (키워드 검색 방식)
 */
export async function searchNearbyBusStops(
  latitude: number,
  longitude: number,
  radiusMeters = 1000
): Promise<BusStop[]> {
  try {
    const data = await requestKakao('/v2/local/search/keyword.json', {
      query: '버스정류장',
      x: longitude,
      y: latitude,
      radius: radiusMeters,
      size: DEFAULT_PAGE_SIZE,
      sort: 'distance',
    });
    return mapKakaoPlaces(data.documents);
  } catch (error) {
    console.warn('근처 정류장 검색 실패, 더미 데이터 사용:', error);
    return getDummyBusStops('');
  }
}

