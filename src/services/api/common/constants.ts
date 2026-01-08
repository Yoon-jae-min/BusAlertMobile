/**
 * API 관련 상수 정의
 */

export const KAKAO_HOST = 'https://dapi.kakao.com';
export const KAKAO_CATEGORY_STOP = 'SW8'; // 버스정류장 카테고리 코드
export const DEFAULT_PAGE_SIZE = 15;

// 서울시 버스정보시스템 API
export const SEOUL_BIS_HOST = 'http://ws.bus.go.kr/api/rest';

// 국가대중교통정보센터(TAGO) API (전국)
export const TAGO_HOST = 'https://apis.data.go.kr/1613000';

// 지역별 BIS API 호스트 매핑 (서울, 경기만 폴백용으로 사용)
export const REGIONAL_BIS_HOSTS: Record<string, string> = {
  seoul: SEOUL_BIS_HOST,
  gyeonggi: 'http://apis.data.go.kr/6410000', // 경기도
  // 나머지 지역은 TAGO API 사용
};

