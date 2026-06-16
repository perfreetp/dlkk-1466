import type { Question, BodyPart } from '@/types';

const baseQuestions: Question[] = [
  {
    id: 'has_pacemaker',
    title: '是否植入心脏起搏器？',
    description: '包括心脏节律器、除颤器(ICD)、心脏再同步治疗装置(CRT)',
    type: 'boolean',
    category: 'implant',
    options: [
      { value: true, label: '是', triggersRisk: 'pacemaker' },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'has_cochlear_implant',
    title: '是否有人工耳蜗植入？',
    type: 'boolean',
    category: 'implant',
    options: [
      { value: true, label: '是', triggersRisk: 'cochlear_implant' },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'has_aneurysm_clip',
    title: '颅内是否有动脉瘤夹？',
    description: '用于脑动脉瘤的金属夹闭装置',
    type: 'boolean',
    category: 'implant',
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'aneurysm_clip',
        subQuestions: [
          {
            id: 'clip_manufacturer',
            title: '请提供动脉瘤夹品牌和型号',
            type: 'text',
            category: 'implant',
          },
          {
            id: 'clip_surgery_date',
            title: '植入手术日期',
            type: 'text',
            category: 'implant',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'has_metal_foreign_body',
    title: '体内是否有金属异物或植入物？',
    description: '如钢板、螺钉、人工关节、血管支架、节育器、义眼、金属假牙等',
    type: 'boolean',
    category: 'implant',
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'metal_foreign_body',
        subQuestions: [
          {
            id: 'metal_location',
            title: '金属异物/植入物位于哪个部位？',
            type: 'text',
            category: 'implant',
          },
          {
            id: 'metal_type',
            title: '请描述植入物类型（如钢板、螺钉、支架等）',
            type: 'text',
            category: 'implant',
          },
          {
            id: 'metal_date',
            title: '植入/进入时间（年月）',
            type: 'text',
            category: 'implant',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'is_pregnant',
    title: '是否目前处于妊娠期？',
    description: '妊娠前3个月通常不建议进行MRI检查',
    type: 'boolean',
    category: 'pregnancy',
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'pregnancy',
        subQuestions: [
          {
            id: 'pregnancy_weeks',
            title: '目前孕周（周）',
            type: 'text',
            category: 'pregnancy',
          },
          {
            id: 'pregnancy_clinical_approval',
            title: '是否获得产科医生临床同意？',
            type: 'boolean',
            category: 'pregnancy',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'has_claustrophobia',
    title: '是否有幽闭恐惧症？',
    description: '在狭小空间内是否会感到严重焦虑或恐慌',
    type: 'boolean',
    category: 'psych',
    options: [
      { value: true, label: '是', triggersRisk: 'claustrophobia' },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'recent_surgery_3months',
    title: '近3个月内是否接受过任何手术？',
    type: 'boolean',
    category: 'surgery',
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'recent_surgery',
        subQuestions: [
          {
            id: 'surgery_type',
            title: '手术类型与部位',
            type: 'text',
            category: 'surgery',
          },
          {
            id: 'surgery_date',
            title: '手术日期',
            type: 'text',
            category: 'surgery',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'other_implants',
    title: '是否有上述未提及的其他电子或金属植入物？',
    description: '如胰岛素泵、神经刺激器、人工心脏瓣膜等',
    type: 'boolean',
    category: 'implant',
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'other',
        subQuestions: [
          {
            id: 'other_implant_desc',
            title: '请描述植入物名称、品牌、型号',
            type: 'text',
            category: 'implant',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
];

const enhancedQuestions: Question[] = [
  {
    id: 'renal_function_egfr',
    title: '近期肾功能eGFR数值 (mL/min/1.73m²)',
    description: '增强扫描需确认肾功能，eGFR<30为禁忌，30-60需评估',
    type: 'text',
    category: 'renal',
    isEnhancedOnly: true,
  },
  {
    id: 'renal_disease_history',
    title: '是否有慢性肾脏病史？',
    type: 'boolean',
    category: 'renal',
    isEnhancedOnly: true,
    options: [
      { value: true, label: '是', triggersRisk: 'renal_insufficiency' },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'iodine_allergy_history',
    title: '是否有碘对比剂过敏史？',
    description: '如荨麻疹、呼吸困难、血压下降等严重过敏反应',
    type: 'boolean',
    category: 'allergy',
    isEnhancedOnly: true,
    options: [
      {
        value: true,
        label: '是',
        triggersRisk: 'iodine_allergy',
        subQuestions: [
          {
            id: 'iodine_allergy_desc',
            title: '请描述过敏反应表现',
            type: 'text',
            category: 'allergy',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'other_allergy_history',
    title: '是否有其他药物或食物过敏史？',
    type: 'boolean',
    category: 'allergy',
    isEnhancedOnly: true,
    options: [
      {
        value: true,
        label: '是',
        subQuestions: [
          {
            id: 'other_allergy_desc',
            title: '请描述过敏原和反应',
            type: 'text',
            category: 'allergy',
          },
        ],
      },
      { value: false, label: '否' },
    ],
  },
  {
    id: 'thyroid_disease',
    title: '是否有甲状腺功能异常？',
    description: '碘对比剂可能影响甲状腺功能',
    type: 'boolean',
    category: 'renal',
    isEnhancedOnly: true,
  },
];

const bodyPartExtraQuestions: Record<BodyPart, Question[]> = {
  brain: [
    {
      id: 'brain_prior_surgery',
      title: '是否有颅脑手术史？',
      type: 'boolean',
      category: 'surgery',
    },
  ],
  spine_cervical: [
    {
      id: 'cervical_dental_metal',
      title: '口腔内是否有金属牙套、种植牙？',
      description: '颈椎MRI可能受口腔金属伪影影响',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
  spine_lumbar: [],
  chest: [
    {
      id: 'chest_heart_valve',
      title: '是否有人工心脏瓣膜？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
    {
      id: 'chest_vascular_stent',
      title: '是否有冠脉或大血管支架？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
  abdomen: [],
  pelvis: [
    {
      id: 'pelvis_iud',
      title: '是否有宫内节育器（IUD）？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
    {
      id: 'pelvis_hip_prosthesis',
      title: '是否有人工髋关节假体？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
  knee: [
    {
      id: 'knee_prosthesis',
      title: '是否有人工膝关节假体？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
  shoulder: [],
  cardiac: [
    {
      id: 'cardiac_stent',
      title: '是否有冠状动脉支架？植入时间？',
      type: 'text',
      category: 'implant',
    },
  ],
  mammary: [
    {
      id: 'mammary_implant',
      title: '是否有乳房假体植入？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
  neck: [
    {
      id: 'neck_dental',
      title: '口腔内是否有金属假牙、种植牙或正畸托槽？',
      type: 'boolean',
      category: 'implant',
      options: [
        { value: true, label: '是', triggersRisk: 'metal_foreign_body' },
        { value: false, label: '否' },
      ],
    },
  ],
};

export function getQuestionnaire(bodyPart: BodyPart, isEnhanced: boolean): Question[] {
  const questions: Question[] = [...baseQuestions];
  const extra = bodyPartExtraQuestions[bodyPart] || [];
  questions.push(...extra);
  if (isEnhanced) {
    questions.push(...enhancedQuestions);
  }
  return questions;
}
