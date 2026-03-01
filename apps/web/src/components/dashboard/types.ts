export type IconKey =
  | "testCases"
  | "testRuns"
  | "bugs"
  | "passRate"
  | "pending"
  | "bugRate";

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  subtext: string;
  icon: IconKey;
}

export interface TrendPoint {
  day: string;
  executed: number;
  passed: number;
  failed: number;
  resolved: number;
}

export interface BugStatusPoint {
  name: string;
  value: number;
  color: string;
}

export interface ModuleFailurePoint {
  module: string;
  failures: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  when: string;
}

export interface AssignedItem {
  id: string;
  item: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  createdAt: string;
}

export interface RoleSpecificMetrics {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  tertiaryLabel: string;
  tertiaryValue: string;
  quaternaryLabel: string;
  quaternaryValue: string;
}

export interface DashboardData {
  kpis: KpiMetric[];
  trend: TrendPoint[];
  bugStatus: BugStatusPoint[];
  moduleFailures: ModuleFailurePoint[];
  recentActivity: ActivityItem[];
  assignedItems: AssignedItem[];
  notifications: DashboardNotification[];
  roleMetrics: RoleSpecificMetrics;
  bugDetectionRate: string;
}
