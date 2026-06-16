import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ArrowLeft,
  Check,
  Phone,
  MessageSquare,
  Zap,
  Scissors,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useSchedulingStore from '@/stores/schedulingStore';
import useAuthStore from '@/stores/authStore';
import { BODY_PART_LABELS } from '@/types';
import OrderSwitcher from '@/components/OrderSwitcher';
import OrderTimeline from '@/components/OrderTimeline';

type YesNo = 'yes' | 'no' | null;

export default function Reverify() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder, updateOrderStatus } =
    usePatientStore();
  const { slots, machines, appointments, loadSlotsAndMachines } = useSchedulingStore();
  const { user } = useAuthStore();

  const [recentSurgery, setRecentSurgery] = useState<YesNo>(null);
  const [surgeryType, setSurgeryType] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [hasImplants, setHasImplants] = useState<YesNo>(null);
  const [implantDetails, setImplantDetails] = useState<YesNo>(null);
  const [implantDescription, setImplantDescription] = useState('');
  const [fastingConfirmed, setFastingConfirmed] = useState<YesNo>(null);
  const [otherNotes, setOtherNotes] = useState('');
  const [reverifyStatus, setReverifyStatus] = useState<'pending' | 'passed' | 'failed'>(
    'pending',
  );
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(
    null,
  );

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

  const countdown = useMemo(() => {
    if (!slot) return null;
    const now = new Date();
    const examDate = new Date(`${slot.date}T${slot.startTime}:00`);
    const diffMs = examDate.getTime() - now.getTime();
    if (diffMs <= 0) return { text: '检查时间已到', hours: 0, urgent: true };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const urgent = hours < 24;
    return {
      hours,
      minutes,
      urgent,
      text:
        hours >= 24
          ? `距离检查时间还有 ${Math.floor(hours / 24)} 天 ${hours % 24} 小时`
          : `距离检查时间还有 ${hours} 小时 ${minutes} 分钟`,
    };
  }, [slot]);

  const showFastingCheck = useMemo(() => {
    if (!order) return false;
    if (order.isEnhanced) return true;
    const enhancedParts = ['abdomen', 'pelvis'];
    return enhancedParts.includes(order.bodyPart);
  }, [order]);

  const isFormComplete = useMemo(() => {
    if (recentSurgery === null) return false;
    if (recentSurgery === 'yes') {
      if (!surgeryType.trim() || !surgeryDate.trim()) return false;
      if (hasImplants === null) return false;
    }
    if (implantDetails === null) return false;
    if (implantDetails === 'yes' && !implantDescription.trim()) return false;
    if (showFastingCheck && fastingConfirmed === null) return false;
    return true;
  }, [
    recentSurgery,
    surgeryType,
    surgeryDate,
    hasImplants,
    implantDetails,
    implantDescription,
    showFastingCheck,
    fastingConfirmed,
  ]);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleMarkFailed = () => {
    setReverifyStatus('failed');
    if (order) {
      updateOrderStatus(order.id, 'rejected');
    }
    showToast('error', '已标记异常，建议联系患者改期或取消检查');
  };

  const handlePass = () => {
    if (recentSurgery === 'yes' && hasImplants === null) {
      showToast('error', '请补完「是否有体内植入物」选项，选择了新手术后必须确认有无植入物才能通过');
      return;
    }
    if (!isFormComplete) {
      showToast('error', '请完成所有必填核验项目');
      return;
    }
    if (recentSurgery === 'yes' && hasImplants === 'yes') {
      showToast(
        'error',
        '近期手术且存在体内植入物，禁止直接通过！请改为「异常处理」或联系医师评估后退回复查',
      );
      return;
    }
    if (implantDetails === 'yes') {
      showToast(
        'error',
        '登记了新的体内植入物，禁止直接核验通过！请改为「异常处理」或退回评估',
      );
      return;
    }
    if (showFastingCheck && fastingConfirmed === 'no') {
      const typeText = order?.isEnhanced ? '增强检查' : '腹部/盆腔检查';
      showToast(
        'error',
        `${typeText}必须严格禁食禁水，患者未遵守要求，本次不能进行检查，请改期`,
      );
      return;
    }
    setReverifyStatus('passed');
    if (order) {
      updateOrderStatus(order.id, 'completed');
    }
    showToast(
      'success',
      '✓ 核验通过，预约已确认。短信提醒已发送至患者手机',
    );
  };

  const handleLater = () => {
    if (patientId && order) navigate(`/patients/${patientId}/scheduling?orderId=${order.id}`);
  };

  if (!patient || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-gradient-to-r from-risk-warning to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center">
                <UserCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold">检查前二次核验</h1>
                  {reverifyStatus === 'passed' && (
                    <span className="status-badge bg-risk-safe text-white">
                      <CheckCircle2 className="w-3 h-3" />
                      已通过
                    </span>
                  )}
                  {reverifyStatus === 'failed' && (
                    <span className="status-badge bg-risk-absolute text-white">
                      <XCircle className="w-3 h-3" />
                      核验异常
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-95">
                  检查前一天进行的最后确认核验，确保患者身体状况适合 MRI 检查
                </div>
              </div>
            </div>
            {countdown && (
              <div
                className={`px-5 py-3 rounded-xl ${
                  countdown.urgent ? 'bg-white/20' : 'bg-white/10'
                } backdrop-blur-sm`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-6 h-6 ${countdown.urgent ? 'animate-pulse-slow' : ''}`} />
                  <div>
                    <div className="text-xs opacity-90">倒计时</div>
                    <div className="text-xl font-bold tracking-wide">{countdown.text}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-border shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <OrderTimeline order={order} compact />
          <OrderSwitcher currentOrder={order} compact />
        </div>
      </div>

      <div className="bg-risk-warning/10 border-b border-risk-warning/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3 text-risk-warning">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-base mb-1">
                请仔细核验以下项目，如有任何异常情况应及时处理！
              </div>
              <div className="text-sm opacity-90">
                本核验需在检查前 24 小时内完成，核验结果直接关系到患者检查安全
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="data-card">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <Calendar className="w-5 h-5 text-medical-600" />
                  <h2 className="text-lg font-bold text-foreground">预约信息</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-medical-50/50 border border-medical-100">
                    <div className="w-10 h-10 rounded-full bg-medical-500 flex items-center justify-center text-white">
                      <span className="font-bold">{patient.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{patient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">检查日期</span>
                      <span className="font-medium text-foreground flex-1">
                        {slot
                          ? (() => {
                              const d = new Date(slot.date);
                              const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
                              return `${d.getMonth() + 1}月${d.getDate()}日（周${weekDays[d.getDay()]}）`;
                            })()
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">检查时段</span>
                      <span className="font-medium text-foreground flex-1">
                        {slot ? `${slot.startTime} - ${slot.endTime}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">机房</span>
                      <span className="font-medium text-foreground flex-1">
                        {machine?.roomNo || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">检查部位</span>
                      <span className="font-medium text-foreground flex-1">
                        {BODY_PART_LABELS[order.bodyPart]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">检查方式</span>
                      <span className="font-medium flex-1">
                        {order.isEnhanced ? (
                          <span className="status-badge bg-amber-100 text-amber-700">
                            增强扫描
                          </span>
                        ) : (
                          <span className="text-foreground">平扫</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">临床诊断</span>
                      <span className="font-medium text-foreground flex-1 text-xs">
                        {order.clinicalDiagnosis}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-medical-500 flex-shrink-0" />
                      <span className="text-muted-foreground w-16">联系电话</span>
                      <span className="font-medium text-foreground flex-1 font-mono text-xs">
                        {patient.phone}
                      </span>
                    </div>
                  </div>

                  {appointment && (
                    <div className="rounded-lg bg-muted/30 border border-border p-3 mt-4">
                      <div className="text-xs text-muted-foreground mb-1">预约号</div>
                      <div className="font-mono text-lg font-bold text-medical-600 tracking-wider">
                        {appointment.appointmentNo}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="data-card">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-medical-600" />
                  <span className="text-muted-foreground">核验人：</span>
                  <span className="font-medium text-foreground">
                    {user ? `${user.name}（${user.employeeId}）` : '自动'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="data-card">
              <div
                className={`p-4 rounded-lg border-2 mb-5 transition-all ${
                  recentSurgery === null
                    ? 'border-border bg-muted/20'
                    : recentSurgery === 'no'
                      ? 'border-risk-safe/30 bg-risk-safe/5'
                      : 'border-risk-warning/30 bg-risk-warning/5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2.5">
                    <Scissors className="w-5 h-5 text-risk-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-base text-foreground">核验项目 1</h3>
                        <span className="status-badge bg-risk-absolute/10 text-risk-absolute">
                          必填
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        自上次登记后，是否有接受新的手术或有创口？
                      </p>
                    </div>
                  </div>
                  {recentSurgery !== null && (
                    <span
                      className={`status-badge ${
                        recentSurgery === 'no'
                          ? 'bg-risk-safe/10 text-risk-safe'
                          : 'bg-risk-warning/10 text-risk-warning'
                      }`}
                    >
                      {recentSurgery === 'yes' ? '是' : '否'}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setRecentSurgery('yes')}
                    className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                      recentSurgery === 'yes'
                        ? 'border-risk-warning bg-risk-warning text-white'
                        : 'border-border bg-white text-muted-foreground hover:border-risk-warning/50'
                    }`}
                  >
                    是，有新手术/创口
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSurgery('no');
                      setSurgeryType('');
                      setSurgeryDate('');
                      setHasImplants(null);
                    }}
                    className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                      recentSurgery === 'no'
                        ? 'border-risk-safe bg-risk-safe text-white'
                        : 'border-border bg-white text-muted-foreground hover:border-risk-safe/50'
                    }`}
                  >
                    否，无新手术
                  </button>
                </div>

                {recentSurgery === 'yes' && (
                  <div className="space-y-4 p-4 rounded-lg border border-risk-warning/20 bg-white">
                    <div>
                      <label className="form-label">手术类型和部位 *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="例如：胆囊切除术、骨折内固定等"
                        value={surgeryType}
                        onChange={(e) => setSurgeryType(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">手术时间 *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={surgeryDate}
                        onChange={(e) => setSurgeryDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">是否有体内植入物？*</label>
                      <div className="flex gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setHasImplants('yes')}
                          className={`flex-1 h-10 rounded-md border-2 font-medium text-sm transition-all ${
                            hasImplants === 'yes'
                              ? 'border-risk-absolute bg-risk-absolute text-white'
                              : 'border-border bg-white text-muted-foreground hover:border-risk-absolute/50'
                          }`}
                        >
                          是，有植入物
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasImplants('no')}
                          className={`flex-1 h-10 rounded-md border-2 font-medium text-sm transition-all ${
                            hasImplants === 'no'
                              ? 'border-risk-safe bg-risk-safe text-white'
                              : 'border-border bg-white text-muted-foreground hover:border-risk-safe/50'
                          }`}
                        >
                          否，无植入物
                        </button>
                      </div>
                      {hasImplants === 'yes' && (
                        <div className="mt-3 p-3 rounded-md border border-risk-absolute/30 bg-risk-absolute/5">
                          <div className="flex items-start gap-2 text-risk-absolute">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-bold mb-0.5">⚠ 存在风险！</div>
                              <div>
                                新植入体内金属/电子装置可能影响 MRI 检查安全，
                                <span className="font-bold">建议取消本次检查</span>
                                ，联系开单医师评估后再预约。
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`p-4 rounded-lg border-2 mb-5 transition-all ${
                  implantDetails === null
                    ? 'border-border bg-muted/20'
                    : implantDetails === 'no'
                      ? 'border-risk-safe/30 bg-risk-safe/5'
                      : 'border-risk-warning/30 bg-risk-warning/5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-risk-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-base text-foreground">核验项目 2</h3>
                        <span className="status-badge bg-risk-absolute/10 text-risk-absolute">
                          必填
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        是否有体内新植入的任何金属或电子装置？
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        包括但不限于：心脏起搏器、人工耳蜗、动脉瘤夹、支架、钢板螺钉、输液港等
                      </p>
                    </div>
                  </div>
                  {implantDetails !== null && (
                    <span
                      className={`status-badge ${
                        implantDetails === 'no'
                          ? 'bg-risk-safe/10 text-risk-safe'
                          : 'bg-risk-warning/10 text-risk-warning'
                      }`}
                    >
                      {implantDetails === 'yes' ? '有' : '无'}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setImplantDetails('yes')}
                    className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                      implantDetails === 'yes'
                        ? 'border-risk-warning bg-risk-warning text-white'
                        : 'border-border bg-white text-muted-foreground hover:border-risk-warning/50'
                    }`}
                  >
                    是，有新植入物
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImplantDetails('no');
                      setImplantDescription('');
                    }}
                    className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                      implantDetails === 'no'
                        ? 'border-risk-safe bg-risk-safe text-white'
                        : 'border-border bg-white text-muted-foreground hover:border-risk-safe/50'
                    }`}
                  >
                    否，无新植入物
                  </button>
                </div>

                {implantDetails === 'yes' && (
                  <div className="space-y-3 p-4 rounded-lg border border-risk-warning/20 bg-white">
                    <div>
                      <label className="form-label">请描述植入物的类型、部位、植入时间 *</label>
                      <textarea
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        placeholder="例如：2024年3月植入心脏支架（冠脉药物洗脱支架），型号XXX"
                        value={implantDescription}
                        onChange={(e) => setImplantDescription(e.target.value)}
                      />
                    </div>
                    <div className="p-3 rounded-md border border-amber-300 bg-amber-50">
                      <div className="flex items-start gap-2 text-amber-700">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-bold mb-0.5">需要医师评估！</div>
                          <div>请务必联系影像科医师或预约中心评估植入物的 MRI 兼容性，严禁直接进行检查！</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {showFastingCheck && (
                <div
                  className={`p-4 rounded-lg border-2 mb-5 transition-all ${
                    fastingConfirmed === null
                      ? 'border-border bg-muted/20'
                      : fastingConfirmed === 'yes'
                        ? 'border-risk-safe/30 bg-risk-safe/5'
                        : 'border-risk-warning/30 bg-risk-warning/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2.5">
                      <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-base text-foreground">核验项目 3</h3>
                          <span className="status-badge bg-amber-100 text-amber-700">
                            条件必填
                          </span>
                          {order.isEnhanced && (
                            <span className="status-badge bg-amber-100 text-amber-700">
                              增强检查
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          是否已按照要求做好禁食禁水准备？
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          检查前【
                          <span className="font-semibold text-risk-absolute">6</span>
                          】小时禁食，【
                          <span className="font-semibold text-risk-absolute">2</span>
                          】小时禁水
                        </p>
                      </div>
                    </div>
                    {fastingConfirmed !== null && (
                      <span
                        className={`status-badge ${
                          fastingConfirmed === 'yes'
                            ? 'bg-risk-safe/10 text-risk-safe'
                            : 'bg-risk-warning/10 text-risk-warning'
                        }`}
                      >
                        {fastingConfirmed === 'yes' ? '已遵守' : '未遵守'}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setFastingConfirmed('yes')}
                      className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                        fastingConfirmed === 'yes'
                          ? 'border-risk-safe bg-risk-safe text-white'
                          : 'border-border bg-white text-muted-foreground hover:border-risk-safe/50'
                      }`}
                    >
                      是，已按要求禁食禁水
                    </button>
                    <button
                      type="button"
                      onClick={() => setFastingConfirmed('no')}
                      className={`flex-1 h-11 rounded-lg border-2 font-medium text-sm transition-all ${
                        fastingConfirmed === 'no'
                          ? 'border-risk-warning bg-risk-warning text-white'
                          : 'border-border bg-white text-muted-foreground hover:border-risk-warning/50'
                      }`}
                    >
                      否，未按要求准备
                    </button>
                  </div>

                  {fastingConfirmed === 'no' && (
                    <div className="p-4 rounded-lg border-2 border-risk-warning/40 bg-risk-warning/10">
                      <div className="flex items-start gap-3 text-risk-warning">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-bold text-base mb-1">⚠ 重要提醒！</div>
                          <p className="mb-2">
                            患者<span className="font-bold">未按要求禁食禁水</span>，
                            增强检查和腹部/盆腔检查必须严格遵守！
                          </p>
                          <ul className="space-y-0.5 text-xs opacity-90 pl-4 list-disc">
                            <li>胃内容物可能导致检查中误吸（危及生命）</li>
                            <li>肠道内容物/胀气会严重影响图像质量</li>
                            <li>建议：<span className="font-bold">本次检查必须改期</span>，重新预约并严格遵守准备要求</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-lg border-2 border-border bg-muted/10">
                <div className="flex items-start gap-2.5 mb-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-base text-foreground">核验项目 4</h3>
                      <span className="status-badge bg-gray-100 text-gray-600">选填</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      其他情况备注
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      患者/护士可补充备注其他需要告知的情况
                    </p>
                  </div>
                </div>
                <textarea
                  className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm min-h-[90px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="例如：患者今日有轻微感冒（不影响检查）、患者有轻度幽闭恐惧建议家属陪同、需要安排轮椅接送等..."
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="data-card">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCheck className="w-4 h-4" />
                  <span>核验人：</span>
                  <span className="font-medium text-foreground">
                    {user ? `${user.name}（${user.employeeId} · ${user.department}）` : '系统自动'}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  核验时间：{new Date().toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLater}
            disabled={reverifyStatus !== 'pending'}
          >
            <ArrowLeft className="w-4 h-4" />
            稍后再核验
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-danger"
              onClick={handleMarkFailed}
              disabled={reverifyStatus !== 'pending'}
            >
              <XCircle className="w-4 h-4" />
              标记异常
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePass}
              disabled={reverifyStatus !== 'pending'}
            >
              <Check className="w-4 h-4" />
              核验通过，确认预约
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-4 shadow-xl flex items-center gap-3 max-w-md ${
            toast.type === 'success'
              ? 'bg-risk-safe text-white'
              : toast.type === 'warning'
                ? 'bg-risk-warning text-white'
                : 'bg-risk-absolute text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 flex-shrink-0" />
          )}
          <div>
            <div className="font-semibold text-sm">
              {toast.type === 'success'
                ? '核验成功'
                : toast.type === 'warning'
                  ? '需要注意'
                  : '核验异常'}
            </div>
            <div className="text-xs opacity-90 mt-0.5 leading-relaxed">
              {toast.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
