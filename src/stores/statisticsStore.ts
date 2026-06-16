import { create } from 'zustand';
import type { StatisticsData } from '@/types';
import { calculateStatistics, calculateTrendData } from '@/lib/statisticsCalculator';
import usePatientStore from './patientStore';
import useScreeningStore from './screeningStore';
import useSchedulingStore from './schedulingStore';

interface StatisticsState {
  statistics: StatisticsData | null;
  trendData: any[];
}

interface StatisticsActions {
  loadStatistics: (startDate?: string, endDate?: string) => void;
  loadTrendData: (days?: number) => void;
}

type StatisticsStore = StatisticsState & StatisticsActions;

const useStatisticsStore = create<StatisticsStore>()((set) => ({
  statistics: null,
  trendData: [],

  loadStatistics: (startDate, endDate) => {
    const { orders } = usePatientStore.getState();
    const { riskFlags, conclusions } = useScreeningStore.getState();
    const { slots, appointments } = useSchedulingStore.getState();

    const stats = calculateStatistics(
      orders,
      conclusions,
      riskFlags,
      slots,
      appointments,
      startDate,
      endDate,
    );

    set({ statistics: stats });
  },

  loadTrendData: (days = 7) => {
    const { orders } = usePatientStore.getState();
    const trend = calculateTrendData(orders, days);
    set({ trendData: trend });
  },
}));

export default useStatisticsStore;
