export type AccountType = 'cash' | 'debit' | 'credit' | 'savings' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'completed' | 'pending';
export type TransactionSource = 'manual' | 'scan';
export type CategoryType = 'income' | 'expense';
export type TaskSource = 'manual' | 'classroom';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';
export type PushTokenPlatform = 'android' | 'ios' | 'web' | 'unknown';
export type NotificationStatus = 'sent' | 'error' | 'skipped';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color: string | null;
  icon: string | null;
  include_in_balance: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
  spent: number;
  created_at: string;
  updated_at: string;
}

export interface AppTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  merchant: string | null;
  date: string;
  status: TransactionStatus;
  source: TransactionSource;
  receipt_text: string | null;
  transfer_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  source: TaskSource;
  classroom_course_id: string | null;
  classroom_course_work_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  estimated_minutes: number | null;
  estimated_cost: number | null;
  status: TaskStatus;
  completed_at: string | null;
  urgency_score: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_ai_generated: boolean;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TaskRef {
  id: string;
  classroom_course_id: string | null;
  classroom_course_work_id: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  due_date: string | null;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: PushTokenPlatform;
  device_name: string | null;
  created_at: string;
  last_used_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  task_id: string | null;
  type: string;
  title: string;
  body: string;
  data: unknown | null;
  fcm_status: NotificationStatus;
  fcm_message_id: string | null;
  fcm_error: string | null;
  sent_at: string;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  currency?: string;
  color?: string | null;
  icon?: string | null;
  include_in_balance?: boolean;
}

export interface AccountPatch {
  name?: string;
  type?: AccountType;
  currency?: string;
  color?: string | null;
  icon?: string | null;
  include_in_balance?: boolean;
}

export interface TransactionInput {
  account_id: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string | null;
  merchant?: string | null;
  date?: string;
  status?: TransactionStatus;
  source?: TransactionSource;
  receipt_text?: string | null;
  transfer_account_id?: string | null;
}

export interface TransactionPatch {
  account_id?: string;
  category_id?: string | null;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  description?: string | null;
  merchant?: string | null;
  date?: string;
  status?: TransactionStatus;
  source?: TransactionSource;
  receipt_text?: string | null;
  transfer_account_id?: string | null;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export interface BudgetInput {
  category_id: string;
  month: string;
  amount: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  subject?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  estimated_minutes?: number | null;
  estimated_cost?: number | null;
  source?: TaskSource;
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  subject?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  estimated_minutes?: number | null;
  estimated_cost?: number | null;
  status?: TaskStatus;
}

export interface SubtaskInput {
  title: string;
  is_ai_generated?: boolean;
}