import type { RiskFlagType } from '@/types';

export interface ScriptEntry {
  riskType: RiskFlagType | 'general';
  question: string;
  script: string;
}

export const STANDARD_SCRIPTS: Record<string, ScriptEntry> = {
  pacemaker_confirm: {
    riskType: 'pacemaker',
    question: '确认心脏起搏器植入情况',
    script: '您好，为了您的安全，请您确认一下：您体内的心脏起搏器是何时植入的？您有植入物型号卡或相关手术记录吗？由于MRI的强磁场可能对心脏起搏器造成严重影响，我们需要进一步核实。如果确认有起搏器，我们会立即联系您的开单医生，为您安排其他合适的检查方式，请您放心。',
  },
  cochlear_implant_confirm: {
    riskType: 'cochlear_implant',
    question: '确认人工耳蜗植入情况',
    script: '您好，请问您的人工耳蜗是哪个品牌什么型号的？您是否有医院出具的植入物型号说明书？根据安全规范，人工耳蜗患者一般不能进行MRI检查，我需要将这个情况反馈给您的开单医生，请您稍等片刻。',
  },
  aneurysm_clip_materials: {
    riskType: 'aneurysm_clip',
    question: '要求提供动脉瘤夹型号卡',
    script: '您好，您之前做过颅内动脉瘤夹闭手术，为了确保MRI检查的安全性，需要麻烦您提供当时植入的动脉瘤夹的型号卡或手术记录复印件。不同型号的动脉瘤夹材质不同，有的可以安全做MRI，有的不可以。如果您手头没有相关资料，可以联系您当时做手术的医院病案室复印一份。',
  },
  metal_foreign_body_detail: {
    riskType: 'metal_foreign_body',
    question: '详细询问金属异物信息',
    script: '您好，您提到体内有金属植入物/异物，我需要和您确认几个问题：① 具体是什么部位有金属？② 是什么材质的（如钢板、螺钉、支架等）？③ 是什么时候植入的？④ 您是否有植入物型号卡或手术记录？请您尽量提供这些信息，我们的影像科医师会评估是否可以安全进行检查。',
  },
  pregnancy_confirm: {
    riskType: 'pregnancy',
    question: '确认孕周并评估临床必要性',
    script: '您好，请问您目前怀孕多少周了？我们常规建议妊娠前3个月避免进行MRI检查。请问您的开单医生知道您怀孕的情况吗？您是否有产科医生开具的同意做MRI的意见？我需要将您的情况告知开单医生，确认检查的必要性，请您理解。',
  },
  claustrophobia_assess: {
    riskType: 'claustrophobia',
    question: '评估幽闭恐惧严重程度',
    script: '您好，MRI检查空间相对狭小，您提到有幽闭恐惧的情况，我需要了解一下：您以前做过CT检查吗？狭小的电梯可以正常乘坐吗？如果情况比较严重，我们可以考虑以下方案：① 有家属陪同进机房；② 考虑使用镇静药物；③ 如果我们有开放式机型的话可以预约。您看哪种方式比较适合您？',
  },
  renal_confirm: {
    riskType: 'renal_insufficiency',
    question: '核实肾功能并告知风险',
    script: '您好，因为您这次需要做增强MRI，需要注射碘对比剂，而您有慢性肾病史/肾功能异常的情况。我需要看一下您最近一周内的肾功能（肌酐、eGFR）检查报告。如果eGFR小于30，是不能做增强的；如果在30-60之间，我们会给您制定水化方案，并请您签署相关的风险告知书。请您带来报告，方便我们评估。',
  },
  iodine_allergy_confirm: {
    riskType: 'iodine_allergy',
    question: '确认碘过敏史严重程度',
    script: '您好，您之前对碘造影剂有过过敏反应，我需要了解一下当时的具体情况：过敏反应是什么表现（如皮疹、呼吸困难、血压下降等）？发生在什么时候？当时是如何处理的？根据您的情况，轻度过敏我们可以术前预防用药，中重度过敏需要考虑改用非增强MRI或其他检查方式。',
  },
  recent_surgery_confirm: {
    riskType: 'recent_surgery',
    question: '核实近期手术详情',
    script: '您好，您近3个月内做过手术，我需要确认一下：① 手术的具体部位和类型是什么？② 手术日期是哪天？③ 伤口是否完全愈合？④ 体内是否留有手术缝合钉、钢板等金属物？如果有金属植入物，需要提供手术记录或型号卡以便评估。',
  },
  general_intro: {
    riskType: 'general',
    question: 'MRI检查前常规告知',
    script: '您好，在预约MRI检查之前，我需要向您确认几项重要事项，请您如实告知：① 体内是否有任何金属植入物（如起搏器、支架、钢板等）？② 是否有药物或碘过敏史？③ 女性患者是否怀孕？④ 近3个月是否做过手术？如果您有植入物型号卡或相关手术资料，请务必带来。这些信息关系到您检查的安全性，非常感谢您的配合。',
  },
  fasting_reminder: {
    riskType: 'general',
    question: '告知空腹与检查前准备',
    script: '您好，您预约的是【增强/腹部/盆腔】MRI检查，请您注意：① 检查前【6小时】开始禁食，检查前【2小时】禁水；② 如果您有糖尿病，请提前咨询开单医生是否需要调整降糖药物；③ 请携带近期的肾功能报告；④ 检查当天请穿无金属装饰的衣物，不要佩戴首饰、假牙等金属物品。如有疑问请随时联系我们。',
  },
  reverify_intro: {
    riskType: 'general',
    question: '检查前一天二次核验开场白',
    script: '您好，这里是【医院名称】影像科预约中心，明天您有一台MRI检查，预约时段为【XX:XX-XX:XX】。在检查前我们需要再次和您确认几个重要事项，大约需要2分钟时间，请问现在方便通话吗？',
  },
  reverify_recent_surgery: {
    riskType: 'recent_surgery',
    question: '二次核验-近期手术/新植入物',
    script: '想和您再次确认：距离上次登记后，您是否有接受新的手术或体内有新的植入物（包括牙科治疗、美容手术等）？如果有的话请务必告知，我们需要重新评估检查的安全性。',
  },
  reverify_fasting: {
    riskType: 'general',
    question: '二次核验-空腹要求确认',
    script: '再提醒您一下：您的检查需要【增强扫描/腹部扫描】，请从今晚【XX点】开始禁食，凌晨【XX点】开始禁水，明天检查前不要吃任何东西包括喝水，否则检查可能需要改期。请问这个安排您清楚了吗？',
  },
};

export function getScriptByKey(key: string): ScriptEntry | undefined {
  return STANDARD_SCRIPTS[key];
}

export function getScriptsForRisk(riskType: RiskFlagType): ScriptEntry[] {
  return Object.values(STANDARD_SCRIPTS).filter(s => s.riskType === riskType);
}
