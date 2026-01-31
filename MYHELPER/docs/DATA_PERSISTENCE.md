# 데이터 지속성 가이드

## 📋 개요

OwnPlan Life OS의 데이터 지속성 시스템에 대한 문서입니다.

## ✅ 완료된 작업

### 1. 루틴(Habits) 데이터 동기화
- **문제**: 홈페이지와 루틴 페이지가 서로 다른 데이터 소스를 사용하여 동기화 안 됨
  - 홈페이지: `mockHabits` 상수 (수정 불가)
  - 루틴 페이지: 별도의 `useState` 훅 (홈페이지와 독립적)

- **해결책**: `useHabits` 커스텀 훅 구현
  - 로컬스토리지 기반 상태 관리
  - 두 페이지 모두에서 동일한 데이터 소스 사용
  - 페이지 새로고침 후에도 데이터 유지

### 2. 로컬스토리지 기반 데이터 지속성

#### 구현 위치
- **훅**: `/workspaces/OwnPlan/life-os/src/hooks/useHabits.ts`
  - `toggleHabit(id)`: 루틴 완료/미완료 토글
  - `addHabit(habit)`: 새로운 루틴 추가
  - `deleteHabit(id)`: 루틴 삭제
  - `updateHabit(id, updates)`: 루틴 업데이트

- **통합 페이지**:
  - `/workspaces/OwnPlan/life-os/src/app/page.tsx` (홈페이지)
  - `/workspaces/OwnPlan/life-os/src/app/habits/page.tsx` (루틴 페이지)

#### 저장 위치
```javascript
localStorage.getItem("habits_data")  // JSON 형식
localStorage.setItem("habits_data", JSON.stringify(habits))
```

### 3. Supabase 폴백 (Future)
현재 구현은 로컬스토리지만 사용하지만, 향후 다음과 같이 확장 가능:

```typescript
// useHabits.ts 상 구조

1. userId 없음 → 로컬스토리지만 사용
2. userId 있음 (인증됨) → Supabase + 로컬스토리지 (캐시)
   - Supabase에 저장
   - 로컬스토리지에 캐시
   - Supabase 실패 시 로컬스토리지 폴백
```

## 🔄 데이터 흐름

### 홈페이지 (Home)
```
useHabits() 호출
  ↓
localStorage.getItem("habits_data") 로드
  ↓
todayHabits 필터링 (오늘 실행해야 할 루틴)
  ↓
HabitCard 렌더링 (클릭 가능)
  ↓
toggleHabit() 호출 (클릭 시)
  ↓
localStorage 자동 저장
```

### 루틴 페이지 (Habits)
```
useHabits() 호출
  ↓
localStorage.getItem("habits_data") 로드
  ↓
dueHabits / notDueHabits로 분류
  ↓
HabitCard 렌더링 (완료 상태 표시)
  ↓
toggleHabit/deleteHabit/addHabit 호출
  ↓
localStorage 자동 저장
```

## 📊 현재 상태

### ✅ 작동 중
- 루틴 추가 (Add)
- 루틴 완료 토글 (Toggle)
- 루틴 삭제 (Delete)
- 홈페이지 ↔ 루틴 페이지 데이터 실시간 동기화
- 페이지 새로고침 후 데이터 유지
- SSR 안전 (window 체크 포함)

### ⚠️ 미구현 / 향후 개선
- [ ] 과제(Tasks) 로컬스토리지 통합
- [ ] Supabase 백엔드 연동
- [ ] 오프라인 지원 (service worker)
- [ ] 데이터 백업/복구 기능

## 🚀 Vercel 배포에서의 동작

### localStorage 유지 여부
**✅ 유지됨** - 아래와 같이 동작합니다:

1. **브라우저 페이지 새로고침** → 데이터 유지
   ```
   같은 사용자 + 같은 브라우저 + 같은 도메인 = localStorage 유지
   ```

2. **다른 브라우저 / 다른 기기** → 데이터 초기화
   ```
   각 브라우저/기기의 localStorage는 독립적
   ```

3. **브라우저 캐시 삭제** → 데이터 손실
   ```
   localStorage는 브라우저 캐시의 일부
   ```

### 예시 시나리오

#### 시나리오 1: 같은 노트북에서 새로고침
```
1. 홈페이지에서 "운동하기" 루틴 완료 ✓
2. F5 새로고침
3. 결과: "운동하기"는 여전히 완료 상태 ✅
```

#### 시나리오 2: 다른 노트북에서 접속
```
1. 첫 번째 노트북: 루틴 완료함
2. 두 번째 노트북: 같은 Vercel URL로 접속
3. 결과: 초기 데이터만 보임 (동기화 없음) ⚠️
```

### 장기 데이터 보존이 필요한 경우
로컬스토리지는 브라우저별로 독립적이므로, **다중 기기/사용자 지원**이 필요하면 **Supabase 백엔드** 필수:

```typescript
// 향후 구현 예시
if (userId) {
  // 인증된 사용자 → Supabase 동기화
  await supabase.from("habits").upsert(habit);
} else {
  // 비인증 사용자 → 로컬스토리지만
  localStorage.setItem("habits_data", JSON.stringify(habits));
}
```

## 🔧 개발 시 테스트 방법

### 1. 로컬스토리지 확인
```javascript
// 브라우저 콘솔에서 실행
JSON.parse(localStorage.getItem("habits_data"))
```

### 2. 로컬스토리지 초기화
```javascript
localStorage.removeItem("habits_data")
// 또는 전체 삭제
localStorage.clear()
```

### 3. 홈페이지 ↔ 루틴 페이지 동기화 확인
1. 홈페이지에서 루틴 클릭 → 완료 표시
2. 루틴 페이지로 이동
3. 같은 루틴이 "완료됨" 섹션에 있는지 확인

### 4. 새로고침 후 데이터 유지 확인
1. 루틴 몇 개 완료
2. F5 새로고침
3. 완료한 루틴이 그대로 있는지 확인

## 📝 코드 구조

### useHabits 훅의 핵심
```typescript
// 초기 로드 (클라이언트에서만)
useEffect(() => {
  const stored = localStorage.getItem("habits_data");
  setHabits(stored ? JSON.parse(stored) : initialHabits);
}, []);

// 모든 업데이트 후 로컬스토리지 저장
const toggleHabit = (id: string) => {
  const updated = /* 업데이트된 루틴 배열 */;
  setHabits(updated);
  localStorage.setItem("habits_data", JSON.stringify(updated));
};
```

## ⚠️ 주의사항

1. **SSR 문제**: `window is not defined` 에러
   - 해결: 모든 로컬스토리지 접근을 `typeof window !== "undefined"` 로 보호
   
2. **JSON 직렬화 문제**: Date 객체 등이 문자열로 변환됨
   - 현재: `created_at`, `last_done_date`는 ISO string으로 저장
   - 문제없음: 문자열로 비교 가능

3. **동기성 문제**: 한 탭에서 저장 후 다른 탭에서 즉시 읽기
   - 현재: `storage` 이벤트로 다른 탭 감지 안 함
   - 향후: `useEffect` + `storage` 이벤트 리스너 추가 가능

## 🎯 다음 단계

### 우선순위 높음
1. ✅ 홈페이지 클릭 이벤트 작동 → 완료
2. ✅ 루틴 페이지 ↔ 홈페이지 데이터 동기화 → 완료
3. 과제(Tasks) 로컬스토리지 통합

### 우선순위 중간
1. 여러 탭 간 실시간 동기화 (`storage` 이벤트)
2. Supabase 백엔드 연동 (선택사항)

### 우선순위 낮음
1. 서비스 워커를 통한 오프라인 지원
2. 데이터 백업/복구 UI

## 📚 참고 자료
- localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Supabase: https://supabase.com
- Next.js SSR: https://nextjs.org/docs/pages/building-your-application/rendering
