export type BodyPart =
  | 'brain'
  | 'spine_cervical'
  | 'spine_lumbar'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'knee'
  | 'shoulder'
  | 'cardiac'
  | 'mammary'
  | 'neck';

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  brain: '颅脑',
  spine_cervical: '颈椎',
  spine_lumbar: '腰椎',
  chest: '胸部',
  abdomen: '腹部',
  pelvis: '盆腔',
  knee: '膝关节',
  shoulder: '肩关节',
  cardiac: '心脏',
  mammary: '乳腺',
  neck: '颈部',
};

export type OrderStatus =
  | 'pending_screening'
  | 'screening_done'
  | 'review_pending'
  | 'review_done'
  | 'scheduling_pending'
  | 'scheduled'
  | 'reverify_pending'
  | 'completed'
  | 'rejected';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_screening: '待筛查',
  screening_done: '筛查完成',
  review_pending: '待复核',
  review_done: '复核完成',
  scheduling_pending: '待排班',
  scheduled: '已预约',
  reverify_pending: '待二次核验',
  completed: '已完成',
  rejected: '已退回',
};

export type RiskFlagType =
  | 'pacemaker'
  | 'cochlear_implant'
  | 'aneurysm_clip'
  | 'metal_foreign_body'
  | 'pregnancy'
  | 'claustrophobia'
  | 'renal_insufficiency'
  | 'iodine_allergy'
  | 'recent_surgery'
  | 'other';

export const RISK_FLAG_LABELS: Record<RiskFlagType, string> = {
  pacemaker: '心脏起搏器',
  cochlear_implant: '人工耳蜗',
  aneurysm_clip: '动脉瘤夹',
  metal_foreign_body: '金属异物',
  pregnancy: '妊娠',
  claustrophobia: '幽闭恐惧',
  renal_insufficiency: '肾功能不全',
  iodine_allergy: '碘过敏史',
  recent_surgery: '近期手术',
  other: '其他风险',
};

export type RiskLevel = 'absolute_contraindication' | 'needs_materials' | 'follow_up';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  absolute_contraindication: '绝对禁忌',
  needs_materials: '需补材料',
  follow_up: '随访评估',
};

export type ConclusionResult =
  | 'absolute_contraindication'
  | 'materials_needed'
  | 'proceed'
  | 'rejected';

export const CONCLUSION_RESULT_LABELS: Record<ConclusionResult, string> = {
  absolute_contraindication: '绝对禁忌',
  materials_needed: '需补材料',
  proceed: '可继续预约',
  rejected: '已退回',
};

export type MaterialType =
  | 'implant_card'
  | 'surgical_record'
  | 'renal_report'
  | 'allergy_record'
  | 'pregnancy_test'
  | 'other';

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  implant_card: '植入物型号卡',
  surgical_record: '手术记录',
  renal_report: '肾功能报告',
  allergy_record: '过敏史记录',
  pregnancy_test: '妊娠试验报告',
  other: '其他材料',
};

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type ReverifyStatus = 'pending' | 'passed' | 'failed';
export type CallbackStatus = 'pending' | 'sent' | 'replied';
export type UserRole = 'booking_staff' | 'nurse' | 'admin';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  booking_staff: '预约中心',
  nurse: '门诊护士',
  admin: '科室管理员',
};

export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  phone: string;
  medicalRecordNo: string;
  idCardNo: string;
  orderingDepartment: string;
  orderingDoctor: string;
  createdAt: string;
}

export interface ExaminationOrder {
  id: string;
  patientId: string;
  bodyPart: BodyPart;
  isEnhanced: boolean;
  isUrgent: boolean;
  mriMachineRequired?: string;
  coilRequired?: string;
  clinicalDiagnosis: string;
  status: OrderStatus;
  createdAt: string;
}

export interface ScreeningAnswer {
  orderId: string;
  questionId: string;
  answer: boolean | string;
  subAnswers?: Record<string, boolean | string>;
  answeredAt: string;
}

export interface RiskFlag {
  id: string;
  orderId: string;
  type: RiskFlagType;
  level: RiskLevel;
  description: string;
  confirmed: boolean;
  createdAt: string;
}

export interface MaterialRequirement {
  type: MaterialType;
  label: string;
  uploaded: boolean;
  fileName?: string;
  uploadedAt?: string;
  notes?: string;
}

export interface ScreeningConclusion {
  orderId: string;
  result: ConclusionResult;
  reasonSummary: string;
  riskFlags: string[];
  materialsRequired?: MaterialRequirement[];
  preliminaryAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  finalResult?: ConclusionResult;
}

export interface FollowUpItem {
  id: string;
  orderId: string;
  question: string;
  standardScript: string;
  riskType: string;
  completed: boolean;
  answer?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface MRIMachine {
  id: string;
  name: string;
  model: string;
  roomNo: string;
  supportedCoils: string[];
  supportsEnhanced: boolean;
}

export interface MRISlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  machineId: string;
  machineName: string;
  coilType: string;
  supportsEnhanced: boolean;
  isAvailable: boolean;
  bookedBy?: string;
  bookedOrderId?: string;
}

export interface Appointment {
  id: string;
  orderId: string;
  slotId: string;
  patientId: string;
  appointmentNo: string;
  confirmedAt: string;
  confirmedBy: string;
  status: AppointmentStatus;
  reverifyStatus?: ReverifyStatus;
  reverifyAt?: string;
}

export interface RejectionRecord {
  id: string;
  orderId: string;
  reasonCode: string;
  reasonText: string;
  additionalNote: string;
  rejectedBy: string;
  rejectedAt: string;
  callbackStatus: CallbackStatus;
  doctorReply?: string;
  repliedAt?: string;
}

export interface ReverifyRecord {
  id: string;
  appointmentId: string;
  orderId: string;
  recentSurgery: boolean;
  recentSurgeryDetail?: string;
  newImplants: boolean;
  newImplantsDetail?: string;
  fastingConfirmed: boolean;
  fastingDetail?: string;
  passed: boolean;
  verifiedBy: string;
  verifiedAt: string;
}

export interface VerificationForm {
  id: string;
  appointmentId: string;
  patientInfo: Patient;
  examInfo: ExaminationOrder;
  conclusion: ScreeningConclusion;
  appointmentInfo: Appointment;
  risksSummary: string[];
  precautions: string[];
  generatedAt: string;
  generatedBy: string;
}

export interface StatisticsData {
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  scheduledCount: number;
  rejectionCount: number;
  rejectionReasons: Array<{ code: string; count: number; label: string }>;
  topRiskFlags: Array<{ type: string; count: number; label: string }>;
  avgScreeningDurationMinutes: number;
  roomUtilizationRate: number;
  noShowRate: number;
  onSiteRejectionRate: number;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface QuestionOption {
  value: boolean | string;
  label: string;
  triggersRisk?: RiskFlagType;
  subQuestions?: Question[];
}

export interface Question {
  id: string;
  title: string;
  description?: string;
  type: 'boolean' | 'select' | 'text';
  options?: QuestionOption[];
  isEnhancedOnly?: boolean;
  category?: 'implant' | 'allergy' | 'pregnancy' | 'surgery' | 'renal' | 'psych' | 'other';
}

export interface RejectionReasonTemplate {
  code: string;
  label: string;
  category: 'absolute' | 'material' | 'clinical';
}

export interface PageView {
  key: string;
  title: string;
  icon?: string;
}
