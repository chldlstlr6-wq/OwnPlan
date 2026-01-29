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
}

// Habit types
export type IntervalType = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  interval_type: IntervalType;
  interval_days?: number[]; // 매주: 요일(0-6), 매달: 날짜(1-31)
  last_done_date: string | null;
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

export interface PortfolioItem {
  id: string;
  user_id: string;
  ticker: string;
  name?: string;
  market: MarketType;
  target_ratio: number;
  current_quantity: number;
  avg_price: number; // 평균 매수가
  current_price?: number; // 실시간 가격 (API에서 가져옴)
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
