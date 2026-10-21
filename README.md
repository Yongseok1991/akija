# 📱 스마트가계부 (Smart Household Account Book PWA)

매일 1회 수동 입력 패턴에 맞춰, **입력 뎁스(Depth)를 극단적으로 단축하고 모바일 OS 가상 키보드 간섭을 원천 차단**한 개인용 PWA 가계부입니다.

---

## ✨ 핵심 차별점 및 주요 기능

1. **OS 가상 키보드 개입 100% 차단 (Zero OS Keyboard)**
   - 모바일 브라우저에서 화면을 가리고 덜컹거리는 기본 키보드가 올라오지 않습니다.
   - 사칙연산(`+`, `-`)이 내장된 **자체 커스텀 가상 넘패드**와 터치 바텀시트만으로 모든 입력을 완결합니다.
2. **원터치 진입 & 스마트 디폴트**
   - 어느 탭에서든 하단 **FAB(+)** 버튼으로 즉시 입력 모달 진입.
   - 열림과 동시에 **날짜는 '오늘', 유형은 '지출'**로 자동 세팅되어 터치 낭비를 없앱니다.
3. **분류(카테고리) 및 결제수단 바텀시트**
   - **4열 바둑판 그리드 바텀시트**: 사용자 지정 기본 25종 카테고리(식비, 카페/커피, 마트/편의점, 집술, 술, 교통/차량, 주거/통신, 생활용품, 패션/미용, 헤어, 화장품, 건강, 병원, 운동, 문화생활, 게임, ott구독, 교육, 자격증시험, 경조사/회비, 부모님, 보험, 여행, 대회접수비, 기타) 원터치 선택.
   - **3단 탭 자산 바텀시트**: 현금 / 은행(체크) / 신용카드 분리 선택 및 이체(자산 이동) 지원.
4. **조회 및 대시보드**
   - **일일 내역**: 일자별 지출/수입 합산 및 세부 거래 내역, 월 예산 게이지 바.
   - **월간 달력**: 일자별 수입(+), 지출(-) 금액 직관적 표기 및 날짜별 상세 조회.
   - **통계**: 카테고리별 지출 도넛 차트 & 비중(%), 전월 대비 증감률(%), 최근 6개월 추이 바 차트.
   - **자산 현황**: 보유 자산(현금 + 예금)과 부채(신용카드 미결제 대금) 분리 집계를 통한 실시간 **순자산(Net Worth)** 계산.
5. **관리 & 서버리스 클라우드 동기화**
   - **Serverless 인프라**: GitHub Pages 호스팅 ($0) + Supabase PostgreSQL ($0).
   - **오프라인 퍼스트**: Supabase 미설정 시에도 로컬 브라우저에서 100% 정상 작동.
   - **간편 동기화**: 설정 탭에서 Supabase URL과 Anon Key만 입력하면 즉시 양방향 동기화.
   - **데이터 백업**: JSON 내보내기/가져오기 기능 지원.

---

## 🚀 빠른 시작 (Local Development)

```bash
# 1. 의존성 설치
npm install

# 2. 로컬 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다. (F12 개발자 도구의 '모바일 디바이스 툴바'를 켜고 확인하시면 실제 모바일 환경과 동일한 뷰를 경험하실 수 있습니다.)

---

## ☁️ Supabase 연동 방법 (선택 사항)

1. [Supabase](https://supabase.com/)에서 새 프로젝트를 생성합니다.
2. Supabase 좌측 메뉴의 **SQL Editor**로 이동합니다.
3. 본 프로젝트의 `supabase/schema.sql` 파일 내용을 복사하여 붙여넣고 **Run**을 실행합니다.
4. Supabase **Project Settings > API**에서 `Project URL`과 `anon public key`를 복사합니다.
5. 가계부 웹앱의 **관리(설정) 탭 > Supabase 클라우드 동기화** 항목에 붙여넣고 저장합니다.

---

## 🌐 GitHub Pages 배포 방법

본 프로젝트에는 GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)가 사전 구성되어 있습니다.

1. GitHub에 새 리포지토리를 만들고 코드를 push합니다:
   ```bash
   git add .
   git commit -m "feat: Initial commit for Smart Account Book PWA"
   git branch -M main
   git remote add origin https://github.com/<사용자명>/<리포지토리명>.git
   git push -u origin main
   ```
2. GitHub 저장소의 **Settings > Pages** 메뉴로 이동합니다.
3. **Build and deployment > Source**를 **GitHub Actions**로 선택합니다.
4. `main` 브랜치에 push가 발생할 때마다 자동으로 빌드되어 배포됩니다.
