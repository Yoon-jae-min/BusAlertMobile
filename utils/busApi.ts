import { BusStop, BusArrival } from '../types';
import { CityCode } from './storage';

const KAKAO_HOST = 'https://dapi.kakao.com';
const KAKAO_CATEGORY_STOP = 'SW8'; // 버스정류장 카테고리 코드
const DEFAULT_PAGE_SIZE = 15;

// 서울시 버스정보시스템 API
const SEOUL_BIS_HOST = 'http://ws.bus.go.kr/api/rest';

// 국가대중교통정보센터(TAGO) API (전국)
const TAGO_HOST = 'https://apis.data.go.kr/1613000';

// 지역별 BIS API 호스트 매핑 (서울, 경기만 폴백용으로 사용)
const REGIONAL_BIS_HOSTS: Record<string, string> = {
  seoul: SEOUL_BIS_HOST,
  gyeonggi: 'http://apis.data.go.kr/6410000', // 경기도
  // 나머지 지역은 TAGO API 사용
};

type KakaoPlace = {
  id: string;
  place_name: string;
  phone?: string;
  x: string; // longitude
  y: string; // latitude
  address_name?: string;
  road_address_name?: string;
  distance?: string; // 중심좌표까지의 거리 (미터)
};

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
      query: '버스정류소',
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
    const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
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
        console.warn('TAGO API 조회 실패, 지역별 API로 재시도 (서울/경기 지역인 경우):', tagoError);
        // TAGO 실패 시 서울/경기 API로 폴백
        if (region === 'seoul' || region === 'gyeonggi') {
          const regionalApiKey = getRegionalApiKey(region);
          if (regionalApiKey) {
            try {
              // 지역별 API로 재시도
              const stationInfo = await findStationIdByName(busStopName || '', region, regionalApiKey);
              if (stationInfo) {
                const regionalArrivals = await requestBusArrival(stationInfo.stationId, region, regionalApiKey);
                return regionalArrivals;
              }
            } catch (regionalError) {
              console.warn(`${region} 지역 API 조회도 실패:`, regionalError);
            }
          }
        }
      }
    }
    
    // 공공데이터포털 API 키가 없는 경우: 서울/경기 API만 폴백으로 사용
    const apiKey = getRegionalApiKey(region);
    if (!apiKey) {
      console.warn(`${region} 지역 버스 API 키가 없습니다. 공공데이터포털 API 키를 설정하세요.`);
      return getDummyArrivals();
    }

    // 정류장 ID가 숫자가 아니면 정류장 이름으로 검색하여 ID 찾기
    let stationId = busStopId;
    if (isNaN(Number(busStopId)) && busStopName) {
      const stationInfo = await findStationIdByName(
        busStopName,
        region,
        apiKey
      );
      if (!stationInfo) {
        console.warn('정류장 ID를 찾을 수 없습니다. 더미 데이터 사용');
        return getDummyArrivals();
      }
      stationId = stationInfo.stationId;
    }

    // 도착 정보 조회
    const arrivals = await requestBusArrival(stationId, region, apiKey);
    return arrivals;
  } catch (error) {
    console.warn('버스 도착 정보 조회 실패, 더미 데이터 사용:', error);
    return getDummyArrivals();
  }
}

/**
 * 지역 코드를 TAGO 도시 코드로 변환
 * TAGO API는 도시 코드를 사용 (예: 서울=11, 부산=26, 대구=27, 인천=28, 광주=29, 대전=30, 울산=31, 경기=41 등)
 */
function getTagoCityCode(region: string): string {
  const cityCodes: Record<string, string> = {
    seoul: '11',
    busan: '26',
    daegu: '27',
    incheon: '28',
    gwangju: '29',
    daejeon: '30',
    ulsan: '31',
    gyeonggi: '41',
    gangwon: '42',
    chungbuk: '43',
    chungnam: '44',
    jeonbuk: '45',
    jeonnam: '46',
    gyeongbuk: '47',
    gyeongnam: '48',
    jeju: '50',
  };
  
  return cityCodes[region] || '11'; // 기본값: 서울
}

/**
 * 위도/경도 기반으로 지역 감지
 */
export function detectRegion(latitude?: number, longitude?: number): string {
  if (!latitude || !longitude) {
    // 기본값: 서울
    return 'seoul';
  }

  // 간단한 지역 감지 로직 (실제로는 더 정확한 경계선 사용 필요)
  // 서울: 37.4 ~ 37.7, 126.8 ~ 127.2
  if (latitude >= 37.4 && latitude <= 37.7 && longitude >= 126.8 && longitude <= 127.2) {
    return 'seoul';
  }
  
  // 인천: 37.4 ~ 37.6, 126.5 ~ 126.8 (서울보다 먼저 체크)
  if (latitude >= 37.4 && latitude <= 37.6 && longitude >= 126.5 && longitude <= 126.8) {
    return 'incheon';
  }
  
  // 경기도: 서울 주변
  if (latitude >= 37.0 && latitude <= 38.0 && longitude >= 126.5 && longitude <= 127.5) {
    return 'gyeonggi';
  }
  
  // 부산: 35.0 ~ 35.3, 129.0 ~ 129.3
  if (latitude >= 35.0 && latitude <= 35.3 && longitude >= 129.0 && longitude <= 129.3) {
    return 'busan';
  }
  
  // 대구: 35.7 ~ 36.0, 128.4 ~ 128.7
  if (latitude >= 35.7 && latitude <= 36.0 && longitude >= 128.4 && longitude <= 128.7) {
    return 'daegu';
  }
  
  // 광주: 35.1 ~ 35.2, 126.8 ~ 126.9
  if (latitude >= 35.1 && latitude <= 35.2 && longitude >= 126.8 && longitude <= 126.9) {
    return 'gwangju';
  }
  
  // 대전: 36.3 ~ 36.4, 127.3 ~ 127.5
  if (latitude >= 36.3 && latitude <= 36.4 && longitude >= 127.3 && longitude <= 127.5) {
    return 'daejeon';
  }
  
  // 기본값: 서울
  return 'seoul';
}

/**
 * 지역 코드를 한글 지역명으로 변환
 */
export function getRegionName(region: string): string {
  const regionNames: Record<string, string> = {
    seoul: '서울특별시',
    gyeonggi: '경기도',
    busan: '부산광역시',
    incheon: '인천광역시',
    daegu: '대구광역시',
    gwangju: '광주광역시',
    daejeon: '대전광역시',
  };
  
  return regionNames[region] || '서울특별시';
}

/**
 * 지역별 API 키 가져오기 (폴백용 - 서울, 경기만 사용)
 * TAGO API가 주로 사용되며, 서울/경기 API는 TAGO 실패 시 백업용으로만 사용
 * 공공데이터포털 통합 인증키를 사용 (모든 공공데이터 API에 동일하게 적용)
 */
function getRegionalApiKey(region: string): string | null {
  // 공공데이터포털 통합 인증키 사용 (TAGO, 서울, 경기 모두 동일한 키)
  return process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY || null;
}

/**
 * 지역별 버스 도착 정보 지원 여부 확인
 */
export function isRegionSupported(latitude?: number, longitude?: number): boolean {
  // 공공데이터포털 통합 인증키가 있으면 전국 지원
  const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
  if (publicDataKey) {
    return true;
  }
  
  // 공공데이터포털 API 키가 없으면 지역별 API 확인
  const region = detectRegion(latitude, longitude);
  const apiKey = getRegionalApiKey(region);
  return apiKey !== null;
}

/**
 * 현재 지역이 지원되는지 확인하고, 지원되지 않는 경우 안내 메시지 반환
 */
export function getRegionSupportMessage(latitude?: number, longitude?: number): string | null {
  // 공공데이터포털 통합 인증키가 있으면 전국 지원
  const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
  if (publicDataKey) {
    // TAGO는 전국을 지원하지만, 일부 도시는 제공되지 않을 수 있음
    return null;
  }
  
  // 공공데이터포털 API 키가 없으면 지역별 API 확인
  const region = detectRegion(latitude, longitude);
  const apiKey = getRegionalApiKey(region);
  
  if (!apiKey) {
    const regionName = getRegionName(region);
    return `${regionName} 지역의 버스 도착 정보는 현재 지원되지 않습니다.\n\n공공데이터포털 API 키를 설정하시면 전국 대부분의 도시에서 서비스를 이용하실 수 있습니다.`;
  }
  
  return null;
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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * TAGO API로 GPS 좌표 기반 근처 정류소 조회 및 도시코드 추출
 * 엔드포인트: BusSttnInfoInqireService/getCrdntPrxmtSttnList
 * GPS 근처 500m 정류소들을 가져와서 가장 가까운 정류소의 도시코드를 반환
 */
export async function getCityCodeFromGps(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
    if (!publicDataKey) {
      console.warn('공공데이터포털 API 키가 없습니다. GPS 기반 도시코드 조회 불가');
      return null;
    }

    const url = new URL(`${TAGO_HOST}/BusSttnInfoInqireService/getCrdntPrxmtSttnList`);
    url.searchParams.append('serviceKey', publicDataKey);
    url.searchParams.append('gpsLati', latitude.toString());
    url.searchParams.append('gpsLong', longitude.toString());
    url.searchParams.append('numOfRows', '10'); // 여러 정류소 정보 가져오기
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TAGO GPS 기반 정류소 조회 API 오류 (${response.status})`);
    }

    const jsonData = await response.json();

    // 응답 구조: response.header.resultCode, response.body.items.item
    // 각 item에는 citycode, gpslati, gpslong 등이 포함됨
    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      if (items.length === 0) {
        console.warn('GPS 기반 정류소 조회 응답은 성공했지만 정류소를 찾을 수 없습니다.');
        return null;
      }

      // 각 정류소와의 거리를 계산하여 가장 가까운 정류소 찾기
      let closestItem = items[0];
      let closestDistance = calculateDistance(
        latitude,
        longitude,
        parseFloat(items[0].gpslati || '0'),
        parseFloat(items[0].gpslong || '0')
      );

      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const itemLat = parseFloat(item.gpslati || '0');
        const itemLon = parseFloat(item.gpslong || '0');
        
        const distance = calculateDistance(latitude, longitude, itemLat, itemLon);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = item;
        }
      }

      // 가장 가까운 정류소의 도시코드 추출 (citycode는 소문자)
      if (closestItem.citycode) {
        return String(closestItem.citycode); // 문자열로 변환
      }
    }

    // 응답에는 있지만 items가 비어있는 경우
    console.warn('GPS 기반 정류소 조회 응답은 성공했지만 도시코드를 찾을 수 없습니다.');

    return null;
  } catch (error) {
    console.error('GPS 기반 도시코드 조회 오류:', error);
    return null;
  }
}

/**
 * TAGO API로 정류장 ID 찾기 (전국 통합)
 */
/**
 * TAGO API로 정류소명으로 정류소 정보 조회 (전국 통합)
 * 정류소명과 도시코드로 정류소 정보(nodeId, nodeNo 등)를 가져옴
 */
export async function findStationInfoByNameTago(
  stationName: string,
  cityCode: string
): Promise<{ stationId: string; stationName: string; stationNo?: string } | null> {
  const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
  if (!publicDataKey) {
    console.warn('공공데이터포털 API 키가 없습니다. 정류소 정보 조회 불가');
    return null;
  }
  
  return findStationIdByNameTago(stationName, cityCode, publicDataKey);
}

async function findStationIdByNameTago(
  stationName: string,
  cityCode: string,
  apiKey: string
): Promise<{ stationId: string; stationName: string; stationNo?: string } | null> {
  try {
    // TAGO API 엔드포인트 (정류소 검색)
    // nodeNm (정류소명) 또는 nodeNo (정류소번호) 둘 다 옵션 파라미터
    // 정류소명으로 검색하면 응답에 nodeid, nodenm, nodeno 등이 포함됨
    const url = new URL(`${TAGO_HOST}/BusSttnInfoInqireService/getSttnNoList`);
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('cityCode', cityCode);
    url.searchParams.append('nodeNm', stationName);
    url.searchParams.append('numOfRows', '10');
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TAGO 정류장 검색 API 오류 (${response.status})`);
    }

    const jsonData = await response.json();
    
    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      // 첫 번째 결과 반환
      // 응답: nodeid, nodenm, nodeno(옵션), gpslati, gpslong 등
      if (items.length > 0) {
        return {
          stationId: items[0].nodeid,
          stationName: items[0].nodenm,
          stationNo: items[0].nodeno || undefined, // 정류소번호 (옵션)
        };
      }
    }

    return null;
  } catch (error) {
    console.error('TAGO 정류장 ID 검색 오류:', error);
    return null;
  }
}

/**
 * TAGO API로 버스 도착 정보 조회 (전국 통합)
 * 엔드포인트: ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList
 * 파라미터: cityCode, nodeId (필수)
 */
async function requestBusArrivalTago(
  stationId: string,
  cityCode: string,
  apiKey: string
): Promise<BusArrival[]> {
  try {
    const url = new URL(`${TAGO_HOST}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList`);
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('cityCode', cityCode);
    url.searchParams.append('nodeId', stationId);
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TAGO 도착 정보 API 오류 (${response.status})`);
    }

    const jsonData = await response.json();

    // 응답 구조 (문서 기준):
    // {
    //   "response": {
    //     "header": {
    //       "resultCode": "00",        // 결과코드 (필수)
    //       "resultMsg": "OK"          // 결과메시지 (필수)
    //     },
    //     "body": {
    //       "numOfRows": 10,           // 한 페이지 결과 수 (필수)
    //       "pageNo": 1,               // 페이지 번호 (필수)
    //       "totalCount": 3,           // 전체 결과 수 (필수)
    //       "items": {
    //         "item": [  // 배열: 한 정류장에 경유하는 여러 노선들의 도착 정보
    //           {
    //             "nodeid": "DJB8001793",              // 정류소ID (필수)
    //             "nodenm": "북대전농협",              // 정류소명 (필수)
    //             "routeid": "DJB30300002",            // 노선ID (필수)
    //             "routeno": "5",                      // 노선번호 (필수)
    //             "routetp": "마을버스",               // 노선유형 (필수)
    //             "arrprevstationcnt": "15",           // 도착예정버스 남은 정류장 수 (필수)
    //             "vehicletp": "저상버스",             // 도착예정버스 차량유형 (필수)
    //             "arrtime": "816"                     // 도착예정버스 도착예상시간[초] (필수)
    //           },
    //           // 같은 노선의 두 번째 버스가 있을 수 있음
    //           { "routeid": "DJB30300002", "routeno": "5", "arrtime": "1200", ... },
    //           // 다른 노선도 올 수 있음
    //           { "routeid": "DJB30300003", "routeno": "10", "arrtime": "300", ... }
    //         ]
    //       }
    //     }
    //   }
    // }
    // 
    // 참고: item이 하나만 있을 경우 배열이 아닌 단일 객체로 올 수 있음
    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      // item이 배열인지 단일 객체인지 확인하여 배열로 변환
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      // 같은 노선의 첫 번째, 두 번째 버스를 구분하여 반환
      // 응답 필드: nodeid, nodenm, routeid, routeno, routetp, arrprevstationcnt, vehicletp, arrtime(초)
      // 같은 노선이 여러 개 올 수 있으므로 routeid별로 그룹화하고 arrtime 기준으로 정렬
      const routeMap = new Map<string, Array<{
        arrtime: number;
        arrprevstationcnt?: number;
        vehicletp?: string;
      }>>();

      items.forEach((item: any) => {
        const routeId = item.routeid || '';
        const arrtime = item.arrtime ? parseInt(item.arrtime, 10) : -1; // 초 단위

        if (arrtime < 0) return; // 운행종료 등 제외

        if (!routeMap.has(routeId)) {
          routeMap.set(routeId, []);
        }
        
        routeMap.get(routeId)!.push({
          arrtime,
          arrprevstationcnt: item.arrprevstationcnt ? parseInt(item.arrprevstationcnt, 10) : undefined,
          vehicletp: item.vehicletp,
        });
      });

      // 각 노선별로 arrtime 기준으로 정렬하여 첫 번째, 두 번째 버스 선택
      const arrivals: BusArrival[] = [];
      routeMap.forEach((buses, routeId) => {
        // arrtime 기준으로 정렬 (가까운 순서대로)
        buses.sort((a, b) => a.arrtime - b.arrtime);
        
        const firstBus = buses[0];
        const secondBus = buses[1];
        
        // 첫 번째 노선 정보 찾기 (모든 버스는 같은 노선 정보를 가지고 있음)
        const firstItem = items.find((item: any) => item.routeid === routeId);
        if (!firstItem) return;

        arrivals.push({
          routeId: routeId,
          routeName: firstItem.routeno || '',
          routeType: firstItem.routetp || undefined,
          arrivalTime: firstBus.arrtime,
          arrivalTime2: secondBus ? secondBus.arrtime : undefined,
          locationNo1: firstBus.arrprevstationcnt,
          locationNo2: secondBus ? secondBus.arrprevstationcnt : undefined,
          vehicleType1: firstBus.vehicletp || undefined,
          vehicleType2: secondBus ? secondBus.vehicletp : undefined,
          lowPlate: firstBus.vehicletp === '저상버스' || firstBus.vehicletp === '1',
        });
      });

      // 노선 유형별로 먼저 그룹화한 후, 각 그룹 내에서 노선번호 순으로 정렬
      // 노선 유형 우선순위: 광역 > 간선 > 지선 > 순환 > 좌석 > 마을 > 기타
      const routeTypeOrder: Record<string, number> = {
        '광역버스': 1,
        '광역급행버스': 1,
        '간선버스': 2,
        '간선급행버스': 2,
        '지선버스': 3,
        '지선급행버스': 3,
        '순환버스': 4,
        '좌석버스': 5,
        '마을버스': 6,
        '공영버스': 6,
      };

      return arrivals.sort((a, b) => {
        // 노선 유형별 우선순위 비교
        const typeA = a.routeType || '';
        const typeB = b.routeType || '';
        const priorityA = routeTypeOrder[typeA] || 99; // 정의되지 않은 유형은 가장 뒤로
        const priorityB = routeTypeOrder[typeB] || 99;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // 같은 유형 내에서는 노선번호로 정렬
        // 숫자로 변환할 수 있으면 숫자로, 아니면 문자열로 비교
        const numA = parseInt(a.routeName, 10);
        const numB = parseInt(b.routeName, 10);
        
        // 둘 다 숫자로 변환 가능한 경우
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        // 숫자로 변환 불가능한 경우 문자열 비교
        return a.routeName.localeCompare(b.routeName, 'ko-KR', { numeric: true });
      });
    }

    return [];
  } catch (error) {
    console.error('TAGO 도착 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * TAGO API로 정류소 ID와 도시코드를 이용해 도착 정보 조회 (전국 통합)
 */
export async function getBusArrivalInfoTago(
  stationId: string,
  cityCode: string
): Promise<BusArrival[]> {
  const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
  if (!publicDataKey) {
    console.warn('공공데이터포털 API 키가 없습니다. 도착 정보 조회 불가');
    return [];
  }
  
  return requestBusArrivalTago(stationId, cityCode, publicDataKey);
}

/**
 * TAGO API로 도시코드 목록 조회
 * 엔드포인트: BusSttnInfoInqireService/getCtyCodeList
 */
export async function fetchCityCodeList(): Promise<CityCode[]> {
  try {
    const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
    if (!publicDataKey) {
      console.warn('공공데이터포털 API 키가 없습니다. 도시코드 목록 조회 불가');
      return [];
    }

    const url = new URL(`${TAGO_HOST}/BusSttnInfoInqireService/getCtyCodeList`);
    url.searchParams.append('serviceKey', publicDataKey);
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TAGO 도시코드 목록 API 오류 (${response.status})`);
    }

    const jsonData = await response.json();

    // 응답 구조: response.header.resultCode, response.body.items.item
    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      return items.map((item: any) => ({
        citycode: String(item.citycode || ''),
        cityname: item.cityname || '',
      }));
    }

    return [];
  } catch (error) {
    console.error('도시코드 목록 조회 오류:', error);
    return [];
  }
}

/**
 * 정류장 이름으로 정류장 ID 찾기
 */
async function findStationIdByName(
  stationName: string,
  region: string,
  apiKey: string
): Promise<{ stationId: string; stationName: string } | null> {
  try {
    const host = REGIONAL_BIS_HOSTS[region] || SEOUL_BIS_HOST;
    const url = new URL(`${host}/stationinfo/getStationByName`);
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('stSrch', stationName);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`정류장 검색 API 오류 (${response.status})`);
    }

    const xmlText = await response.text();
    const jsonData = parseXmlResponse(xmlText);

    if (
      jsonData?.ServiceResult?.msgHeader?.resultCode === '0' &&
      jsonData?.ServiceResult?.msgBody?.itemList
    ) {
      const items = Array.isArray(jsonData.ServiceResult.msgBody.itemList)
        ? jsonData.ServiceResult.msgBody.itemList
        : [jsonData.ServiceResult.msgBody.itemList];

      // 첫 번째 결과 반환
      if (items.length > 0) {
        return {
          stationId: items[0].arsId || items[0].stationId,
          stationName: items[0].stationNm,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('정류장 ID 검색 오류:', error);
    return null;
  }
}

/**
 * 정류장 ID로 도착 정보 조회
 */
async function requestBusArrival(
  stationId: string,
  region: string,
  apiKey: string
): Promise<BusArrival[]> {
  const host = REGIONAL_BIS_HOSTS[region] || SEOUL_BIS_HOST;
  const url = new URL(`${host}/arrive/getArrInfoByStop`);
  url.searchParams.append('serviceKey', apiKey);
  url.searchParams.append('stId', stationId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`도착 정보 API 오류 (${response.status})`);
  }

  const xmlText = await response.text();
  const jsonData = parseXmlResponse(xmlText);

  if (
    jsonData?.ServiceResult?.msgHeader?.resultCode === '0' &&
    jsonData?.ServiceResult?.msgBody?.itemList
  ) {
    const items = Array.isArray(jsonData.ServiceResult.msgBody.itemList)
      ? jsonData.ServiceResult.msgBody.itemList
      : [jsonData.ServiceResult.msgBody.itemList];

    return items
      .map((item: any) => {
        // arrmsg1, arrmsg2 파싱 (예: "3분후[1번째 전]", "곧 도착" 등)
        const parseArrivalTime = (arrmsg: string): number => {
          if (!arrmsg) return 0;
          
          // "곧 도착", "도착", "운행종료" 등의 특수 케이스
          if (arrmsg.includes('곧 도착') || arrmsg.includes('도착')) return 0;
          if (arrmsg.includes('운행종료')) return -1;
          
          // 숫자 추출 (분 단위)
          const minutesMatch = arrmsg.match(/(\d+)\s*분/);
          if (minutesMatch) {
            return parseInt(minutesMatch[1], 10) * 60; // 초로 변환
          }
          
          // 초 단위 추출
          const secondsMatch = arrmsg.match(/(\d+)\s*초/);
          if (secondsMatch) {
            return parseInt(secondsMatch[1], 10);
          }
          
          return 0;
        };

        const arrivalTime1 = parseArrivalTime(item.arrmsg1 || '');
        const arrivalTime2 = item.arrmsg2 ? parseArrivalTime(item.arrmsg2) : undefined;

        return {
          routeId: item.busRouteId || item.routeId || '',
          routeName: item.rtNm || item.routeName || '',
          routeType: item.routeType || undefined,
          arrivalTime: arrivalTime1,
          arrivalTime2: arrivalTime2 !== undefined && arrivalTime2 >= 0 ? arrivalTime2 : undefined,
          locationNo1: item.locationNo1 ? parseInt(item.locationNo1, 10) : undefined,
          locationNo2: item.locationNo2 ? parseInt(item.locationNo2, 10) : undefined,
          lowPlate: item.lowPlate1 === '1' || item.lowPlate2 === '1' || item.lowPlate === '1',
        };
      })
      .filter((arrival: BusArrival) => arrival.arrivalTime >= 0); // 운행종료 제외
  }

  return [];
}

/**
 * XML 응답을 JSON으로 파싱
 * 서울시 버스 API는 XML 형식으로 응답하므로 파싱 필요
 * 참고: 실제 프로덕션에서는 xml2js 같은 라이브러리 사용 권장
 */
function parseXmlResponse(xmlText: string): any {
  try {
    const result: any = {};
    
    // ServiceResult 추출
    const serviceResultMatch = xmlText.match(/<ServiceResult[^>]*>([\s\S]*?)<\/ServiceResult>/);
    if (!serviceResultMatch) {
      // JSON 형식인 경우
      try {
        return JSON.parse(xmlText);
      } catch {
        return null;
      }
    }

    const serviceResult = serviceResultMatch[1];
    
    // msgHeader 파싱
    const resultCodeMatch = serviceResult.match(/<resultCode>([^<]*)<\/resultCode>/);
    const resultMsgMatch = serviceResult.match(/<resultMsg>([^<]*)<\/resultMsg>/);
    
    if (!resultCodeMatch) return null;

    result.ServiceResult = {
      msgHeader: {
        resultCode: resultCodeMatch[1].trim(),
        resultMsg: resultMsgMatch ? resultMsgMatch[1].trim() : '',
      },
      msgBody: {},
    };

    // msgBody 파싱
    const msgBodyMatch = serviceResult.match(/<msgBody[^>]*>([\s\S]*?)<\/msgBody>/);
    if (msgBodyMatch) {
      const msgBody = msgBodyMatch[1];
      
      // itemList 추출
      const itemListMatches = msgBody.match(/<itemList[^>]*>([\s\S]*?)<\/itemList>/g);
      
      if (itemListMatches) {
        const items = itemListMatches.map((itemXml) => {
          const item: any = {};
          // 모든 태그 추출
          const tagPattern = /<([a-zA-Z0-9_]+)>([^<]*)<\/\1>/g;
          let match;
          while ((match = tagPattern.exec(itemXml)) !== null) {
            item[match[1]] = match[2].trim();
          }
          return item;
        });

        result.ServiceResult.msgBody.itemList =
          items.length === 1 ? items[0] : items;
      }
    }

    return result;
  } catch (error) {
    console.error('XML 파싱 오류:', error);
    return null;
  }
}

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

function mapKakaoPlaces(places: KakaoPlace[]): BusStop[] {
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
 * 더미 데이터 (개발/테스트용)
 */
function getDummyBusStops(query: string): BusStop[] {
  const allStops: BusStop[] = [
    {
      id: '1',
      name: '강남역',
      number: '12345',
      latitude: 37.498,
      longitude: 127.0276,
      address: '서울특별시 강남구 강남대로',
    },
    {
      id: '2',
      name: '역삼역',
      number: '12346',
      latitude: 37.5,
      longitude: 127.0364,
      address: '서울특별시 강남구 테헤란로',
    },
    {
      id: '3',
      name: '선릉역',
      number: '12347',
      latitude: 37.5045,
      longitude: 127.0489,
      address: '서울특별시 강남구 테헤란로',
    },
    {
      id: '4',
      name: '삼성역',
      number: '12348',
      latitude: 37.5088,
      longitude: 127.0632,
      address: '서울특별시 강남구 테헤란로',
    },
  ];

  if (!query.trim()) return allStops;

  return allStops.filter(
    (stop) =>
      stop.name.includes(query) ||
      stop.number?.includes(query) ||
      stop.address?.includes(query)
  );
}

function getDummyArrivals(): BusArrival[] {
  return [
    {
      routeId: '1',
      routeName: '146번',
      routeType: '간선',
      arrivalTime: 180,
      arrivalTime2: 600,
      locationNo1: 2,
      locationNo2: 5,
      lowPlate: false,
    },
    {
      routeId: '2',
      routeName: '241번',
      routeType: '지선',
      arrivalTime: 420,
      arrivalTime2: 900,
      locationNo1: 1,
      locationNo2: 3,
      lowPlate: true,
    },
    {
      routeId: '3',
      routeName: '463번',
      routeType: '광역',
      arrivalTime: 60,
      arrivalTime2: 480,
      locationNo1: 0,
      locationNo2: 4,
      lowPlate: false,
    },
  ];
}

