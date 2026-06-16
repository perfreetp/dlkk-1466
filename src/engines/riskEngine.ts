import type {
  RiskFlag,
  RiskFlagType,
  FollowUpItem,
  MaterialRequirement,
  ConclusionResult,
} from '@/types';
import { RISK_RULES, getHighestPriorityLevel } from '@/data/riskRules';
import { STANDARD_SCRIPTS } from '@/data/scripts';
import { MATERIAL_TYPE_LABELS } from '@/types';

export interface FollowUpTask {
  id: string;
  orderId: string;
  riskType: string;
  question: string;
  standardScript: string;
}

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function generateFollowUpTasks(
  orderId: string,
  riskFlags: RiskFlag[],
): FollowUpItem[] {
  const items: FollowUpItem[] = [];

  for (const flag of riskFlags) {
    const matchingScripts = Object.values(STANDARD_SCRIPTS).filter(
      (s) => s.riskType === flag.type,
    );

    if (matchingScripts.length > 0) {
      const script = matchingScripts[0];
      items.push({
        id: generateUUID(),
        orderId,
        question: script.question,
        standardScript: script.script,
        riskType: flag.type,
        completed: false,
      });
    }
  }

  return items;
}

export function generateMaterialsRequired(
  riskFlags: RiskFlag[],
  isEnhanced: boolean,
): MaterialRequirement[] {
  const materialsMap = new Map<string, MaterialRequirement>();

  for (const flag of riskFlags) {
    const rule = RISK_RULES[flag.type];
    if (rule.requiresMaterials) {
      for (const mat of rule.requiresMaterials) {
        if (!materialsMap.has(mat)) {
          materialsMap.set(mat, {
            type: mat,
            label: MATERIAL_TYPE_LABELS[mat],
            uploaded: false,
          });
        }
      }
    }
  }

  if (isEnhanced && !materialsMap.has('renal_report')) {
    materialsMap.set('renal_report', {
      type: 'renal_report',
      label: MATERIAL_TYPE_LABELS.renal_report,
      uploaded: false,
    });
  }

  return Array.from(materialsMap.values());
}

export function getConclusionFromRisks(
  riskFlags: RiskFlag[],
): 'absolute_contraindication' | 'materials_needed' | 'proceed' {
  const riskTypes = riskFlags.map((f) => f.type);
  const level = getHighestPriorityLevel(riskTypes);

  if (level === 'absolute_contraindication') {
    return 'absolute_contraindication';
  }
  if (level === 'needs_materials') {
    return 'materials_needed';
  }
  return 'proceed';
}
