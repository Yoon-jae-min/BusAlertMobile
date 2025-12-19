// 위치 정보 타입
export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// 버스 정류장 타입
export interface BusStop {
  id: string;
  name: string;
  number?: string; // 정류장 번호
  latitude: number;
  longitude: number;
  address?: string;
}

// 버스 도착 정보 타입
export interface BusArrival {
  routeId: string;
  routeName: string;
  routeType?: string; // 간선, 지선, 광역 등
  arrivalTime: number; // 도착까지 남은 시간 (초)
  arrivalTime2?: number; // 두 번째 버스 도착 시간
  locationNo1?: number; // 첫 번째 버스 위치
  locationNo2?: number; // 두 번째 버스 위치
  lowPlate?: boolean; // 저상버스 여부
}

// 도보 경로 정보 타입
export interface WalkingRoute {
  distance: number; // 거리 (미터)
  duration: number; // 소요 시간 (초)
}

// 알림 설정 타입
export interface AlertSetting {
  busStopId: string;
  routeId: string;
  routeName: string;
  enabled: boolean;
  advanceMinutes: number; // 몇 분 전에 알림
}

