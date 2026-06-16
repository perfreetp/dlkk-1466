import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Phone,
  MapPin,
  Heart,
  Calendar,
  Clock,
  User,
  FileCheck,
  Check,
  Circle,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useSchedulingStore from '@/stores/schedulingStore';
import useScreeningStore from '@/stores/screeningStore';
import {
  BODY_PART_LABELS,
  CONCLUSION_RESULT_LABELS,
  RISK_FLAG_LABELS,
  RISK_LEVEL_LABELS,
  MATERIAL_TYPE_LABELS,
} from '@/types';
import { RISK_RULES } from '@/data/riskRules';
import type { MaterialType, RiskFlagType } from '@/types';
import OrderSwitcher from '@/components/OrderSwitcher';
import OrderTimeline from '@/components/OrderTimeline';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

function generateVerifyNo(): string {
  const now = new Date();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MRI-VERIFY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${rand}`;
}

export default function Print() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder } = usePatientStore();
  const { slots, machines, appointments, loadSlotsAndMachines } = useSchedulingStore();
  const screeningState = useScreeningStore();
  const { riskFlags } = screeningState;

  const conclusion = useMemo(() => {
    if (!currentOrder) return null;
    return screeningState.conclusions.find((c) => c.orderId === currentOrder.id) || null;
  }, [currentOrder, screeningState.conclusions]);

  useEffect(() => {
    if (patientId) {
      const orderId = searchParams.get('orderId') || undefined;
      setCurrentPatientAndOrder(patientId, orderId);
    }
    loadSlotsAndMachines();
  }, [patientId, searchParams, setCurrentPatientAndOrder, loadSlotsAndMachines]);

  const patient = currentPatient;
  const order = currentOrder;

  const appointment = useMemo(() => {
    if (!order) return null;
    return appointments.find((a) => a.orderId === order.id) || null;
  }, [appointments, order]);

  const slot = useMemo(() => {
    if (!appointment) return null;
    return slots.find((s) => s.id === appointment.slotId) || null;
  }, [slots, appointment]);

  const machine = useMemo(() => {
    if (!slot) return null;
    return machines.find((m) => m.id === slot.machineId) || null;
  }, [machines, slot]);

  const finalResult = conclusion?.finalResult || conclusion?.result;

  const orderRisks = useMemo(() => {
    if (!order) return [];
    return riskFlags.filter((r) => r.orderId === order.id);
  }, [riskFlags, order]);

  const materials = conclusion?.materialsRequired || [];
  const verifyNo = useMemo(() => generateVerifyNo(), []);
  const printDate = formatDate(new Date().toISOString());

  if (!patient || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const conclusionBadgeClass =
    finalResult === 'absolute_contraindication'
      ? 'bg-risk-absolute text-white'
      : finalResult === 'materials_needed'
        ? 'bg-risk-warning text-white'
        : 'bg-risk-safe text-white';

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="no-print sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (patientId && order) navigate(`/patients/${patientId}/scheduling?orderId=${order.id}`);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回预约排班
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">检查前核验单预览</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                alert('PDF 下载功能（mock）');
              }}
            >
              <Download className="w-4 h-4" />
              下载 PDF
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              打印核验单
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-border shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <OrderTimeline order={order} compact />
          <OrderSwitcher currentOrder={order} compact />
        </div>
      </div>

      <div className="py-8 px-4">
        <div
          className="print-area max-w-[210mm] mx-auto bg-white p-12 shadow-lg"
          style={{ minHeight: '297mm' }}
        >
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-medical-500">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center shadow-md">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-medical-800 leading-tight">
                  某某市第一人民医院
                </div>
                <div className="text-lg font-semibold text-medical-600 mt-1">
                  影像科 · MRI 检查中心
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">核验单编号</div>
              <div className="font-mono text-lg font-bold text-foreground tracking-wider">
                {verifyNo}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                打印日期：{printDate}
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-wide mb-2">
              磁共振成像（MRI）检查前核验单
            </h1>
            <p className="text-sm text-muted-foreground">
              请仔细阅读并确认以下信息，如有疑问请联系预约中心
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-medical-200">
              <User className="w-5 h-5 text-medical-600" />
              <h2 className="text-lg font-bold text-foreground">患者信息</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">姓名</span>
                <span className="font-semibold text-foreground">{patient.name}</span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">性别</span>
                <span className="font-semibold text-foreground">
                  {patient.gender === 'male' ? '男' : '女'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">年龄</span>
                <span className="font-semibold text-foreground">{patient.age} 岁</span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">联系电话</span>
                <span className="font-semibold text-foreground font-mono">{patient.phone}</span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">病历号</span>
                <span className="font-semibold text-foreground font-mono">
                  {patient.medicalRecordNo}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">身份证号</span>
                <span className="font-semibold text-foreground font-mono text-xs">
                  {patient.idCardNo}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">开单科室</span>
                <span className="font-semibold text-foreground">{patient.orderingDepartment}</span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">开单医生</span>
                <span className="font-semibold text-foreground">{patient.orderingDoctor}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-medical-200">
              <FileCheck className="w-5 h-5 text-medical-600" />
              <h2 className="text-lg font-bold text-foreground">检查信息</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">检查部位</span>
                <span className="font-semibold text-foreground">
                  {BODY_PART_LABELS[order.bodyPart]}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">检查方式</span>
                <span className="font-semibold text-foreground">
                  {order.isEnhanced ? '增强扫描' : '平扫'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">临床诊断</span>
                <span className="font-semibold text-foreground">{order.clinicalDiagnosis}</span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">预约日期</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-medical-500" />
                  {slot ? formatDateDisplay(slot.date) : '—'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">预约时段</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4 text-medical-500" />
                  {slot ? `${slot.startTime} - ${slot.endTime}` : '—'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">机房号</span>
                <span className="font-semibold text-foreground">
                  {machine?.roomNo || '—'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">机型</span>
                <span className="font-semibold text-foreground text-xs">
                  {machine?.name || '—'}
                </span>
              </div>
              <div className="flex border-b border-dashed border-border pb-1.5">
                <span className="w-24 text-muted-foreground text-sm flex-shrink-0">预约号</span>
                <span className="font-mono text-2xl font-bold text-medical-600 tracking-wider">
                  {appointment?.appointmentNo || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-medical-200">
              <ShieldCheck className="w-5 h-5 text-medical-600" />
              <h2 className="text-lg font-bold text-foreground">筛查与核验结果</h2>
            </div>

            <div className="mb-5 flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm text-muted-foreground mb-1">筛查结论</div>
                <span
                  className={`status-badge text-base px-4 py-1.5 font-bold ${conclusionBadgeClass}`}
                >
                  {finalResult === 'absolute_contraindication' && (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  {finalResult === 'materials_needed' && (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {finalResult === 'proceed' && <ShieldCheck className="w-4 h-4" />}
                  {finalResult
                    ? CONCLUSION_RESULT_LABELS[finalResult]
                    : '待筛查'}
                </span>
              </div>
              {conclusion?.reasonSummary && (
                <div className="flex-1 text-sm text-muted-foreground border-l-2 border-border pl-4">
                  {conclusion.reasonSummary}
                </div>
              )}
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">核验风险项</h3>
              {orderRisks.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-md border border-risk-safe/30 bg-risk-safe/5 text-risk-safe text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">未发现禁忌项，可安全进行检查</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderRisks.map((risk) => {
                    const rule = RISK_RULES[risk.type as RiskFlagType];
                    return (
                      <div
                        key={risk.id}
                        className={`p-3 rounded-md border ${
                          risk.level === 'absolute_contraindication'
                            ? 'border-risk-absolute/30 bg-risk-absolute/5'
                            : risk.level === 'needs_materials'
                              ? 'border-risk-warning/30 bg-risk-warning/5'
                              : 'border-medical-200 bg-medical-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              risk.level === 'absolute_contraindication'
                                ? 'bg-risk-absolute text-white'
                                : risk.level === 'needs_materials'
                                  ? 'bg-risk-warning text-white'
                                  : 'bg-medical-500 text-white'
                            }`}
                          >
                            {risk.level === 'absolute_contraindication' ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : risk.level === 'needs_materials' ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-foreground">
                                {RISK_FLAG_LABELS[risk.type as RiskFlagType]}
                              </span>
                              <span
                                className={`status-badge ${
                                  risk.level === 'absolute_contraindication'
                                    ? 'bg-risk-absolute/10 text-risk-absolute'
                                    : risk.level === 'needs_materials'
                                      ? 'bg-risk-warning/10 text-risk-warning'
                                      : 'bg-medical-50 text-medical-700'
                                }`}
                              >
                                {RISK_LEVEL_LABELS[risk.level]}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mb-1.5">
                              {risk.description || rule?.description}
                            </div>
                            {rule?.recommendation && (
                              <div className="text-xs text-medical-700 bg-medical-50/60 rounded px-2 py-1 inline-block">
                                处理措施：{rule.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">已提供材料清单</h3>
              {materials.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 rounded-md border border-border bg-white">
                  无需补充材料
                </div>
              ) : (
                <div className="space-y-1.5">
                  {materials.map((mat) => (
                    <div
                      key={mat.type}
                      className={`flex items-center gap-2.5 p-2.5 rounded-md border ${
                        mat.uploaded
                          ? 'border-risk-safe/20 bg-risk-safe/3'
                          : 'border-risk-warning/20 bg-risk-warning/5'
                      }`}
                    >
                      {mat.uploaded ? (
                        <CheckCircle2 className="w-5 h-5 text-risk-safe flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-risk-warning flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span
                          className={`text-sm font-medium ${
                            mat.uploaded ? 'text-foreground' : 'text-risk-warning'
                          }`}
                        >
                          {MATERIAL_TYPE_LABELS[mat.type as MaterialType] || mat.label}
                        </span>
                      </div>
                      {mat.uploaded && (
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>
                            上传：
                            {mat.uploadedAt
                              ? formatDate(mat.uploadedAt)
                              : printDate}
                          </span>
                          <span>审核人：{conclusion?.reviewedBy || '李雪梅'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">追问清单确认</h3>
              <div className="space-y-1.5">
                {orderRisks.map((risk) => (
                  <div
                    key={`q-${risk.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-md border border-border bg-white"
                  >
                    <CheckCircle2 className="w-4 h-4 text-risk-safe flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <span className="text-foreground">
                        关于{RISK_FLAG_LABELS[risk.type as RiskFlagType]}情况确认
                      </span>
                      <span className="text-muted-foreground ml-2">（已完成）</span>
                    </div>
                    <span className="status-badge bg-risk-safe/10 text-risk-safe text-xs">
                      <Check className="w-3 h-3" />
                      已确认
                    </span>
                  </div>
                ))}
                {orderRisks.length === 0 && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border bg-white">
                    <CheckCircle2 className="w-4 h-4 text-risk-safe flex-shrink-0" />
                    <span className="text-sm text-foreground">常规健康确认</span>
                    <span className="status-badge bg-risk-safe/10 text-risk-safe text-xs ml-auto">
                      <Check className="w-3 h-3" />
                      已完成
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-lg border-2 border-amber-300 bg-amber-50/60 p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-800">检查前注意事项</h2>
            </div>
            <ul className="space-y-2.5 text-sm text-amber-900">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  1
                </span>
                <span>检查前 24 小时避免饮酒、剧烈运动，保证充足睡眠</span>
              </li>
              {order.isEnhanced && (
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                    2
                  </span>
                  <span className="font-semibold">
                    【增强扫描】检查前 6 小时禁食、2 小时禁水，请严格遵守
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {order.isEnhanced ? '3' : '2'}
                </span>
                <span>
                  如有体内植入物（支架、钢板、起搏器等），请携带
                  <span className="font-semibold">植入物型号卡</span>或
                  <span className="font-semibold">手术记录</span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {order.isEnhanced ? '4' : '3'}
                </span>
                <span>
                  穿着<span className="font-semibold">无金属衣物</span>，检查前去除首饰、假牙、钥匙、发卡、眼镜、皮带等所有金属物品
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {order.isEnhanced ? '5' : '4'}
                </span>
                <span>
                  检查过程约 <span className="font-semibold">30-60 分钟</span>
                  ，请合理安排时间，检查时保持静止不动
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {order.isEnhanced ? '6' : '5'}
                </span>
                <span>
                  <span className="font-semibold">幽闭恐惧</span>患者请提前告知，可安排家属陪同或药物辅助
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {order.isEnhanced ? '7' : '6'}
                </span>
                <span>
                  如需变更预约，请<span className="font-semibold">提前 24 小时</span>
                  致电预约中心取消，以免影响后续预约
                </span>
              </li>
            </ul>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-5 pb-2 border-b-2 border-medical-200">
              <FileCheck className="w-5 h-5 text-medical-600" />
              <h2 className="text-lg font-bold text-foreground">签字确认</h2>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-foreground mb-10 text-center">
                  患者/家属确认签字
                </div>
                <div className="border-b border-border h-10" />
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  日期：________年____月____日
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground mb-10 text-center">
                  复核护士签字
                </div>
                <div className="border-b border-border h-10" />
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  日期：________年____月____日
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground mb-10 text-center">
                  预约中心确认签字
                </div>
                <div className="border-b border-border h-10" />
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  日期：________年____月____日
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-medical-200">
            <div className="grid grid-cols-3 gap-6 items-end">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  <span>预约中心电话：010-8888-6666</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>门诊楼 3 层 影像科</span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-lg font-bold text-medical-700 mb-1">
                  感谢您的配合，祝您早日康复
                </div>
                <div className="text-xs text-muted-foreground">
                  某某市第一人民医院 影像科 MRI 检查中心
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
