/**
 * BIS API (서울/경기 지역 버스 정보 시스템) 관련 함수
 * TAGO API 실패 시 폴백으로 사용
 */
import { BusArrival } from '../../../types';
import { REGIONAL_BIS_HOSTS, SEOUL_BIS_HOST } from '../common/constants';

/**
 * XML 응답을 JSON으로 파싱
 * 서울시 버스 API는 XML 형식으로 응답하므로 파싱 필요
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

/**
 * 정류장 이름으로 정류장 ID 찾기
 */
export async function findStationIdByName(
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
export async function requestBusArrival(
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
        // arrtime1, arrtime2가 있으면 우선 사용 (초 단위 숫자)
        // 없으면 arrmsg1, arrmsg2를 파싱
        const parseArrivalTime = (arrmsg: string, arrtime?: string): number => {
          // arrtime이 있으면 우선 사용 (초 단위)
          if (arrtime && !isNaN(Number(arrtime))) {
            const time = parseInt(arrtime, 10);
            if (time >= 0) return time;
          }
          
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

        // arrtime 필드 우선 사용 (서울시 버스 API는 arrtime1, arrtime2 제공)
        const arrivalTime1 = parseArrivalTime(
          item.arrmsg1 || '', 
          item.arrtime1 || item.arrtime || undefined
        );
        const arrivalTime2 = item.arrmsg2 || item.arrtime2 
          ? parseArrivalTime(
              item.arrmsg2 || '', 
              item.arrtime2 || undefined
            )
          : undefined;

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

