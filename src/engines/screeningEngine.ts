import type {
  Question,
  ScreeningAnswer,
  RiskFlagType,
  RiskFlag,
  ScreeningConclusion,
  MaterialRequirement,
  ConclusionResult,
} from '@/types';
import { RISK_RULES, getHighestPriorityLevel } from '@/data/riskRules';
import { MATERIAL_TYPE_LABELS } from '@/types';

export function flattenQuestions(questions: Question[]): Question[] {
  const result: Question[] = [];
  const traverse = (qList: Question[]): void => {
    for (const q of qList) {
      result.push(q);
      if (q.options) {
        for (const opt of q.options) {
          if (opt.subQuestions && opt.subQuestions.length > 0) {
            traverse(opt.subQuestions);
          }
        }
      }
    }
  };
  traverse(questions);
  return result;
}

export interface AnswerMap {
  [questionId: string]: boolean | string;
}

const buildAnswerMap = (answers: ScreeningAnswer[]): AnswerMap => {
  const map: AnswerMap = {};
  for (const a of answers) {
    map[a.questionId] = a.answer;
    if (a.subAnswers) {
      for (const [k, v] of Object.entries(a.subAnswers)) {
        map[k] = v;
      }
    }
  }
  return map;
};

export function collectTriggeredRisks(
  answers: ScreeningAnswer[],
  questions: Question[],
): RiskFlagType[] {
  const answerMap = buildAnswerMap(answers);
  const triggered = new Set<RiskFlagType>();
  const flat = flattenQuestions(questions);

  for (const q of flat) {
    if (!q.options) continue;
    const userAnswer = answerMap[q.id];
    if (userAnswer === undefined) continue;

    for (const opt of q.options) {
      const match =
        typeof userAnswer === 'boolean'
          ? opt.value === userAnswer
          : String(opt.value) === String(userAnswer);
      if (match && opt.triggersRisk) {
        triggered.add(opt.triggersRisk);
      }
    }
  }

  return Array.from(triggered);
}

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export interface ScreeningResult {
  riskFlags: RiskFlag[];
  conclusion: ScreeningConclusion;
}

const buildMaterialsRequired = (
  riskTypes: RiskFlagType[],
  isEnhanced: boolean,
): MaterialRequirement[] => {
  const materialsMap = new Map<string, MaterialRequirement>();
  for (const type of riskTypes) {
    const rule = RISK_RULES[type];
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
};

export function generateScreeningResult(
  orderId: string,
  risks: RiskFlagType[],
  isEnhanced: boolean,
): ScreeningResult {
  const now = new Date();

  const riskFlags: RiskFlag[] = risks.map((type) => {
    const rule = RISK_RULES[type];
    return {
      id: generateUUID(),
      orderId,
      type,
      level: rule.level,
      description: rule.description,
      confirmed: false,
      createdAt: formatDateTime(now),
    };
  });

  const level = getHighestPriorityLevel(risks);
  let result: ConclusionResult;
  if (level === 'absolute_contraindication') {
    result = 'absolute_contraindication';
  } else if (level === 'needs_materials') {
    result = 'materials_needed';
  } else {
    result = 'proceed';
  }

  const hasAbsolute = risks.some((t) => RISK_RULES[t].level === 'absolute_contraindication');
  const reasonSummary = hasAbsolute
    ? '存在绝对禁忌风险，建议退回开单医生'
    : level === 'needs_materials'
      ? '存在需要评估的风险，需补充材料后复核'
      : '未发现明显禁忌，可安排预约';

  const materialsRequired = buildMaterialsRequired(risks, isEnhanced);

  const conclusion: ScreeningConclusion = {
    orderId,
    result,
    reasonSummary,
    riskFlags: riskFlags.map((r) => r.id),
    materialsRequired: materialsRequired.length > 0 ? materialsRequired : undefined,
    preliminaryAt: formatDateTime(now),
  };

  return { riskFlags, conclusion };
}
