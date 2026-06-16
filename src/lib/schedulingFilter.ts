import type { MRISlot, ExaminationOrder, ConclusionResult } from '@/types';

export interface SlotFilters {
  machineId?: string;
  coilType?: string;
  isEnhanced?: boolean;
  startDate?: string;
  endDate?: string;
}

export function filterSlots(slots: MRISlot[], filters: SlotFilters): MRISlot[] {
  return slots.filter((slot) => {
    if (!slot.isAvailable) return false;
    if (filters.machineId && slot.machineId !== filters.machineId) return false;
    if (filters.coilType && slot.coilType !== filters.coilType) return false;
    if (filters.isEnhanced !== undefined && slot.supportsEnhanced !== filters.isEnhanced) return false;
    if (filters.startDate && slot.date < filters.startDate) return false;
    if (filters.endDate && slot.date > filters.endDate) return false;
    return true;
  });
}

export function checkCanBook(order: ExaminationOrder, finalResult?: ConclusionResult): { canBook: boolean; reason?: string } {
  if (finalResult === 'absolute_contraindication') {
    return { canBook: false, reason: '存在绝对禁忌，不能预约' };
  }
  if (finalResult === 'rejected') {
    return { canBook: false, reason: '检查已被退回' };
  }
  if (finalResult === 'materials_needed') {
    return { canBook: false, reason: '需补充材料后方可预约' };
  }
  if (!['review_done', 'scheduling_pending', 'scheduled'].includes(order.status)) {
    return { canBook: false, reason: `当前状态【${order.status}】不允许预约` };
  }
  return { canBook: true };
}

export function getRecommendedCoilType(bodyPart: string): string | undefined {
  const map: Record<string, string> = {
    brain: '头线圈',
    neck: '头线圈',
    spine_cervical: '脊柱线圈',
    spine_lumbar: '脊柱线圈',
    chest: '体线圈',
    abdomen: '体线圈',
    pelvis: '体线圈',
    cardiac: '心脏线圈',
    mammary: '乳腺线圈',
    knee: '膝关节线圈',
    shoulder: '肩关节线圈',
  };
  return map[bodyPart];
}
