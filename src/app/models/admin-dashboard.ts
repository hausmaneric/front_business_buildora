export interface SummaryCard {
  title: string;
  value: string;
  delta: string;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'cyan';
  icon: string;
  progress?: number;
  suffix?: string;
  sparkline: number[];
}

export interface DistributionItem {
  label: string;
  value: number;
  color: string;
}

export interface AccessRow {
  company: string;
  user: string;
  dateTime: string;
  ip: string;
  badge: string;
}

export interface LogRow {
  title: string;
  dateTime: string;
  type: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  toneLabel?: string;
}

export interface AlertRow {
  title: string;
  message: string;
  secondary: string;
  percent?: number;
  tone: 'warning' | 'danger';
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface AdminDashboardViewModel {
  cards: SummaryCard[];
  planDistribution: DistributionItem[];
  subscriptionDistribution: DistributionItem[];
  storageTrend: TrendPoint[];
  recentAccess: AccessRow[];
  recentLogs: LogRow[];
  alerts: AlertRow[];
  footerStats: SummaryCard[];
}
