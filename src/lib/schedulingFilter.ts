import type { MRISlot, ExaminationOrder, ScreeningConclusion, MaterialRequirement } from '@/types';

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

export function checkCanBook(order: ExaminationOrder, conclusion: ScreeningConclusion | undefined): { canBook: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!conclusion) {
    reasons.push('尚未完成筛查流程');
    return { canBook: false, reasons };
  }

  const finalResult = conclusion.finalResult || conclusion.result;

  if (finalResult === 'absolute_contraindication') {
    reasons.push('筛查结论为绝对禁忌，不可预约');
  }

  if (finalResult === 'rejected' || conclusion.result === 'rejected') {
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

  if (!['review_done', 'scheduling_pending', 'scheduled', 'reverify_pending'].includes(order.status) && reasons.length === 0) {
    reasons.push(`当前状态不允许预约`);
  }

  return {
    canBook: reasons.length === 0,
    reasons,
  };
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
