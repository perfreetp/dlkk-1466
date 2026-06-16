import type { RiskFlagType, RiskLevel } from '@/types';

export interface RiskRule {
  type: RiskFlagType;
  level: RiskLevel;
  priority: number;
  requiresMaterials?: ('implant_card' | 'surgical_record' | 'renal_report' | 'allergy_record' | 'pregnancy_test' | 'other')[];
  description: string;
  recommendation: string;
}

export const RISK_RULES: Record<RiskFlagType, RiskRule> = {
  pacemaker: {
    type: 'pacemaker',
    level: 'absolute_contraindication',
    priority: 1,
    description: '心脏起搏器为MRI绝对禁忌，强磁场可导致起搏器移位、热损伤或程序异常',
    recommendation: '立即退回开单医生，建议改用CT或其他检查方式',
  },
  cochlear_implant: {
    type: 'cochlear_implant',
    level: 'absolute_contraindication',
    priority: 2,
    description: '人工耳蜗含磁铁及电子元件，MRI检查可造成装置移位和患者受伤',
    recommendation: '绝对禁忌，退回开单医生，咨询耳鼻喉科意见',
  },
  aneurysm_clip: {
    type: 'aneurysm_clip',
    level: 'needs_materials',
    priority: 3,
    requiresMaterials: ['implant_card', 'surgical_record'],
    description: '颅内动脉瘤夹需确认型号是否为MRI兼容，非兼容型号为绝对禁忌',
    recommendation: '要求患者提供植入物型号卡或手术记录，送影像科医师评估兼容性',
  },
  metal_foreign_body: {
    type: 'metal_foreign_body',
    level: 'needs_materials',
    priority: 4,
    requiresMaterials: ['implant_card', 'surgical_record'],
    description: '体内金属异物需确认材质、位置和植入时间，非铁磁性材料通常可检查',
    recommendation: '收集植入物型号卡或手术记录，评估金属材质MRI兼容性',
  },
  pregnancy: {
    type: 'pregnancy',
    level: 'needs_materials',
    priority: 5,
    requiresMaterials: ['pregnancy_test'],
    description: '妊娠期MRI需严格评估临床必要性，妊娠前3个月原则上不建议检查',
    recommendation: '确认孕周，获取产科医生同意书，非增强扫描需签署知情同意',
  },
  claustrophobia: {
    type: 'claustrophobia',
    level: 'follow_up',
    priority: 6,
    description: '幽闭恐惧症患者可能无法完成MRI检查，需评估严重程度',
    recommendation: '评估焦虑程度，可考虑镇静或使用开放式机型，必要时临床陪同',
  },
  renal_insufficiency: {
    type: 'renal_insufficiency',
    level: 'needs_materials',
    priority: 7,
    requiresMaterials: ['renal_report'],
    description: '肾功能不全患者使用碘对比剂有发生肾源性系统性纤维化(NSF)风险',
    recommendation: 'eGFR<30禁用增强，30-60需水化方案并签署风险告知书，检查后48小时复查肾功能',
  },
  iodine_allergy: {
    type: 'iodine_allergy',
    level: 'needs_materials',
    priority: 8,
    requiresMaterials: ['allergy_record'],
    description: '碘对比剂过敏史需评估过敏严重程度，中重度过敏需考虑替代方案',
    recommendation: '收集既往过敏记录，轻度过敏可术前使用抗组胺药+激素预防，重度过敏禁用增强',
  },
  recent_surgery: {
    type: 'recent_surgery',
    level: 'follow_up',
    priority: 9,
    requiresMaterials: ['surgical_record'],
    description: '近期手术需确认手术部位、是否有残留金属物及伤口愈合情况',
    recommendation: '确认手术记录，手术部位需完全愈合，排除残留金属异物风险',
  },
  other: {
    type: 'other',
    level: 'follow_up',
    priority: 10,
    description: '其他未明确列出的风险因素，需人工评估',
    recommendation: '记录具体情况，提交影像科医师综合评估',
  },
};

export function getRiskRule(type: RiskFlagType): RiskRule {
  return RISK_RULES[type];
}

export function getHighestPriorityLevel(risks: RiskFlagType[]): RiskLevel {
  if (risks.length === 0) return 'follow_up';
  let highest: RiskLevel = 'follow_up';
  for (const r of risks) {
    const rule = RISK_RULES[r];
    if (rule.level === 'absolute_contraindication') return 'absolute_contraindication';
    if (rule.level === 'needs_materials') highest = 'needs_materials';
  }
  return highest;
}
