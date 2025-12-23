# Android Studio에서 실행하기

## 방법 1: Expo 개발 빌드 (권장)

### 1. 네이티브 코드 생성

```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npx expo prebuild
```

이 명령어를 실행하면 `android/` 폴더가 생성됩니다.

### 2. Android Studio에서 열기

1. Android Studio 실행
2. **File → Open** 선택
3. `BusAlertMobile/android` 폴더 선택
4. 프로젝트 로드 대기

### 3. 에뮬레이터 설정

1. **Tools → Device Manager**
2. **Create Device** 클릭
3. 원하는 기기 선택 (예: Pixel 5)
4. 시스템 이미지 선택 (API 33 이상 권장)
5. **Finish** 클릭

### 4. 앱 실행

1. 에뮬레이터 실행
2. Android Studio 상단의 **Run** 버튼 클릭 (▶️)
3. 또는 `Shift + F10`

## 방법 2: 명령어로 직접 실행 (더 간단)

### 1. Android Studio 설치 확인

Android Studio가 설치되어 있고 `ANDROID_HOME` 환경 변수가 설정되어 있어야 합니다.

### 2. 에뮬레이터 실행

Android Studio에서 에뮬레이터를 먼저 실행하거나, 실제 기기를 USB로 연결합니다.

### 3. 앱 실행

```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npm run android
```

이 명령어가 자동으로:
- 네이티브 코드 생성 (필요시)
- Android Studio 빌드
- 에뮬레이터/기기에 설치 및 실행

## 방법 3: APK 빌드 후 설치

### 1. 개발용 APK 빌드

```bash
cd C:\Users\androidJM\Desktop\Project\Apps\BusAlertMobile
npx expo prebuild
cd android
./gradlew assembleDebug
```

빌드된 APK 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

### 2. APK 설치

1. APK 파일을 안드로이드 기기로 전송
2. 기기에서 APK 파일 실행
3. 설치 허용

## 환경 설정

### Android Studio 설치

1. https://developer.android.com/studio 다운로드
2. 설치 시 다음 포함:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### 환경 변수 설정 (Windows)

1. 시스템 환경 변수 설정
2. `ANDROID_HOME` 추가:
   - 값: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Path에 추가:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

### Java JDK 설치

Android Studio 설치 시 포함되지만, 별도로 설치하려면:
- JDK 17 이상 권장

## 문제 해결

### "ANDROID_HOME is not set"
```bash
# PowerShell에서
$env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
```

### "SDK location not found"
Android Studio에서:
1. **File → Settings → Appearance & Behavior → System Settings → Android SDK**
2. SDK 경로 확인 및 복사
3. 환경 변수에 설정

### 빌드 오류
```bash
# 캐시 클리어
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

## 추천 방법

**가장 간단한 방법:**
```bash
npm run android
```

이 명령어 하나로 모든 것이 자동으로 처리됩니다!

