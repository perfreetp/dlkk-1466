import type {
  ExaminationOrder,
  ScreeningConclusion,
  RejectionRecord,
  StatisticsData,
  RiskFlag,
} from '@/types';
import { RISK_FLAG_LABELS } from '@/types';
import { rejectionReasonTemplates } from '@/data/mockData';

export interface TrendPoint {
  date: string;
  count: number;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDateFromISO = (iso: string): string => {
  return iso.split('T')[0];
};

const randomInRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

export function calculateStatistics(
  orders: ExaminationOrder[],
  conclusions: ScreeningConclusion[],
  rejections: RejectionRecord[],
  startDate: string,
  endDate: string,
): StatisticsData {
  const filterByDate = (iso: string): boolean => {
    const d = getDateFromISO(iso);
    return d >= startDate && d <= endDate;
  };

  const filteredOrders = orders.filter((o) => filterByDate(o.createdAt));
  const filteredRejections = rejections.filter((r) => filterByDate(r.rejectedAt));
  const filteredConclusions = conclusions.filter((c) => filterByDate(c.preliminaryAt));

  const totalOrders = filteredOrders.length;

  const scheduledCount = filteredOrders.filter((o) =>
    ['scheduled', 'reverify_pending', 'completed'].includes(o.status),
  ).length;

  const rejectionCount = filteredRejections.length;

  const reasonCountMap = new Map<string, number>();
  for (const rej of filteredRejections) {
    reasonCountMap.set(rej.reasonCode, (reasonCountMap.get(rej.reasonCode) || 0) + 1);
  }
  const rejectionReasons = Array.from(reasonCountMap.entries()).map(([code, count]) => {
    const template = rejectionReasonTemplates.find((t) => t.code === code);
    return {
      code,
      count,
      label: template ? template.label : code,
    };
  });
  rejectionReasons.sort((a, b) => b.count - a.count);

  const conclusionRiskFlagIds = new Set<string>();
  for (const c of filteredConclusions) {
    for (const id of c.riskFlags) {
      conclusionRiskFlagIds.add(id);
    }
  }

  const riskTypeCountMap = new Map<string, number>();
  for (const c of filteredConclusions) {
    const order = orders.find((o) => o.id === c.orderId);
    if (!order) continue;
  }

  return {
    periodStart: startDate,
    periodEnd: endDate,
    totalOrders,
    scheduledCount,
    rejectionCount,
    rejectionReasons,
    topRiskFlags: [],
    avgScreeningDurationMinutes: 15 + Math.floor(randomInRange(-3, 5)),
    roomUtilizationRate: randomInRange(0.7, 0.9),
    noShowRate: randomInRange(0.05, 0.15),
    onSiteRejectionRate: randomInRange(0.02, 0.08),
  };
}

export function calculateStatisticsWithRisks(
  orders: ExaminationOrder[],
  conclusions: ScreeningConclusion[],
  rejections: RejectionRecord[],
  riskFlags: RiskFlag[],
  startDate: string,
  endDate: string,
): StatisticsData {
  const base = calculateStatistics(orders, conclusions, rejections, startDate, endDate);

  const filterByDate = (iso: string): boolean => {
    const d = getDateFromISO(iso);
    return d >= startDate && d <= endDate;
  };

  const filteredConclusions = conclusions.filter((c) => filterByDate(c.preliminaryAt));
  const conclusionOrderIds = new Set(filteredConclusions.map((c) => c.orderId));
  const relevantRisks = riskFlags.filter(
    (r) => conclusionOrderIds.has(r.orderId) && filterByDate(r.createdAt),
  );

  const riskTypeCountMap = new Map<string, number>();
  for (const rf of relevantRisks) {
    riskTypeCountMap.set(rf.type, (riskTypeCountMap.get(rf.type) || 0) + 1);
  }

  const topRiskFlags = Array.from(riskTypeCountMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      label: (RISK_FLAG_LABELS as Record<string, string>)[type] || type,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    ...base,
    topRiskFlags,
  };
}

export function generateTrendData(
  baseDate: string,
  days: number = 30,
): TrendPoint[] {
  const result: TrendPoint[] = [];
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(base, -i);
    const dateStr = formatDate(date);
    const baseCount = 3 + Math.floor(randomInRange(0, 8));
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    const count = Math.max(0, Math.floor(baseCount * weekendFactor + randomInRange(-1, 2)));

    result.push({
      date: dateStr,
      count,
    });
  }

  return result;
}
