# Expo Go 로딩 문제 해결 가이드

## 로딩 화면만 나오는 경우 해결 방법

### 1. 네트워크 연결 확인

**문제:** PC와 스마트폰이 같은 Wi-Fi에 연결되어 있지 않음

**해결:**
- PC와 스마트폰이 **같은 Wi-Fi 네트워크**에 연결되어 있는지 확인
- 방화벽이 Metro bundler를 차단하지 않는지 확인

### 2. Metro Bundler 재시작

```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile

# 캐시 클리어 후 재시작
npx expo start -c
```

### 3. 터미널에서 오류 확인

`npm start` 실행 시 터미널에 표시되는 오류 메시지를 확인하세요:
- 빨간색 오류 메시지
- 경고 메시지
- 빌드 실패 메시지

### 4. Expo Go 앱 재시작

1. Expo Go 앱 완전 종료
2. 앱 다시 실행
3. QR 코드 다시 스캔

### 5. Tunnel 모드 사용

같은 Wi-Fi에 연결할 수 없는 경우:

```bash
npx expo start --tunnel
```

이 모드는 인터넷을 통해 연결하므로 더 느릴 수 있습니다.

### 6. 코드 오류 확인

터미널에서 빌드 오류가 있는지 확인:
- 컴포넌트 import 오류
- TypeScript 타입 오류
- 문법 오류

### 7. Expo SDK 버전 확인

Expo Go 앱 버전과 프로젝트의 Expo SDK 버전이 호환되는지 확인:

```bash
npx expo doctor
```

### 8. 간단한 테스트 버전으로 확인

문제를 격리하기 위해 간단한 버전으로 테스트:

```typescript
// App.tsx를 간단하게
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>테스트</Text>
    </View>
  );
}
```

이것이 작동하면 컴포넌트에 문제가 있는 것입니다.

## 일반적인 오류 메시지

### "Unable to resolve module"
- `npm install` 재실행
- `node_modules` 삭제 후 재설치

### "Network request failed"
- Wi-Fi 연결 확인
- 방화벽 설정 확인
- Tunnel 모드 사용

### "Expo Go version mismatch"
- Expo Go 앱 업데이트
- 또는 프로젝트 Expo SDK 버전 조정

