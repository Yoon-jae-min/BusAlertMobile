import { BusStop, BusArrival } from '../types';

/**
 * 버스 정류장 검색
 * 실제 API 연동 필요
 */
export async function searchBusStops(query: string): Promise<BusStop[]> {
  // TODO: 실제 API 연동
  // const apiKey = process.env.EXPO_PUBLIC_BUS_API_KEY;
  // const apiUrl = process.env.EXPO_PUBLIC_BUS_API_URL;
  
  // 임시 더미 데이터
  return getDummyBusStops(query);
}

/**
 * 버스 도착 정보 조회
 * 실제 API 연동 필요
 */
export async function getBusArrivalInfo(
  busStopId: string
): Promise<BusArrival[]> {
  // TODO: 실제 API 연동
  // const apiKey = process.env.EXPO_PUBLIC_BUS_API_KEY;
  // const apiUrl = process.env.EXPO_PUBLIC_BUS_API_URL;
  
  // 임시 더미 데이터
  return getDummyArrivals();
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
      latitude: 37.4980,
      longitude: 127.0276,
      address: '서울특별시 강남구 강남대로',
    },
    {
      id: '2',
      name: '역삼역',
      number: '12346',
      latitude: 37.5000,
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
      arrivalTime: 180, // 3분
      arrivalTime2: 600, // 10분
      locationNo1: 2,
      locationNo2: 5,
      lowPlate: false,
    },
    {
      routeId: '2',
      routeName: '241번',
      routeType: '지선',
      arrivalTime: 420, // 7분
      arrivalTime2: 900, // 15분
      locationNo1: 1,
      locationNo2: 3,
      lowPlate: true,
    },
    {
      routeId: '3',
      routeName: '463번',
      routeType: '광역',
      arrivalTime: 60, // 1분
      arrivalTime2: 480, // 8분
      locationNo1: 0,
      locationNo2: 4,
      lowPlate: false,
    },
  ];
}

