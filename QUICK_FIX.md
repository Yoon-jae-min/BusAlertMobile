# Expo Go 로딩 문제 빠른 해결

## 즉시 시도해볼 것들

### 1. 캐시 클리어 후 재시작
```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npx expo start -c
```

### 2. Tunnel 모드 사용 (Wi-Fi 문제일 때)
```bash
npx expo start --tunnel
```

### 3. 네트워크 확인
- PC와 스마트폰이 **같은 Wi-Fi**에 연결되어 있는지 확인
- 방화벽이 Metro bundler를 차단하지 않는지 확인

### 4. 터미널 오류 확인
`npm start` 실행 시 터미널에 표시되는 오류 메시지 확인:
- 빨간색 오류가 있으면 그 오류를 먼저 해결
- "Unable to resolve module" → `npm install` 재실행
- "Network request failed" → Wi-Fi 또는 Tunnel 모드 사용

### 5. 간단한 테스트 버전으로 확인

`App.tsx`를 간단한 버전으로 교체해서 테스트:

```typescript
import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚌 버스 도착 알림</Text>
        <Text style={styles.text}>테스트 성공!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
  },
});
```

이것이 작동하면 → 컴포넌트에 문제가 있는 것
이것도 안 되면 → 네트워크 또는 Expo 설정 문제

### 6. Expo Go 앱 재설치
- Expo Go 앱 삭제 후 재설치
- 최신 버전인지 확인

### 7. 의존성 재설치
```bash
rm -rf node_modules
npm install
npx expo start -c
```

## 가장 흔한 원인

1. **네트워크 문제** (80%) - 같은 Wi-Fi 아님
2. **코드 오류** (15%) - 컴포넌트 import 오류
3. **캐시 문제** (5%) - Metro bundler 캐시

## 디버깅 팁

터미널에서 `npm start` 실행 후:
- QR 코드가 표시되는지 확인
- "Metro waiting on..." 메시지 확인
- 빨간색 오류 메시지 확인
- 노란색 경고 메시지 확인

