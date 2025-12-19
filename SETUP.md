# 버스 도착 알림 모바일 앱 설정 가이드

## 🚀 빠른 시작

### 방법 1: Expo Go 앱 사용 (가장 간단)

1. **Expo Go 앱 설치**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **개발 서버 실행**
```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npm start
```

3. **QR 코드 스캔**
   - 터미널에 표시된 QR 코드를 Expo Go 앱으로 스캔
   - 또는 같은 Wi-Fi에 연결된 상태에서 앱에서 자동으로 감지

### 방법 2: Android 에뮬레이터/실제 기기

1. **Android Studio 설치** (에뮬레이터 사용 시)
2. **실제 기기 연결** 또는 **에뮬레이터 실행**
3. **앱 실행**
```bash
npm run android
```

### 방법 3: iOS 시뮬레이터 (macOS만 가능)

```bash
npm run ios
```

## 📱 실제 기기에서 테스트

### Android
1. USB 디버깅 활성화
2. 개발자 옵션 활성화
3. USB로 연결
4. `npm run android` 실행

### iOS
1. Xcode 설치 필요
2. Apple Developer 계정 필요 (무료 계정 가능)
3. `npm run ios` 실행

## 🔧 API 연동

### `utils/busApi.ts` 파일 수정

실제 API 응답 형식에 맞게 함수를 수정하세요:

```typescript
export async function searchBusStops(query: string): Promise<BusStop[]> {
  const apiKey = process.env.EXPO_PUBLIC_BUS_API_KEY;
  const apiUrl = process.env.EXPO_PUBLIC_BUS_API_URL;
  
  const response = await fetch(
    `${apiUrl}/busStop?keyword=${encodeURIComponent(query)}&apiKey=${apiKey}`
  );
  const data = await response.json();
  // API 응답 형식에 맞게 변환
  return data.stops || [];
}
```

## 🔑 API 키 발급

### 공공데이터포털
1. https://www.data.go.kr 접속
2. "버스 도착 정보" 검색
3. 원하는 지역 API 선택
4. 활용신청 후 API 키 발급
5. `.env` 파일에 추가:
```env
EXPO_PUBLIC_BUS_API_KEY=발급받은_API_키
EXPO_PUBLIC_BUS_API_URL=API_기본_URL
```

## 📦 앱 빌드

### Android APK 빌드
```bash
# EAS Build 사용 (권장)
npx eas-cli build --platform android

# 또는 Expo Build (구버전)
npx expo build:android
```

### iOS 빌드 (macOS 필요)
```bash
npx eas-cli build --platform ios
```

## 🎯 주요 기능

- ✅ GPS 위치 추적 (실시간)
- ✅ 정류장 검색
- ✅ 버스 도착 시간 조회
- ✅ 도보 시간 계산
- ✅ 푸시 알림 (출발 시간)

## ⚠️ 주의사항

1. **위치 권한**: 앱 실행 시 위치 권한 허용 필요
2. **알림 권한**: 알림 기능 사용 시 권한 허용 필요
3. **인터넷 연결**: 버스 정보 조회를 위해 필요

## 🐛 문제 해결

### 위치가 안 잡힘
- 설정 → 앱 → 권한 → 위치 → 허용 확인
- GPS가 켜져 있는지 확인

### 알림이 안 옴
- 설정 → 앱 → 권한 → 알림 → 허용 확인
- 기기의 방해금지 모드 확인

### 빌드 오류
```bash
# 캐시 클리어 후 재시도
npx expo start -c
rm -rf node_modules
npm install
```

