// Task types
export interface Task {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  status: 'pending' | 'completed';
  category: string | null;
  comment: string | null; // 코멘트 추가
  completed_at: string | null; // 완료 시간 추가
  created_at: string;
  isEvent?: boolean; // true: 캘린더 이벤트(그 날에만 실행), false/undefined: 마감이 있는 할 일
}

// Habit types
export type IntervalType = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  interval_type: IntervalType;
  interval_days?: number[]; // 매주: 요일(0-6), 매달: 날짜(1-31), 분기/반기: 월(1-12)
  last_done_date: string | null;
  completion_records: Record<string, boolean>; // YYYY-MM-DD: true/false 형태로 날짜별 달성 기록
  created_at: string;
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
  name: string; // 예: "키움증권", "토스증권", "미래에셋"
  cash: number; // 계좌의 잔여 현금 (KRW 기준)
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
