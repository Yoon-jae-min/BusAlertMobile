/**
 * 지역 감지 및 도시코드 관련 유틸리티
 */

/**
 * 지역 코드를 TAGO 도시 코드로 변환
 * TAGO API는 도시 코드를 사용 (예: 서울=11, 부산=26, 대구=27, 인천=28, 광주=29, 대전=30, 울산=31, 경기=41 등)
 */
export function getTagoCityCode(region: string): string {
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
export function getRegionalApiKey(region: string): string | null {
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

