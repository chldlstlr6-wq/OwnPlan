// Task types
export interface Task {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  status: 'pending' | 'completed';
  category: string | null;
  comment: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  isEvent?: boolean; // true: 캘린더 이벤트(그 날에만 실행), false/undefined: 마감이 있는 할 일
}

// Habit types
export type IntervalType = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year';
export type DateType = 'specific_date' | 'nth_weekday'; // 특정 날짜 vs n번째 요일

export interface QuarterHalfYearConfig {
  type: DateType; // 'specific_date': 각 월의 특정 날, 'nth_weekday': n번째 요일
  months: number[]; // 선택된 월들 (1-12)
  specificDate?: number; // type이 'specific_date'일 때 사용 (1-31)
  weekday?: number; // type이 'nth_weekday'일 때 요일 (0-6)
  weekCount?: number; // type이 'nth_weekday'일 때 몇 번째 (1-5)
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  interval_type: IntervalType;
  interval_days?: number[]; // 매주: 요일(0-6), 매달: 날짜(1-31)
  quarterHalfYearConfig?: QuarterHalfYearConfig; // 분기/반기/연간 세부 설정
  last_done_date: string | null;
  completion_records: Record<string, boolean>; // YYYY-MM-DD: true/false 형태로 날짜별 달성 기록
  created_at: string;
  updated_at: string;
}

// Scraping Target types
export interface ScrapingTarget {
  id: string;
  user_id: string;
  target_url: string;
  selector: string | null;
  last_content_hash: string | null;
  created_at: string;
}

// Portfolio types
export type MarketType = 'KR' | 'US';

export interface Account {
  id: string;
  user_id?: string;
  name: string; // 예: "키움증권", "토스증권", "미래에셋"
  cash: number; // 계좌의 잔여 현금 (KRW 기준)
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  account_id: string; // 계좌 ID
  ticker: string;
  name?: string;
  market: MarketType;
  target_ratio: number; // 전체 포트폴리오 기준 목표 비중
  current_quantity: number;
  avg_price: number;
  current_price?: number;
  created_at: string;
  updated_at?: string;
}

export interface ExchangeRate {
  usd_krw: number;
  updated_at: string;
}

// Navigation types
export type TabKey = 'home' | 'calendar' | 'tasks' | 'habits' | 'portfolio';

export interface NavItem {
  key: TabKey;
  label: string;
  href: string;
  icon: React.ReactNode;
}
