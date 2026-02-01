import { Habit, Task } from "@/types";

// 로컬스토리지 키 (userId가 있으면 사용자별 분리)
function getKey(base: string, userId?: string): string {
  return userId ? `${base}_${userId}` : base;
}

const HABITS_KEY = "ownplan_habits";
const TASKS_KEY = "ownplan_tasks";
const PORTFOLIO_KEY = "ownplan_portfolio";
const ACCOUNTS_KEY = "ownplan_accounts";

// Habits
export function getStoredHabits(initialHabits: Habit[], userId?: string): Habit[] {
  if (typeof window === "undefined") return initialHabits;
  try {
    const stored = localStorage.getItem(getKey(HABITS_KEY, userId));
    return stored ? JSON.parse(stored) : initialHabits;
  } catch {
    return initialHabits;
  }
}

export function saveHabits(habits: Habit[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(HABITS_KEY, userId), JSON.stringify(habits));
  } catch (e) {
    console.error("Failed to save habits:", e);
  }
}

// Tasks
export function getStoredTasks(initialTasks: Task[], userId?: string): Task[] {
  if (typeof window === "undefined") return initialTasks;
  try {
    const stored = localStorage.getItem(getKey(TASKS_KEY, userId));
    return stored ? JSON.parse(stored) : initialTasks;
  } catch {
    return initialTasks;
  }
}

export function saveTasks(tasks: Task[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(TASKS_KEY, userId), JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks:", e);
  }
}

// Portfolio / Accounts
export function getStoredPortfolio(initialPortfolio: any[] = [], userId?: string): any[] {
  if (typeof window === "undefined") return initialPortfolio;
  try {
    const stored = localStorage.getItem(getKey(PORTFOLIO_KEY, userId));
    return stored ? JSON.parse(stored) : initialPortfolio;
  } catch {
    return initialPortfolio;
  }
}

export function savePortfolio(portfolio: any[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(PORTFOLIO_KEY, userId), JSON.stringify(portfolio));
  } catch (e) {
    console.error("Failed to save portfolio:", e);
  }
}

export function getStoredAccounts(initialAccounts: any[] = [], userId?: string): any[] {
  if (typeof window === "undefined") return initialAccounts;
  try {
    const stored = localStorage.getItem(getKey(ACCOUNTS_KEY, userId));
    return stored ? JSON.parse(stored) : initialAccounts;
  } catch {
    return initialAccounts;
  }
}

export function saveAccounts(accounts: any[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(ACCOUNTS_KEY, userId), JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts:", e);
  }
}
