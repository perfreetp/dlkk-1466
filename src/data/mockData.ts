import type {
  Patient,
  ExaminationOrder,
  RiskFlag,
  ScreeningConclusion,
  FollowUpItem,
  MRIMachine,
  MRISlot,
  Appointment,
  RejectionRecord,
  ReverifyRecord,
  User,
  RejectionReasonTemplate,
  MaterialRequirement,
  BodyPart,
  OrderStatus,
  RiskFlagType,
  RiskLevel,
  ConclusionResult,
  CallbackStatus,
  UserRole,
} from '@/types';
import { RISK_RULES, getHighestPriorityLevel } from '@/data/riskRules';
import { STANDARD_SCRIPTS } from '@/data/scripts';
import { MATERIAL_TYPE_LABELS } from '@/types';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const patients: Patient[] = [
  {
    id: 'P001',
    name: '张伟明',
    gender: 'male',
    age: 68,
    phone: '13800138001',
    medicalRecordNo: 'MR20240001',
    idCardNo: '310101195601011234',
    orderingDepartment: '神经内科',
    orderingDoctor: '李明华',
    createdAt: formatDateTime(addDays(new Date(), -5)),
  },
  {
    id: 'P002',
    name: '李秀英',
    gender: 'female',
    age: 54,
    phone: '13800138002',
    medicalRecordNo: 'MR20240002',
    idCardNo: '310101197005052345',
    orderingDepartment: '骨科',
    orderingDoctor: '王建国',
    createdAt: formatDateTime(addDays(new Date(), -4)),
  },
  {
    id: 'P003',
    name: '王芳',
    gender: 'female',
    age: 32,
    phone: '13800138003',
    medicalRecordNo: 'MR20240003',
    idCardNo: '310101199203153456',
    orderingDepartment: '妇产科',
    orderingDoctor: '陈雅婷',
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'P004',
    name: '刘强',
    gender: 'male',
    age: 45,
    phone: '13800138004',
    medicalRecordNo: 'MR20240004',
    idCardNo: '310101197908204567',
    orderingDepartment: '心血管内科',
    orderingDoctor: '赵志强',
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'P005',
    name: '陈美玲',
    gender: 'female',
    age: 28,
    phone: '13800138005',
    medicalRecordNo: 'MR20240005',
    idCardNo: '310101199606125678',
    orderingDepartment: '乳腺外科',
    orderingDoctor: '孙丽娟',
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'P006',
    name: '赵国栋',
    gender: 'male',
    age: 72,
    phone: '13800138006',
    medicalRecordNo: 'MR20240006',
    idCardNo: '310101195211086789',
    orderingDepartment: '神经外科',
    orderingDoctor: '周文博',
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'P007',
    name: '黄晓燕',
    gender: 'female',
    age: 41,
    phone: '13800138007',
    medicalRecordNo: 'MR20240007',
    idCardNo: '310101198304227890',
    orderingDepartment: '消化内科',
    orderingDoctor: '吴海涛',
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'P008',
    name: '孙浩然',
    gender: 'male',
    age: 19,
    phone: '13800138008',
    medicalRecordNo: 'MR20240008',
    idCardNo: '310101200507188901',
    orderingDepartment: '运动医学科',
    orderingDoctor: '郑凯文',
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'P009',
    name: '周雪梅',
    gender: 'female',
    age: 61,
    phone: '13800138009',
    medicalRecordNo: 'MR20240009',
    idCardNo: '310101196309259012',
    orderingDepartment: '内分泌科',
    orderingDoctor: '林雪琴',
    createdAt: formatDateTime(new Date()),
  },
  {
    id: 'P010',
    name: '吴建华',
    gender: 'male',
    age: 56,
    phone: '13800138010',
    medicalRecordNo: 'MR20240010',
    idCardNo: '310101196812300123',
    orderingDepartment: '泌尿外科',
    orderingDoctor: '何志远',
    createdAt: formatDateTime(new Date()),
  },
];

const bodyParts: BodyPart[] = [
  'brain',
  'spine_cervical',
  'spine_lumbar',
  'chest',
  'abdomen',
  'pelvis',
  'knee',
  'shoulder',
  'cardiac',
  'mammary',
  'neck',
];

const clinicalDiagnoses: Record<BodyPart, string[]> = {
  brain: ['头痛查因', '脑梗塞随访', '颅内占位性病变', '头晕待查', '癫痫评估'],
  spine_cervical: ['颈椎病', '颈椎间盘突出', '颈肩痛查因', '颈椎管狭窄'],
  spine_lumbar: ['腰椎间盘突出', '腰椎管狭窄', '腰痛查因', '腰椎滑脱'],
  chest: ['肺部结节随访', '纵隔占位', '胸痛查因', '肺癌术前评估'],
  abdomen: ['腹痛查因', '肝脏占位', '胰腺病变', '胆道疾病'],
  pelvis: ['盆腔肿物', '前列腺增生', '子宫肌瘤', '卵巢囊肿'],
  knee: ['膝关节疼痛', '半月板损伤', '交叉韧带损伤', '膝关节积液'],
  shoulder: ['肩袖损伤', '肩关节疼痛', '肩周炎', '肩关节不稳'],
  cardiac: ['心肌病变', '冠心病评估', '心脏功能检查', '心包积液'],
  mammary: ['乳腺结节', '乳腺癌筛查', '乳房胀痛查因', '乳腺增生随访'],
  neck: ['颈部肿物', '甲状腺结节', '颈椎病(颈部)', '颈部淋巴结肿大'],
};

const orderStatuses: OrderStatus[] = [
  'pending_screening',
  'screening_done',
  'review_pending',
  'review_done',
  'scheduling_pending',
  'scheduled',
  'reverify_pending',
  'completed',
  'rejected',
];

export const examinationOrders: ExaminationOrder[] = [
  {
    id: 'ORD001',
    patientId: 'P001',
    bodyPart: 'brain',
    isEnhanced: true,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.brain[1],
    status: 'screening_done',
    createdAt: formatDateTime(addDays(new Date(), -5)),
  },
  {
    id: 'ORD002',
    patientId: 'P002',
    bodyPart: 'spine_lumbar',
    isEnhanced: false,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.spine_lumbar[0],
    status: 'scheduled',
    createdAt: formatDateTime(addDays(new Date(), -4)),
  },
  {
    id: 'ORD003',
    patientId: 'P003',
    bodyPart: 'pelvis',
    isEnhanced: false,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.pelvis[2],
    status: 'pending_screening',
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'ORD004',
    patientId: 'P004',
    bodyPart: 'cardiac',
    isEnhanced: true,
    isUrgent: true,
    clinicalDiagnosis: clinicalDiagnoses.cardiac[1],
    status: 'rejected',
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'ORD005',
    patientId: 'P005',
    bodyPart: 'mammary',
    isEnhanced: true,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.mammary[0],
    status: 'review_pending',
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'ORD006',
    patientId: 'P006',
    bodyPart: 'brain',
    isEnhanced: true,
    isUrgent: true,
    clinicalDiagnosis: clinicalDiagnoses.brain[2],
    status: 'rejected',
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'ORD007',
    patientId: 'P007',
    bodyPart: 'abdomen',
    isEnhanced: true,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.abdomen[1],
    status: 'scheduling_pending',
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'ORD008',
    patientId: 'P008',
    bodyPart: 'knee',
    isEnhanced: false,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.knee[1],
    status: 'reverify_pending',
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'ORD009',
    patientId: 'P009',
    bodyPart: 'neck',
    isEnhanced: true,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.neck[1],
    status: 'completed',
    createdAt: formatDateTime(new Date()),
  },
  {
    id: 'ORD010',
    patientId: 'P010',
    bodyPart: 'pelvis',
    isEnhanced: true,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.pelvis[1],
    status: 'screening_done',
    createdAt: formatDateTime(new Date()),
  },
  {
    id: 'ORD011',
    patientId: 'P001',
    bodyPart: 'spine_cervical',
    isEnhanced: false,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.spine_cervical[0],
    status: 'review_done',
    createdAt: formatDateTime(addDays(new Date(), -5)),
  },
  {
    id: 'ORD012',
    patientId: 'P002',
    bodyPart: 'shoulder',
    isEnhanced: false,
    isUrgent: false,
    clinicalDiagnosis: clinicalDiagnoses.shoulder[0],
    status: 'scheduled',
    createdAt: formatDateTime(addDays(new Date(), -4)),
  },
];

export const riskFlags: RiskFlag[] = [
  {
    id: 'RF001',
    orderId: 'ORD001',
    type: 'renal_insufficiency',
    level: 'needs_materials',
    description: '慢性肾病史，eGFR约45mL/min/1.73m²',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -5)),
  },
  {
    id: 'RF002',
    orderId: 'ORD002',
    type: 'metal_foreign_body',
    level: 'needs_materials',
    description: 'L4-L5腰椎内固定术后3年',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -4)),
  },
  {
    id: 'RF003',
    orderId: 'ORD003',
    type: 'pregnancy',
    level: 'needs_materials',
    description: '孕14周，需确认临床必要性',
    confirmed: false,
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'RF004',
    orderId: 'ORD004',
    type: 'pacemaker',
    level: 'absolute_contraindication',
    description: '2021年植入双腔心脏起搏器',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'RF005',
    orderId: 'ORD005',
    type: 'claustrophobia',
    level: 'follow_up',
    description: '有幽闭恐惧史，曾无法完成CT检查',
    confirmed: false,
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'RF006',
    orderId: 'ORD005',
    type: 'iodine_allergy',
    level: 'needs_materials',
    description: '2020年增强CT后出现荨麻疹',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'RF007',
    orderId: 'ORD006',
    type: 'aneurysm_clip',
    level: 'needs_materials',
    description: '2018年前交通动脉瘤夹闭术',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'RF008',
    orderId: 'ORD006',
    type: 'cochlear_implant',
    level: 'absolute_contraindication',
    description: '左耳人工耳蜗植入2019年',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'RF009',
    orderId: 'ORD007',
    type: 'recent_surgery',
    level: 'follow_up',
    description: '胆囊切除术45天前',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'RF010',
    orderId: 'ORD008',
    type: 'metal_foreign_body',
    level: 'needs_materials',
    description: '左膝前交叉韧带重建，钛合金钢板',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'RF011',
    orderId: 'ORD008',
    type: 'claustrophobia',
    level: 'follow_up',
    description: '轻度幽闭恐惧，可尝试家属陪同',
    confirmed: false,
    createdAt: formatDateTime(addDays(new Date(), -1)),
  },
  {
    id: 'RF012',
    orderId: 'ORD009',
    type: 'metal_foreign_body',
    level: 'needs_materials',
    description: '口腔内种植牙3颗(上颚)',
    confirmed: true,
    createdAt: formatDateTime(new Date()),
  },
  {
    id: 'RF013',
    orderId: 'ORD010',
    type: 'renal_insufficiency',
    level: 'needs_materials',
    description: '前列腺增生伴肾功能轻度异常',
    confirmed: true,
    createdAt: formatDateTime(new Date()),
  },
  {
    id: 'RF014',
    orderId: 'ORD011',
    type: 'metal_foreign_body',
    level: 'needs_materials',
    description: '颈椎前路钢板内固定',
    confirmed: true,
    createdAt: formatDateTime(addDays(new Date(), -5)),
  },
];

const buildMaterialsRequired = (riskTypes: RiskFlagType[], isEnhanced: boolean): MaterialRequirement[] => {
  const materialsMap = new Map<string, MaterialRequirement>();
  for (const type of riskTypes) {
    const rule = RISK_RULES[type];
    if (rule.requiresMaterials) {
      for (const mat of rule.requiresMaterials) {
        if (!materialsMap.has(mat)) {
          materialsMap.set(mat, {
            type: mat,
            label: MATERIAL_TYPE_LABELS[mat],
            uploaded: Math.random() > 0.4,
          });
        }
      }
    }
  }
  if (isEnhanced && !materialsMap.has('renal_report')) {
    materialsMap.set('renal_report', {
      type: 'renal_report',
      label: MATERIAL_TYPE_LABELS.renal_report,
      uploaded: Math.random() > 0.3,
    });
  }
  return Array.from(materialsMap.values());
};

const buildConclusionFromOrder = (order: ExaminationOrder): ScreeningConclusion | undefined => {
  const orderRisks = riskFlags.filter((r) => r.orderId === order.id);
  const riskTypes = orderRisks.map((r) => r.type);
  const level = getHighestPriorityLevel(riskTypes);
  let result: ConclusionResult;
  if (level === 'absolute_contraindication') {
    result = 'absolute_contraindication';
  } else if (level === 'needs_materials') {
    result = 'materials_needed';
  } else {
    result = 'proceed';
  }

  if (order.status === 'rejected') {
    result = 'rejected';
  }

  if (order.status === 'pending_screening') return undefined;

  const hasAbsolute = riskTypes.some((t) => RISK_RULES[t].level === 'absolute_contraindication');
  const reasonSummary = hasAbsolute
    ? '存在绝对禁忌风险，建议退回开单医生'
    : level === 'needs_materials'
      ? '存在需要评估的风险，需补充材料后复核'
      : '未发现明显禁忌，可安排预约';

  const materials = buildMaterialsRequired(riskTypes, order.isEnhanced);
  const allUploaded = materials.every((m) => m.uploaded);

  const conclusion: ScreeningConclusion = {
    orderId: order.id,
    result,
    reasonSummary,
    riskFlags: orderRisks.map((r) => r.id),
    materialsRequired: materials.length > 0 ? materials : undefined,
    preliminaryAt: formatDateTime(addDays(new Date(), -1)),
  };

  if (['review_done', 'scheduling_pending', 'scheduled', 'reverify_pending', 'completed'].includes(order.status)) {
    conclusion.reviewedAt = formatDateTime(new Date());
    conclusion.reviewedBy = 'U002';
    conclusion.finalResult = allUploaded ? 'proceed' : 'materials_needed';
    if (hasAbsolute || result === 'rejected') {
      conclusion.finalResult = result;
    }
  }

  return conclusion;
};

export const screeningConclusions: ScreeningConclusion[] = examinationOrders
  .map(buildConclusionFromOrder)
  .filter((c): c is ScreeningConclusion => c !== undefined);

const buildFollowUpItems = (orderId: string, flags: RiskFlag[]): FollowUpItem[] => {
  const items: FollowUpItem[] = [];
  for (const flag of flags) {
    const scripts = Object.values(STANDARD_SCRIPTS).filter((s) => s.riskType === flag.type);
    if (scripts.length > 0) {
      const script = scripts[0];
      items.push({
        id: generateUUID(),
        orderId,
        question: script.question,
        standardScript: script.script,
        riskType: flag.type,
        completed: Math.random() > 0.5,
        answer: Math.random() > 0.5 ? '已与患者电话确认，患者表示理解并配合' : undefined,
        completedAt: Math.random() > 0.5 ? formatDateTime(new Date()) : undefined,
        completedBy: Math.random() > 0.5 ? 'U002' : undefined,
      });
    }
  }
  if (items.length === 0 && Math.random() > 0.6) {
    const general = Object.values(STANDARD_SCRIPTS).filter((s) => s.riskType === 'general');
    if (general.length > 0) {
      items.push({
        id: generateUUID(),
        orderId,
        question: general[0].question,
        standardScript: general[0].script,
        riskType: 'general',
        completed: true,
        completedAt: formatDateTime(new Date()),
        completedBy: 'U002',
      });
    }
  }
  return items;
};

export const followUpItems: FollowUpItem[] = examinationOrders.flatMap((order) => {
  const flags = riskFlags.filter((r) => r.orderId === order.id);
  return buildFollowUpItems(order.id, flags);
});

export const mriMachines: MRIMachine[] = [
  {
    id: 'MRI001',
    name: 'GE Signa Pioneer 3.0T',
    model: '超导型3.0T',
    roomNo: 'MRI-1号机房',
    supportedCoils: ['头线圈', '脊柱线圈', '体部线圈', '膝关节线圈', '肩关节线圈', '心脏线圈', '乳腺线圈', '颈部线圈'],
    supportsEnhanced: true,
  },
  {
    id: 'MRI002',
    name: 'Siemens MAGNETOM Aera 1.5T',
    model: '超导型1.5T',
    roomNo: 'MRI-2号机房',
    supportedCoils: ['头线圈', '脊柱线圈', '体部线圈', '膝关节线圈', '肩关节线圈', '乳腺线圈', '颈部线圈'],
    supportsEnhanced: true,
  },
  {
    id: 'MRI003',
    name: 'Hitachi AIRIS II 0.3T',
    model: '开放式永磁0.3T',
    roomNo: 'MRI-3号机房',
    supportedCoils: ['头线圈', '脊柱线圈', '体部线圈', '膝关节线圈', '肩关节线圈'],
    supportsEnhanced: false,
  },
];

const coilMap: Record<BodyPart, string[]> = {
  brain: ['头线圈'],
  spine_cervical: ['脊柱线圈', '颈部线圈'],
  spine_lumbar: ['脊柱线圈'],
  chest: ['体部线圈'],
  abdomen: ['体部线圈'],
  pelvis: ['体部线圈'],
  knee: ['膝关节线圈'],
  shoulder: ['肩关节线圈'],
  cardiac: ['心脏线圈', '体部线圈'],
  mammary: ['乳腺线圈', '体部线圈'],
  neck: ['颈部线圈', '脊柱线圈'],
};

const generateSlots = (): MRISlot[] => {
  const slots: MRISlot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 0; day < 7; day++) {
    const date = addDays(today, day);
    const dateStr = formatDate(date);

    for (const machine of mriMachines) {
      for (let hour = 8; hour < 18; hour++) {
        const startHour = hour.toString().padStart(2, '0');
        const endHour = (hour + 1).toString().padStart(2, '0');

        let compatibleParts: BodyPart[] = [];
        for (const coil of machine.supportedCoils) {
          for (const [part, coils] of Object.entries(coilMap)) {
            if (coils.includes(coil)) {
              if (!compatibleParts.includes(part as BodyPart)) {
                compatibleParts.push(part as BodyPart);
              }
            }
          }
        }

        const coilType = machine.supportedCoils[Math.floor(Math.random() * machine.supportedCoils.length)];
        const isAvailable = Math.random() < 0.6;

        slots.push({
          id: `SLOT-${dateStr}-${machine.id}-${startHour}`,
          date: dateStr,
          startTime: `${startHour}:00`,
          endTime: `${endHour}:00`,
          machineId: machine.id,
          machineName: machine.name,
          coilType,
          supportsEnhanced: machine.supportsEnhanced,
          isAvailable,
        });
      }
    }
  }
  return slots;
};

export const mriSlots: MRISlot[] = generateSlots();

const scheduledOrders = examinationOrders.filter((o) => ['scheduled', 'reverify_pending', 'completed'].includes(o.status));

export const appointments: Appointment[] = scheduledOrders.map((order, index) => {
  const availableSlots = mriSlots.filter(
    (s) => !s.isAvailable && (order.isEnhanced ? s.supportsEnhanced === true : true),
  );
  const slot = availableSlots[index % Math.max(availableSlots.length, 1)] || mriSlots.find((s) => !s.isAvailable)!;
  slot.isAvailable = false;
  slot.bookedOrderId = order.id;
  slot.bookedBy = 'U001';

  return {
    id: `APT${(index + 1).toString().padStart(3, '0')}`,
    orderId: order.id,
    slotId: slot.id,
    patientId: order.patientId,
    appointmentNo: `MRI${formatDate(new Date()).replace(/-/g, '')}${(index + 1).toString().padStart(4, '0')}`,
    confirmedAt: formatDateTime(addDays(new Date(), -1)),
    confirmedBy: 'U001',
    status: order.status === 'completed' ? 'completed' : order.status === 'reverify_pending' ? 'confirmed' : 'confirmed',
    reverifyStatus: order.status === 'reverify_pending' ? 'pending' : order.status === 'completed' ? 'passed' : undefined,
    reverifyAt: order.status === 'completed' ? formatDateTime(new Date()) : undefined,
  };
});

export const rejectionRecords: RejectionRecord[] = [
  {
    id: 'REJ001',
    orderId: 'ORD004',
    reasonCode: 'ABS_PACEMAKER',
    reasonText: '植入心脏起搏器，为MRI绝对禁忌',
    additionalNote: '患者2021年植入双腔起搏器，型号Medtronic，建议改用CT检查',
    rejectedBy: 'U003',
    rejectedAt: formatDateTime(addDays(new Date(), -3)),
    callbackStatus: 'replied',
    doctorReply: '已知晓，改为冠脉CTA检查',
    repliedAt: formatDateTime(addDays(new Date(), -2)),
  },
  {
    id: 'REJ002',
    orderId: 'ORD006',
    reasonCode: 'ABS_COCHLEAR',
    reasonText: '人工耳蜗植入，为MRI绝对禁忌',
    additionalNote: '患者左耳有人工耳蜗，同时有颅内动脉瘤夹，建议神经外科会诊后决定',
    rejectedBy: 'U003',
    rejectedAt: formatDateTime(addDays(new Date(), -2)),
    callbackStatus: 'sent',
  },
  {
    id: 'REJ003',
    orderId: 'ORD001',
    reasonCode: 'MAT_NO_RENAL',
    reasonText: '增强扫描缺少近一周肾功能报告',
    additionalNote: '患者有慢性肾病史，eGFR未达标前不能做增强扫描，请先抽血查肾功能',
    rejectedBy: 'U002',
    rejectedAt: formatDateTime(addDays(new Date(), -4)),
    callbackStatus: 'replied',
    doctorReply: '已开肾功能检查，待结果回报后重新申请',
    repliedAt: formatDateTime(addDays(new Date(), -3)),
  },
  {
    id: 'REJ004',
    orderId: 'ORD005',
    reasonCode: 'MAT_NO_IMPLANT_CARD',
    reasonText: '缺少植入物型号卡/手术记录',
    additionalNote: '患者有金属植入物史但无法提供型号卡，需补充资料后再评估兼容性',
    rejectedBy: 'U002',
    rejectedAt: formatDateTime(addDays(new Date(), -1)),
    callbackStatus: 'pending',
  },
  {
    id: 'REJ005',
    orderId: 'ORD007',
    reasonCode: 'CLINICAL_INCOMPATIBLE',
    reasonText: '临床情况不稳定，建议暂缓检查',
    additionalNote: '患者近期术后仍有发热，WBC升高，建议感染控制后再行检查',
    rejectedBy: 'U003',
    rejectedAt: formatDateTime(new Date()),
    callbackStatus: 'sent',
  },
  {
    id: 'REJ006',
    orderId: 'ORD010',
    reasonCode: 'MAT_NO_ALLERGY',
    reasonText: '缺少碘过敏史详细记录',
    additionalNote: '患者诉有碘过敏但无法提供具体表现记录，需补充过敏史详情',
    rejectedBy: 'U002',
    rejectedAt: formatDateTime(addDays(new Date(), -1)),
    callbackStatus: 'pending',
  },
];

const completedAppointments = appointments.filter((a) => a.status === 'completed');
export const reverifyRecords: ReverifyRecord[] = completedAppointments
  .slice(0, 2)
  .map((apt, idx) => ({
    id: `REV${(idx + 1).toString().padStart(3, '0')}`,
    appointmentId: apt.id,
    orderId: apt.orderId,
    recentSurgery: idx === 0,
    recentSurgeryDetail: idx === 0 ? '无新增手术' : undefined,
    newImplants: false,
    fastingConfirmed: true,
    fastingDetail: '患者已确认禁食6小时、禁水2小时',
    passed: true,
    verifiedBy: 'U002',
    verifiedAt: formatDateTime(new Date()),
  }));

export const users: User[] = [
  {
    id: 'U001',
    employeeId: 'EMP2023001',
    name: '张晓雯',
    role: 'booking_staff',
    department: '影像科预约中心',
  },
  {
    id: 'U002',
    employeeId: 'EMP2022015',
    name: '李雪梅',
    role: 'nurse',
    department: '影像科护理组',
  },
  {
    id: 'U003',
    employeeId: 'EMP2020008',
    name: '王志远',
    role: 'admin',
    department: '影像科主任办公室',
  },
];

export const rejectionReasonTemplates: RejectionReasonTemplate[] = [
  { code: 'ABS_PACEMAKER', label: '心脏起搏器（绝对禁忌）', category: 'absolute' },
  { code: 'ABS_COCHLEAR', label: '人工耳蜗（绝对禁忌）', category: 'absolute' },
  { code: 'ABS_INCOMPATIBLE_CLIP', label: '动脉瘤夹型号不兼容（绝对禁忌）', category: 'absolute' },
  { code: 'ABS_EYE_METAL', label: '眼内金属异物（绝对禁忌）', category: 'absolute' },
  { code: 'MAT_NO_IMPLANT_CARD', label: '缺少植入物型号卡/手术记录', category: 'material' },
  { code: 'MAT_NO_RENAL', label: '缺少近一周肾功能报告（增强）', category: 'material' },
  { code: 'MAT_NO_PREGNANCY_TEST', label: '缺少妊娠试验报告', category: 'material' },
  { code: 'MAT_NO_ALLERGY', label: '缺少碘过敏史详细记录', category: 'material' },
  { code: 'MAT_NO_SURGICAL_RECORD', label: '缺少近期手术记录', category: 'material' },
  { code: 'CLINICAL_UNSTABLE', label: '临床情况不稳定，建议暂缓', category: 'clinical' },
  { code: 'CLINICAL_INCOMPATIBLE', label: '临床指征与检查方式不匹配', category: 'clinical' },
  { code: 'CLINICAL_PATIENT_REFUSED', label: '患者/家属拒绝检查', category: 'clinical' },
];

export { generateUUID, formatDate, formatDateTime, addDays };

export const DEMO_USERS = users;
export const MOCK_PATIENTS = patients;
export const MOCK_ORDERS = examinationOrders;
export const MOCK_MACHINES = mriMachines;
export const MOCK_SLOTS = mriSlots;
