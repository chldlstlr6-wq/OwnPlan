import { Habit, Task } from "@/types";

// 로컬스토리지 키
const HABITS_KEY = "ownplan_habits";
const TASKS_KEY = "ownplan_tasks";
const PORTFOLIO_KEY = "ownplan_portfolio";
const ACCOUNTS_KEY = "ownplan_accounts";

// Habits
export function getStoredHabits(initialHabits: Habit[]): Habit[] {
  if (typeof window === "undefined") return initialHabits;
  try {
    const stored = localStorage.getItem(HABITS_KEY);
    return stored ? JSON.parse(stored) : initialHabits;
  } catch {
    return initialHabits;
  }
}

export function saveHabits(habits: Habit[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error("Failed to save habits:", e);
  }
}

// Tasks
export function getStoredTasks(initialTasks: Task[]): Task[] {
  if (typeof window === "undefined") return initialTasks;
  try {
    const stored = localStorage.getItem(TASKS_KEY);
    return stored ? JSON.parse(stored) : initialTasks;
  } catch {
    return initialTasks;
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks:", e);
  }
}

// Portfolio / Accounts
export function getStoredPortfolio(initialPortfolio: any[] = []): any[] {
  if (typeof window === "undefined") return initialPortfolio;
  try {
    const stored = localStorage.getItem(PORTFOLIO_KEY);
    return stored ? JSON.parse(stored) : initialPortfolio;
  } catch {
    return initialPortfolio;
  }
}

export function savePortfolio(portfolio: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
  } catch (e) {
    console.error("Failed to save portfolio:", e);
  }
}

export function getStoredAccounts(initialAccounts: any[] = []): any[] {
  if (typeof window === "undefined") return initialAccounts;
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : initialAccounts;
  } catch {
    return initialAccounts;
  }
}

export function saveAccounts(accounts: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts:", e);
  }
}
