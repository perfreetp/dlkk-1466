import type {
  MRISlot,
  MRIMachine,
  ExaminationOrder,
  ScreeningConclusion,
  MaterialRequirement,
} from '@/types';
import { mriMachines } from '@/data/mockData';

export interface SlotFilters {
  machineId?: string;
  coilType?: string;
  isEnhanced?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export function filterSlots(
  slots: MRISlot[],
  filters: SlotFilters,
): MRISlot[] {
  let result = [...slots];

  if (filters.dateRange) {
    result = result.filter((s) => {
      const slotDate = s.date;
      return slotDate >= filters.dateRange!.start && slotDate <= filters.dateRange!.end;
    });
  }

  if (filters.machineId) {
    result = result.filter((s) => s.machineId === filters.machineId);
  }

  if (filters.coilType) {
    result = result.filter((s) => {
      const machine = mriMachines.find((m) => m.id === s.machineId);
      if (!machine) return false;
      return machine.supportedCoils.includes(filters.coilType!);
    });
  }

  if (filters.isEnhanced) {
    result = result.filter((s) => s.supportsEnhanced === true);
  }

  result = result.filter((s) => s.isAvailable === true);

  return result;
}

export function groupSlotsByDate(
  slots: MRISlot[],
): Record<string, MRISlot[]> {
  const groups: Record<string, MRISlot[]> = {};
  for (const slot of slots) {
    if (!groups[slot.date]) {
      groups[slot.date] = [];
    }
    groups[slot.date].push(slot);
  }
  for (const date of Object.keys(groups)) {
    groups[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return groups;
}

export interface CanBookResult {
  canBook: boolean;
  reasons: string[];
}

export function checkCanBook(
  order: ExaminationOrder,
  conclusion: ScreeningConclusion | undefined,
): CanBookResult {
  const reasons: string[] = [];

  if (!conclusion) {
    reasons.push('尚未完成筛查流程');
    return { canBook: false, reasons };
  }

  if (conclusion.finalResult === 'absolute_contraindication' || conclusion.result === 'absolute_contraindication') {
    reasons.push('筛查结论为绝对禁忌，不可预约');
  }

  if (conclusion.result === 'rejected') {
    reasons.push('申请单已被退回，不可预约');
  }

  if (conclusion.materialsRequired && conclusion.materialsRequired.length > 0) {
    const notUploaded = conclusion.materialsRequired.filter((m) => m.uploaded === false);
    for (const mat of notUploaded) {
      reasons.push(`缺少材料：${mat.label}`);
    }
  }

  if (order.isEnhanced) {
    const materials: MaterialRequirement[] = conclusion.materialsRequired || [];
    const hasRenal = materials.some((m) => m.type === 'renal_report' && m.uploaded === true);
    if (!hasRenal) {
      const alreadyListed = reasons.some((r) => r.includes('肾功能报告'));
      if (!alreadyListed) {
        reasons.push('增强扫描需上传近一周肾功能报告');
      }
    }
  }

  return {
    canBook: reasons.length === 0,
    reasons,
  };
}
