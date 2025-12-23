import { BusStop, BusArrival } from '../types';

const KAKAO_HOST = 'https://dapi.kakao.com';
const KAKAO_CATEGORY_STOP = 'SW8'; // 버스정류장 카테고리 코드
const DEFAULT_PAGE_SIZE = 15;

// 서울시 버스정보시스템 API
const SEOUL_BIS_HOST = 'http://ws.bus.go.kr/api/rest';

// 국가대중교통정보센터(TAGO) API (전국)
const TAGO_HOST = 'https://apis.data.go.kr/1613000';

// 지역별 BIS API 호스트 매핑
const REGIONAL_BIS_HOSTS: Record<string, string> = {
  seoul: SEOUL_BIS_HOST,
  gyeonggi: 'http://apis.data.go.kr/6410000', // 경기도 (예시)
  busan: 'http://apis.data.go.kr/6260000', // 부산 (예시)
  incheon: 'http://apis.data.go.kr/6280000', // 인천 (예시)
  daegu: 'http://apis.data.go.kr/6270000', // 대구 (예시)
  gwangju: 'http://apis.data.go.kr/6290000', // 광주 (예시)
  daejeon: 'http://apis.data.go.kr/6300000', // 대전 (예시)
  ulsan: 'http://apis.data.go.kr/6310000', // 울산 (예시)
};

type KakaoPlace = {
  id: string;
  place_name: string;
  phone?: string;
  x: string; // longitude
  y: string; // latitude
  address_name?: string;
  road_address_name?: string;
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
 * 현재 위치 기준 반경 내 정류장 검색
 */
export async function searchNearbyBusStops(
  latitude: number,
  longitude: number,
  radiusMeters = 1000
): Promise<BusStop[]> {
  try {
    const data = await requestKakao('/v2/local/search/category.json', {
      category_group_code: KAKAO_CATEGORY_STOP,
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
    
    // 해당 지역의 API 키 확인
    const apiKey = getRegionalApiKey(region);
    if (!apiKey) {
      console.warn(`${region} 지역 버스 API 키가 없습니다. 더미 데이터 사용`);
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
 * 위도/경도 기반으로 지역 감지
 */
function detectRegion(latitude?: number, longitude?: number): string {
  if (!latitude || !longitude) {
    // 기본값: 서울
    return 'seoul';
  }

  // 간단한 지역 감지 로직 (실제로는 더 정확한 경계선 사용 필요)
  // 서울: 37.4 ~ 37.7, 126.8 ~ 127.2
  if (latitude >= 37.4 && latitude <= 37.7 && longitude >= 126.8 && longitude <= 127.2) {
    return 'seoul';
  }
  
  // 경기도: 서울 주변
  if (latitude >= 37.0 && latitude <= 38.0 && longitude >= 126.5 && longitude <= 127.5) {
    return 'gyeonggi';
  }
  
  // 부산: 35.0 ~ 35.3, 129.0 ~ 129.3
  if (latitude >= 35.0 && latitude <= 35.3 && longitude >= 129.0 && longitude <= 129.3) {
    return 'busan';
  }
  
  // 인천: 37.4 ~ 37.6, 126.5 ~ 126.8
  if (latitude >= 37.4 && latitude <= 37.6 && longitude >= 126.5 && longitude <= 126.8) {
    return 'incheon';
  }
  
  // 대구: 35.7 ~ 36.0, 128.4 ~ 128.7
  if (latitude >= 35.7 && latitude <= 36.0 && longitude >= 128.4 && longitude <= 128.7) {
    return 'daegu';
  }
  
  // 기본값: 서울
  return 'seoul';
}

/**
 * 지역별 API 키 가져오기
 */
function getRegionalApiKey(region: string): string | null {
  // 환경변수에서 지역별 API 키 확인
  const apiKeys: Record<string, string | undefined> = {
    seoul: process.env.EXPO_PUBLIC_SEOUL_BUS_API_KEY,
    gyeonggi: process.env.EXPO_PUBLIC_GYEONGGI_BUS_API_KEY,
    busan: process.env.EXPO_PUBLIC_BUSAN_BUS_API_KEY,
    incheon: process.env.EXPO_PUBLIC_INCHEON_BUS_API_KEY,
    daegu: process.env.EXPO_PUBLIC_DAEGU_BUS_API_KEY,
    gwangju: process.env.EXPO_PUBLIC_GWANGJU_BUS_API_KEY,
    daejeon: process.env.EXPO_PUBLIC_DAEJEON_BUS_API_KEY,
    ulsan: process.env.EXPO_PUBLIC_ULSAN_BUS_API_KEY,
  };

  // 전국 통합 API 키 (TAGO)가 있으면 우선 사용
  const tagoKey = process.env.EXPO_PUBLIC_TAGO_API_KEY;
  if (tagoKey) {
    return tagoKey;
  }

  return apiKeys[region] || null;
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
    name: p.place_name,
    number: p.phone || undefined, // 카카오 결과에 정류장 번호가 없을 수 있음
    latitude: parseFloat(p.y),
    longitude: parseFloat(p.x),
    address: p.road_address_name || p.address_name || undefined,
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

