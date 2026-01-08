/**
 * 더미 데이터 (개발/테스트용)
 */
import { BusStop, BusArrival } from '../../../types';

export function getDummyBusStops(query: string): BusStop[] {
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

export function getDummyArrivals(): BusArrival[] {
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

