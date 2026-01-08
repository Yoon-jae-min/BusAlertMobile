/**
 * TAGO API (국가대중교통정보센터) 관련 함수
 * 전국 버스 정보 조회
 */
import { BusArrival, BusStop } from '../../../types';
import { CityCode } from '../../storage/storage';
import { TAGO_HOST } from '../common/constants';
import { calculateDistance } from '../common/utils';
import { getTagoCityCode } from '../common/regionUtils';

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

      // 가장 가까운 정류소의 도시코드 추출
      if (closestItem.citycode) {
        return String(closestItem.citycode);
      }
    }

    console.warn('GPS 기반 정류소 조회 응답은 성공했지만 도시코드를 찾을 수 없습니다.');
    return null;
  } catch (error) {
    console.error('GPS 기반 도시코드 조회 오류:', error);
    return null;
  }
}

/**
 * TAGO API로 정류소명으로 정류소 정보 조회 (전국 통합)
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

      if (items.length > 0) {
        return {
          stationId: items[0].nodeid,
          stationName: items[0].nodenm,
          stationNo: items[0].nodeno || undefined,
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

    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      // routeid별로 그룹화하고 arrtime 기준으로 정렬
      const routeMap = new Map<string, Array<{
        arrtime: number;
        arrprevstationcnt?: number;
        vehicletp?: string;
      }>>();

      items.forEach((item: any) => {
        const routeId = item.routeid || '';
        const arrtime = item.arrtime ? parseInt(item.arrtime, 10) : -1;

        if (arrtime < 0) return;

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
        buses.sort((a, b) => a.arrtime - b.arrtime);
        
        const firstBus = buses[0];
        const secondBus = buses[1];
        
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
        const typeA = a.routeType || '';
        const typeB = b.routeType || '';
        const priorityA = routeTypeOrder[typeA] || 99;
        const priorityB = routeTypeOrder[typeB] || 99;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        const numA = parseInt(a.routeName, 10);
        const numB = parseInt(b.routeName, 10);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
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
 * TAGO API로 GPS 좌표 기반 근처 정류소 목록 조회 (500m 반경 고정)
 * 엔드포인트: BusSttnInfoInqireService/getCrdntPrxmtSttnList
 */
export async function searchNearbyBusStopsTago(
  latitude: number,
  longitude: number
): Promise<BusStop[]> {
  try {
    const publicDataKey = process.env.EXPO_PUBLIC_PUBLIC_DATA_API_KEY;
    if (!publicDataKey) {
      console.warn('공공데이터포털 API 키가 없습니다. 근처 정류소 조회 불가');
      return [];
    }

    const url = new URL(`${TAGO_HOST}/BusSttnInfoInqireService/getCrdntPrxmtSttnList`);
    url.searchParams.append('serviceKey', publicDataKey);
    url.searchParams.append('gpsLati', latitude.toString());
    url.searchParams.append('gpsLong', longitude.toString());
    url.searchParams.append('numOfRows', '50'); // 최대 50개까지 조회
    url.searchParams.append('pageNo', '1');
    url.searchParams.append('_type', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TAGO 근처 정류소 조회 API 오류 (${response.status})`);
    }

    const jsonData = await response.json();

    if (
      jsonData?.response?.header?.resultCode === '00' &&
      jsonData?.response?.body?.items?.item
    ) {
      const items = Array.isArray(jsonData.response.body.items.item)
        ? jsonData.response.body.items.item
        : [jsonData.response.body.items.item];

      // 각 정류소와의 거리를 계산하여 정렬
      const stopsWithDistance: BusStop[] = items.map((item: any) => {
        const itemLat = parseFloat(item.gpslati || '0');
        const itemLon = parseFloat(item.gpslong || '0');
        const distance = calculateDistance(latitude, longitude, itemLat, itemLon);

        return {
          id: item.nodeid || '',
          name: item.nodenm || '',
          latitude: itemLat,
          longitude: itemLon,
          address: undefined, // TAGO API에는 주소 정보가 없음
          distance: Math.round(distance), // 계산된 거리 (미터)
        } as BusStop;
      });

      // 거리순으로 정렬
      return stopsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return [];
  } catch (error) {
    console.error('TAGO 근처 정류소 조회 오류:', error);
    return [];
  }
}

// 내부 함수 export (busApi.ts에서 사용)
export { requestBusArrivalTago, findStationIdByNameTago };

