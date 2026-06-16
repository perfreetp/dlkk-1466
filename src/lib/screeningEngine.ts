import type {
  ScreeningAnswer,
  Question,
  RiskFlag,
  ScreeningConclusion,
  RiskFlagType,
  ConclusionResult,
  MaterialRequirement,
  MaterialType,
} from '@/types';
import { MATERIAL_TYPE_LABELS, RISK_FLAG_LABELS } from '@/types';
import { RISK_RULES, getRiskRule, getHighestPriorityLevel } from '@/data/riskRules';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function collectTriggeredRisks(questions: Question[], answers: ScreeningAnswer[]): RiskFlagType[] {
  const risks: Set<RiskFlagType> = new Set();

  function checkQuestion(q: Question) {
    const ans = answers.find((a) => a.questionId === q.id);
    if (!ans) return;

    if (q.options) {
      for (const opt of q.options) {
        if (opt.value === ans.answer && opt.triggersRisk) {
          risks.add(opt.triggersRisk);
          if (opt.subQuestions) {
            for (const subQ of opt.subQuestions) {
              checkQuestion(subQ);
            }
          }
        }
      }
    }

    if (q.type === 'text' && q.category === 'renal' && q.id === 'renal_function_egfr') {
      const egfr = parseFloat(String(ans.answer));
      if (!isNaN(egfr) && egfr < 60) {
        risks.add('renal_insufficiency');
      }
    }
  }

  for (const q of questions) {
    checkQuestion(q);
  }

  return Array.from(risks);
}

export function runScreeningEngine(
  orderId: string,
  questions: Question[],
  answers: ScreeningAnswer[],
): { riskFlags: RiskFlag[]; conclusion: ScreeningConclusion } {
  const triggeredRisks = collectTriggeredRisks(questions, answers);

  const riskFlags: RiskFlag[] = triggeredRisks.map((type) => {
    const rule = getRiskRule(type);
    return {
      id: uuid(),
      orderId,
      type,
      level: rule.level,
      description: rule.description,
      confirmed: false,
      createdAt: new Date().toISOString(),
    };
  });

  const highestLevel = getHighestPriorityLevel(triggeredRisks);

  let result: ConclusionResult = 'proceed';
  let reasonSummary = '未发现明显风险因素，可继续预约流程';
  let materialsRequired: MaterialRequirement[] = [];

  if (highestLevel === 'absolute_contraindication') {
    result = 'absolute_contraindication';
    const absoluteRisks = riskFlags.filter((r) => r.level === 'absolute_contraindication');
    reasonSummary = `存在绝对禁忌：${absoluteRisks.map((r) => (RISK_FLAG_LABELS as any)[r.type]).join('、')}，不建议进行MRI检查`;
  } else if (highestLevel === 'needs_materials') {
    result = 'materials_needed';
    const materialRisks = triggeredRisks.filter(
      (r) => RISK_RULES[r]?.requiresMaterials && RISK_RULES[r].requiresMaterials!.length > 0,
    );
    const materialTypes: Set<MaterialType> = new Set();
    for (const r of materialRisks) {
      const rule = RISK_RULES[r];
      if (rule.requiresMaterials) {
        rule.requiresMaterials.forEach((m) => materialTypes.add(m as MaterialType));
      }
    }
    materialsRequired = Array.from(materialTypes).map((t) => ({
      type: t,
      label: (MATERIAL_TYPE_LABELS as any)[t] || t,
      uploaded: false,
    }));
    reasonSummary = `需补充材料：${materialsRequired.map((m) => m.label).join('、')}，材料齐全并复核通过后方可预约`;
  } else if (triggeredRisks.length > 0) {
    reasonSummary = `存在随访风险：${triggeredRisks.map((r) => (RISK_FLAG_LABELS as any)[r]).join('、')}，需人工随访确认`;
  }

  const conclusion: ScreeningConclusion = {
    orderId,
    result,
    reasonSummary,
    riskFlags: riskFlags.map((r) => r.id),
    materialsRequired: materialsRequired.length > 0 ? materialsRequired : undefined,
    preliminaryAt: new Date().toISOString(),
  };

  return { riskFlags, conclusion };
}
