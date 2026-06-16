import type { FollowUpItem, RiskFlag, ScreeningConclusion } from '@/types';
import { getScriptsForRisk } from '@/data/scripts';
import { getRiskRule } from '@/data/riskRules';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateFollowUpTasks(
  orderId: string,
  riskFlags: RiskFlag[],
  conclusion: ScreeningConclusion | null,
): FollowUpItem[] {
  const items: FollowUpItem[] = [];

  items.push({
    id: uuid(),
    orderId,
    question: '核对患者基本信息与申请单一致性',
    standardScript: '您好，请核对一下您的姓名、性别、年龄和检查部位是否正确。您的申请单上的病历号是XXX，对吗？',
    riskType: 'general',
    completed: false,
  });

  for (const risk of riskFlags) {
    const rule = getRiskRule(risk.type);
    const scripts = getScriptsForRisk(risk.type);

    if (scripts.length > 0) {
      for (const script of scripts) {
        items.push({
          id: uuid(),
          orderId,
          question: script.question,
          standardScript: script.script,
          riskType: risk.type,
          completed: false,
        });
      }
    } else {
      items.push({
        id: uuid(),
        orderId,
        question: `评估${rule.description}`,
        standardScript: rule.recommendation,
        riskType: risk.type,
        completed: false,
      });
    }
  }

  if (conclusion?.materialsRequired && conclusion.materialsRequired.length > 0) {
    for (const mat of conclusion.materialsRequired) {
      items.push({
        id: uuid(),
        orderId,
        question: `确认患者是否已提交${mat.label}`,
        standardScript: `您好，您的检查需要提供${mat.label}，请问您是否已经准备好了？如果还未准备，请在预约前提交相关材料。`,
        riskType: 'material',
        completed: mat.uploaded,
      });
    }
  }

  items.push({
    id: uuid(),
    orderId,
    question: '告知检查前注意事项与准备要求',
    standardScript: '您好，再提醒一下检查前的注意事项：请穿无金属装饰的衣物，不要佩戴首饰。增强/腹部/盆腔检查需要空腹6小时、禁水2小时。请按时到达影像科，如有问题请随时联系我们。',
    riskType: 'general',
    completed: false,
  });

  return items;
}
