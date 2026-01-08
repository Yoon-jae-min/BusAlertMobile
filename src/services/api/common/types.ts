/**
 * API 관련 타입 정의
 */

export type KakaoPlace = {
  id: string;
  place_name: string;
  phone?: string;
  x: string; // longitude
  y: string; // latitude
  address_name?: string;
  road_address_name?: string;
  distance?: string; // 중심좌표까지의 거리 (미터)
};

