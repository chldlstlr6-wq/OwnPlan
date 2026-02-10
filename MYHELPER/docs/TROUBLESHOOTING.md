# 로그인 문제 해결 가이드

## 현재 상황
Vercel에 배포된 Life OS 앱에서 로그인이 안 되는 문제가 발생했습니다.

## 가능한 원인들

### 1. **Supabase 환경변수 미설정**
- **증상**: 로그인 페이지에 "환경변수 설정 오류" 메시지
- **확인 방법**: 
  - 로그인 페이지 하단의 "디버그 정보" 섹션 확인
  - Supabase URL과 Key가 "✓ 설정됨" 상태인지 확인
- **해결 방법**:
  ```
  Vercel 프로젝트 설정 → Environment Variables에서 다음 변수 확인:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  ```

### 2. **Supabase 서버 연결 실패**
- **증상**: 로그인 페이지에 "Supabase 서버 연결 실패" 메시지
- **확인 방법**:
  - 브라우저 F12 → 콘솔 탭에서 오류 메시지 확인
  - Network 탭에서 supabase API 요청이 실패하는지 확인
- **해결 방법**:
  - Supabase 프로젝트가 활성 상태인지 확인
  - Supabase 커스텀 도메인 설정 문제 가능성
  - CORS 설정 확인 (Supabase 프로젝트 설정 → API 섹션)

### 3. **CORS 문제**
- **증상**: 네트워크 오류 또는 "cross-origin" 관련 메시지
- **해결 방법**:
  - Supabase 프로젝트 설정 → API → CORS 확인
  - Vercel 배포된 도메인이 허용 목록에 있는지 확인
  - 필요시 `*` 또는 생산 도메인 추가

### 4. **이메일 인증 필요**
- **증상**: 로그인 후 "이메일 인증이 필요합니다" 메시지
- **해결 방법**:
  - 가입할 때 받은 이메일 확인
  - 이메일의 확인 링크 클릭
  - Supabase 프로젝트 설정 → Authentication → Policies에서 "Confirm email" 설정 확인

### 5. **Supabase 프로젝트 비활성화 또는 삭제**
- **증상**: 모든 로그인/회원가입 시도가 실패
- **확인 방법**:
  - Supabase 대시보드에서 프로젝트 상태 확인
  - 프로젝트가 일시 중지되질 않았는지 확인
- **해결 방법**:
  - 필요시 프로젝트 재활성화 또는 복구

## 단계별 진단 절차

### 1단계: 환경변수 확인
```
로그인 페이지 → 디버그 정보 섹션에서 두 변수 모두 "✓ 설정됨" 확인
```

### 2단계: 브라우저 콘솔 확인
```
F12 → 콘솔 탭 → 다음 메시지 확인:
- "[AuthProvider] 로그인 시도: [이메일]"
- 만약 실패하면: "[AuthProvider] 로그인 실패: [상세 오류]"
```

### 3단계: Network 탭 확인
```
F12 → Network 탭 → 로그인 시도 후 
Supabase API 요청 (보통 auth/ 관련)의 상태 코드 확인:
- 401/403: 자격 증명 문제
- 404: 잘못된 Supabase URL
- 0 또는 CORS 오류: CORS 또는 네트워크 문제
```

## 개선된 기능

최근 다음 기능들이 추가되었습니다:

1. **로그인 페이지 개선**
   - Supabase 연결 상태 실시간 표시
   - 더 자세한 에러 메시지 (일반 네트워크 오류 vs 인증 오류 구분)
   - 디버그 정보 섹션

2. **콘솔 로깅 개선**
   - AuthProvider에서 상세한 로그 출력
   - 각 인증 단계별 로깅 (요청 → 성공/실패)

3. **AuthGuard 개선**
   - 상태 전환 과정 로깅
   - 에러 상태 추적

## 빠른 체크리스트

- [ ] Vercel 환경변수에 `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] Vercel 환경변수에 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] 로그인 페이지에서 두 변수 모두 "✓ 설정됨" 상태 확인
- [ ] F12 콘솔에서 오류 메시지 확인
- [ ] Supabase 프로젝트가 활성 상태인지 확인
- [ ] Supabase CORS 설정에 배포 도메인 추가
- [ ] 테스트 계정으로 로그인 시도

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Supabase Error Codes](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
