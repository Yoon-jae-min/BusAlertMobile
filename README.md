# 버스 도착 알림 모바일 앱 🚌

현재 위치부터 버스 정류장까지의 도보 시간을 계산하고, 버스 도착 시간에 맞춰 출발해야 하는 시간을 알려주는 네이티브 모바일 앱입니다.

## 주요 기능

- 📍 **GPS 위치 추적**: 실시간 위치 확인 및 추적
- 🔍 **정류장 검색**: 버스 정류장 검색 및 선택
- ⏰ **도착 시간 조회**: 실시간 버스 도착 시간 확인
- 🚶 **도보 시간 계산**: 현재 위치부터 정류장까지의 도보 시간 계산
- 🔔 **푸시 알림**: 출발해야 하는 시간을 푸시 알림으로 알려줌

## 기술 스택

- **React Native** (Expo)
- **TypeScript**
- **Expo Location** - GPS 위치 추적
- **Expo Notifications** - 푸시 알림

## 시작하기

### 1. 의존성 설치

```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npm install
```

### 2. 개발 서버 실행

#### Android
```bash
npm run android
```

#### iOS (macOS 필요)
```bash
npm run ios
```

#### 웹 브라우저
```bash
npm run web
```

### 3. Expo Go 앱 사용 (추천)

1. 스마트폰에 **Expo Go** 앱 설치
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. 개발 서버 실행
```bash
npm start
```

3. QR 코드 스캔하여 앱 실행

## 환경 변수 설정

`.env` 파일을 생성하고 다음을 추가하세요:

```env
# 공공데이터포털 API 키 (버스 도착 정보)
EXPO_PUBLIC_BUS_API_KEY=your_api_key_here
EXPO_PUBLIC_BUS_API_URL=https://api.example.com
```

## API 키 발급

### 공공데이터포털 (버스 도착 정보)
1. https://www.data.go.kr 접속
2. "버스 도착 정보" 검색
3. 원하는 지역 API 선택 후 신청
4. API 키 발급

## 앱 빌드 및 배포

### Android APK 빌드
```bash
npx expo build:android
```

### iOS 빌드 (macOS 필요)
```bash
npx expo build:ios
```

## 권한 설정

앱에서 다음 권한이 필요합니다:
- **위치 권한**: GPS 위치 추적
- **알림 권한**: 출발 시간 알림

## 주요 파일 구조

```
BusAlertMobile/
├── App.tsx                 # 메인 앱 컴포넌트
├── components/             # React Native 컴포넌트
│   ├── LocationTracker.tsx    # GPS 위치 추적
│   ├── BusStopSearch.tsx      # 정류장 검색
│   └── BusArrivalInfo.tsx     # 도착 정보 표시
├── utils/                  # 유틸리티 함수
│   ├── location.ts         # 위치 관련 함수
│   ├── busApi.ts           # 버스 API 연동
│   ├── walkingTime.ts      # 도보 시간 계산
│   └── notifications.ts    # 알림 관련 함수
└── types/                  # TypeScript 타입 정의
    └── index.ts
```

## TODO

- [ ] 실제 버스 API 연동
- [ ] 정류장 즐겨찾기 기능
- [ ] 지도 표시 (react-native-maps)
- [ ] 오프라인 지원
- [ ] 다크 모드

## 문제 해결

### 위치 권한 오류
- 설정 → 앱 → 권한 → 위치 → 허용

### 알림이 작동하지 않음
- 설정 → 앱 → 권한 → 알림 → 허용

### 빌드 오류
```bash
# 캐시 클리어
npx expo start -c
```

