/**
 * 버스 API 통합 모듈
 * 여러 API를 통합하여 사용하는 메인 함수들
 */
import { BusArrival, BusStop } from '../../types';
import { searchBusStops } from './kakao/kakaoApi';
import { searchNearbyBusStopsTago } from './tago/tagoApi';
import { getDummyBusStops } from './common/dummyData';
import { 
  getBusArrivalInfoTago, 
  findStationInfoByNameTago,
  requestBusArrivalTago,
  findStationIdByNameTago 
} from './tago/tagoApi';
import { findStationIdByName, requestBusArrival } from './bis/bisApi';
import { 
  detectRegion, 
  getTagoCityCode, 
  getRegionalApiKey,
  isRegionSupported,
  getRegionSupportMessage,
  getRegionName
} from './common/regionUtils';
import { getDummyArrivals } from './common/dummyData';

// 기존 함수들 재export (하위 호환성)
export { searchBusStops };

/**
 * 현재 위치 기준 반경 내 정류장 검색 (TAGO API 사용, 500m 고정)
 */
export async function searchNearbyBusStops(
  latitude: number,
  longitude: number,
  radiusMeters?: number // 파라미터는 하위 호환성을 위해 유지하지만 사용하지 않음
): Promise<BusStop[]> {
  try {
    const stops = await searchNearbyBusStopsTago(latitude, longitude);
    if (stops.length > 0) {
      return stops;
    }
    // 결과가 없으면 더미 데이터 반환
    console.warn('근처 정류장 검색 결과 없음, 더미 데이터 사용');
    return getDummyBusStops('');
  } catch (error) {
    console.warn('근처 정류장 검색 실패, 더미 데이터 사용:', error);
    return getDummyBusStops('');
  }
}
export { detectRegion, getRegionName, isRegionSupported, getRegionSupportMessage };
export { getBusArrivalInfoTago, findStationInfoByNameTago };
export { getCityCodeFromGps, fetchCityCodeList } from './tago/tagoApi';

/**
 * 버스 도착 정보 조회
 * 위치 기반으로 지역을 자동 감지하여 해당 지역 API 사용
 * busStopId는 정류장 ID 또는 정류장 이름
 */
export async function getBusArrivalInfo(
  busStopId: string,
  busStopName?: string,
  latitude?: number,
  longitude?: number
): Promise<BusArrival[]> {
  try {
    // 지역 감지
    const region = detectRegion(latitude, longitude);
    
    // 공공데이터포털 통합 인증키 확인
    const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY || 
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PUBLIC_DATA_API_KEY);
    
    // 서울/경기 지역은 BIS API를 우선 사용
    if ((region === 'seoul' || region === 'gyeonggi') && publicDataKey) {
      const regionalApiKey = getRegionalApiKey(region);
      if (regionalApiKey) {
        try {
          // 정류장 ID가 숫자가 아니면 정류장 이름으로 검색하여 ID 찾기
          let stationId = busStopId;
          if (isNaN(Number(busStopId)) && busStopName) {
            const stationInfo = await findStationIdByName(busStopName, region, regionalApiKey);
            if (!stationInfo) {
              console.warn('BIS API로 정류장 ID를 찾을 수 없습니다. TAGO API로 재시도');
            } else {
              stationId = stationInfo.stationId;
              // BIS API로 도착 정보 조회
              const arrivals = await requestBusArrival(stationId, region, regionalApiKey);
              if (arrivals && arrivals.length > 0) {
                return arrivals;
              }
            }
          } else {
            // 정류장 ID가 있는 경우 바로 BIS API 조회
            const arrivals = await requestBusArrival(stationId, region, regionalApiKey);
            if (arrivals && arrivals.length > 0) {
              return arrivals;
            }
          }
        } catch (bisError) {
          console.warn('BIS API 조회 실패, TAGO API로 재시도:', bisError);
        }
      }
    }
    
    // BIS API 실패 또는 다른 지역인 경우 TAGO API 사용
    if (publicDataKey) {
      // TAGO API 사용 (전국 지원)
      const cityCode = getTagoCityCode(region);
      let stationId = busStopId;
      
      // 정류장 ID가 숫자가 아니면 정류장 이름으로 검색하여 ID 찾기
      if (isNaN(Number(busStopId)) && busStopName) {
        const stationInfo = await findStationIdByNameTago(
          busStopName,
          cityCode,
          publicDataKey
        );
        if (!stationInfo) {
          console.warn('TAGO API로 정류장 ID를 찾을 수 없습니다. 더미 데이터 사용');
          return getDummyArrivals();
        }
        stationId = stationInfo.stationId;
      }
      
      // TAGO API로 도착 정보 조회
      try {
        const arrivals = await requestBusArrivalTago(stationId, cityCode, publicDataKey);
        return arrivals;
      } catch (tagoError) {
        console.warn('TAGO API 조회 실패:', tagoError);
        return getDummyArrivals();
      }
    }
    
    // API 키가 없는 경우
    console.warn('버스 API 키가 없습니다. 공공데이터포털 API 키를 설정하세요.');
    return getDummyArrivals();
  } catch (error) {
    console.warn('버스 도착 정보 조회 실패, 더미 데이터 사용:', error);
    return getDummyArrivals();
  }
}

