import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Circle,
  X,
  Check,
  Info,
  Printer,
  Clock,
  MapPin,
  Zap,
  ArrowLeftRight,
  Lock,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useSchedulingStore from '@/stores/schedulingStore';
import useScreeningStore from '@/stores/screeningStore';
import useAuthStore from '@/stores/authStore';
import {
  BODY_PART_LABELS,
  ORDER_STATUS_LABELS,
  CONCLUSION_RESULT_LABELS,
  MATERIAL_TYPE_LABELS,
} from '@/types';
import type { MRISlot, MaterialType } from '@/types';

const COIL_OPTIONS = [
  { value: '头线圈', label: 'Head 头部' },
  { value: '脊柱线圈', label: 'Spine 脊柱' },
  { value: '体部线圈', label: 'Body 体部' },
  { value: '膝关节线圈', label: 'Knee 膝关节' },
  { value: '肩关节线圈', label: 'Shoulder 肩关节' },
  { value: '心脏线圈', label: 'Cardiac 心脏' },
  { value: '乳腺线圈', label: 'Breast 乳腺' },
  { value: '颈部线圈', label: 'Neck 颈部' },
];

const TIME_PREFERENCES = [
  { value: 'all', label: '全天' },
  { value: 'morning', label: '上午 (08:00-12:00)' },
  { value: 'afternoon', label: '下午 (13:00-18:00)' },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

export default function Scheduling() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder } = usePatientStore();
  const {
    loadSlotsAndMachines,
    machines,
    slots,
    filters,
    setFilters,
    currentSlotId,
    selectSlot,
    getFilteredSlots,
    confirmAppointment,
    checkBookingAbility,
  } = useSchedulingStore();
  const screeningState = useScreeningStore();
  const { user } = useAuthStore();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingAbility, setBookingAbility] = useState<{ canBook: boolean; reason?: string }>({
    canBook: true,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultStartDate = formatDate(today);
  const defaultEndDate = formatDate(addDays(today, 7));

  useEffect(() => {
    if (patientId) {
      const orderId = searchParams.get('orderId') || undefined;
      setCurrentPatientAndOrder(patientId, orderId);
    }
  }, [patientId, searchParams, setCurrentPatientAndOrder]);

  useEffect(() => {
    loadSlotsAndMachines();
  }, [loadSlotsAndMachines]);

  useEffect(() => {
    setFilters({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });
  }, []);

  useEffect(() => {
    if (currentOrder) {
      setFilters({ isEnhanced: currentOrder.isEnhanced });
      selectSlot(null);
      const ability = checkBookingAbility(currentOrder.id);
      setBookingAbility(ability);
    } else {
      selectSlot(null);
      setBookingAbility({ canBook: true });
    }
  }, [currentOrder, checkBookingAbility, selectSlot]);

  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedCoils, setSelectedCoils] = useState<string[]>([]);
  const [timePreference, setTimePreference] = useState('all');
  const [isEnhancedLocked, setIsEnhancedLocked] = useState(false);
  const [showCoilDropdown, setShowCoilDropdown] = useState(false);

  useEffect(() => {
    if (currentOrder?.isEnhanced) {
      setIsEnhancedLocked(true);
    }
  }, [currentOrder]);

  useEffect(() => {
    if (selectedMachines.length > 0) {
      setFilters({ machineId: selectedMachines[0] });
    } else {
      setFilters({ machineId: undefined });
    }
  }, [selectedMachines]);

  useEffect(() => {
    if (selectedCoils.length > 0) {
      setFilters({ coilType: selectedCoils[0] });
    } else {
      setFilters({ coilType: undefined });
    }
  }, [selectedCoils]);

  const patient = currentPatient;
  const order = currentOrder;

  const conclusion = useMemo(() => {
    if (!order) return null;
    return screeningState.conclusions.find((c) => c.orderId === order.id) || null;
  }, [order, screeningState.conclusions]);

  const missingMaterials = useMemo(() => {
    if (!conclusion?.materialsRequired) return [];
    return conclusion.materialsRequired.filter((m) => !m.uploaded);
  }, [conclusion]);

  const finalResult = conclusion?.finalResult || conclusion?.result;

  const filteredSlots = useMemo(() => {
    let result = getFilteredSlots();
    if (timePreference === 'morning') {
      result = result.filter((s) => parseInt(s.startTime) < 12);
    } else if (timePreference === 'afternoon') {
      result = result.filter((s) => parseInt(s.startTime) >= 12);
    }
    return result;
  }, [getFilteredSlots, timePreference]);

  const timeSlots = useMemo(() => {
    const times: string[] = [];
    for (let h = 8; h < 18; h++) {
      times.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return times;
  }, []);

  const daySlots = useMemo(() => {
    const dateStr = formatDate(currentDate);
    const dayAllSlots = slots.filter((s) => s.date === dateStr);
    return dayAllSlots;
  }, [slots, currentDate]);

  const weekSlots = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const startDay = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - startDay);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startOfWeek, i));
    }
    return days;
  }, [currentDate]);

  const selectedSlot = useMemo(() => {
    if (!currentSlotId) return null;
    return slots.find((s) => s.id === currentSlotId) || null;
  }, [currentSlotId, slots]);

  const handleDateChange = (direction: number) => {
    setCurrentDate(addDays(currentDate, direction));
  };

  const handleToday = () => {
    setCurrentDate(today);
  };

  const toggleMachine = (id: string) => {
    setSelectedMachines((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const toggleCoil = (value: string) => {
    setSelectedCoils((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const handleSlotClick = (slot: MRISlot) => {
    if (!bookingAbility.canBook) return;
    if (!slot.isAvailable) return;
    selectSlot(currentSlotId === slot.id ? null : slot.id);
  };

  const handleClearSelection = () => {
    selectSlot(null);
  };

  const handleConfirmAppointment = () => {
    if (!selectedSlot || !order || !patient || !user) return;
    confirmAppointment(order.id, selectedSlot.id, patient.id, user.id);
    setShowConfirmModal(false);
    if (patientId) {
      navigate(`/patients/${patientId}/print`);
    }
  };

  const getSlotClass = (slot: MRISlot): string => {
    if (!bookingAbility.canBook) return 'slot-cell slot-booked cursor-not-allowed';
    if (currentSlotId === slot.id) return 'slot-cell slot-selected';
    if (!slot.isAvailable) return 'slot-cell slot-booked cursor-not-allowed';
    if (order?.isEnhanced && !slot.supportsEnhanced) return 'slot-cell slot-full cursor-not-allowed';
    return 'slot-cell slot-available';
  };

  const getPatientNameForSlot = (slot: MRISlot): string => {
    if (slot.bookedOrderId) {
      const bookedOrder = usePatientStore
        .getState()
        .orders.find((o) => o.id === slot.bookedOrderId);
      if (bookedOrder) {
        const bookedPatient = usePatientStore
          .getState()
          .patients.find((p) => p.id === bookedOrder.patientId);
        return bookedPatient?.name || '已预约';
      }
    }
    return '已预约';
  };

  const getWeekStats = (date: Date, machineId: string) => {
    const dateStr = formatDate(date);
    const daySlots = slots.filter((s) => s.date === dateStr && s.machineId === machineId);
    return {
      total: daySlots.length,
      available: daySlots.filter((s) => s.isAvailable).length,
    };
  };

  if (!patient || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-gradient-to-r from-medical-500 to-medical-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-2xl font-bold">{patient.name}</span>
                  <span className="text-sm opacity-90 bg-white/20 px-2 py-0.5 rounded">
                    病历号 {patient.medicalRecordNo}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded text-xs font-bold">
                    <Calendar className="w-3 h-3" />
                    预约排班
                  </span>
                  {finalResult && (
                    <span
                      className={`status-badge ${
                        finalResult === 'absolute_contraindication'
                          ? 'bg-risk-absolute text-white'
                          : finalResult === 'materials_needed'
                            ? 'bg-risk-warning text-white'
                            : 'bg-risk-safe text-white'
                      }`}
                    >
                      {CONCLUSION_RESULT_LABELS[finalResult]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm opacity-95">
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-70">检查部位</span>
                    <span className="font-medium">{BODY_PART_LABELS[order.bodyPart]}</span>
                  </span>
                  {order.isEnhanced && (
                    <span className="bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded text-xs font-bold">
                      <Zap className="w-3 h-3 inline mr-0.5" />
                      增强
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-70">开单科室</span>
                    <span className="font-medium">{patient.orderingDepartment}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-70">状态</span>
                    <span className="font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="text-sm opacity-90">
              <div>性别：{patient.gender === 'male' ? '男' : '女'}</div>
              <div>年龄：{patient.age}岁</div>
            </div>
          </div>
        </div>
      </div>

      {!bookingAbility.canBook && (
        <div className="bg-risk-absolute/10 border-b border-risk-absolute/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {finalResult === 'absolute_contraindication' ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-risk-absolute">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <div className="font-bold">存在绝对禁忌，无法预约，请先退回开单医生</div>
                    <div className="text-sm opacity-90 mt-0.5">{bookingAbility.reason}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    if (patientId) navigate(`/patients/${patientId}/callback`);
                  }}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  前往退回处理
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 text-risk-absolute">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold mb-2">资料不全，以下材料缺失，请先补齐后再预约</div>
                    <ul className="space-y-1">
                      {missingMaterials.map((mat) => (
                        <li key={mat.type} className="flex items-center gap-2 text-sm">
                          <Circle className="w-2 h-2 fill-risk-absolute flex-shrink-0" />
                          <span>
                            {MATERIAL_TYPE_LABELS[mat.type as MaterialType] || mat.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary bg-white border-risk-absolute/30 text-risk-absolute hover:bg-risk-absolute/5"
                  onClick={() => {
                    if (patientId) navigate(`/patients/${patientId}/review`);
                  }}
                >
                  前往补齐材料
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="data-card">
                <div className="flex items-center gap-2 mb-5">
                  <Filter className="w-5 h-5 text-medical-600" />
                  <h2 className="text-lg font-bold text-foreground">筛选条件</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="form-label">检查日期范围</label>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">开始日期</div>
                        <input
                          type="date"
                          className="form-input"
                          value={filters.startDate || defaultStartDate}
                          onChange={(e) => setFilters({ startDate: e.target.value })}
                          min={defaultStartDate}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">结束日期</div>
                        <input
                          type="date"
                          className="form-input"
                          value={filters.endDate || defaultEndDate}
                          onChange={(e) => setFilters({ endDate: e.target.value })}
                          min={filters.startDate || defaultStartDate}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">MRI 机型</label>
                    <div className="space-y-2">
                      {machines.map((machine) => (
                        <label
                          key={machine.id}
                          className="flex items-start gap-2.5 p-2.5 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMachines.includes(machine.id)}
                            onChange={() => toggleMachine(machine.id)}
                            className="mt-0.5 w-4 h-4 rounded border-input text-medical-600 focus:ring-medical-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {machine.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {machine.roomNo} · {machine.model}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="form-label">线圈类型（多选）</label>
                    <button
                      type="button"
                      onClick={() => setShowCoilDropdown(!showCoilDropdown)}
                      className="form-input w-full text-left flex items-center justify-between"
                    >
                      <span className="truncate text-sm">
                        {selectedCoils.length > 0
                          ? selectedCoils.join(', ')
                          : '选择线圈类型...'}
                      </span>
                      <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    </button>
                    {showCoilDropdown && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-64 overflow-auto">
                        {COIL_OPTIONS.map((opt) => (
                          <div
                            key={opt.value}
                            onClick={() => toggleCoil(opt.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-medical-50 transition-colors ${
                              selectedCoils.includes(opt.value) ? 'bg-medical-50' : ''
                            }`}
                          >
                            {selectedCoils.includes(opt.value) ? (
                              <CheckCircle2 className="w-4 h-4 text-medical-600 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-border flex-shrink-0" />
                            )}
                            <span className="text-sm text-foreground">{opt.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedCoils.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedCoils.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 bg-medical-50 text-medical-700 px-2 py-0.5 rounded text-xs"
                          >
                            {c}
                            <button
                              onClick={() => toggleCoil(c)}
                              className="hover:text-medical-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label flex items-center justify-between">
                      <span>是否增强</span>
                      {isEnhancedLocked && (
                        <span className="text-xs text-risk-warning">
                          <Lock className="w-3 h-3 inline mr-0.5" />
                          按检查单锁定
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => !isEnhancedLocked && setFilters({ isEnhanced: !filters.isEnhanced })}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                        filters.isEnhanced ? 'bg-medical-500' : 'bg-gray-300'
                      } ${isEnhancedLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          filters.isEnhanced ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="form-label">时段偏好</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TIME_PREFERENCES.map((pref) => (
                        <button
                          key={pref.value}
                          type="button"
                          onClick={() => setTimePreference(pref.value)}
                          className={`py-2 px-2 rounded-md border text-xs font-medium transition-all ${
                            timePreference === pref.value
                              ? 'border-medical-500 bg-medical-50 text-medical-700'
                              : 'border-border bg-white text-muted-foreground hover:border-medical-300'
                          }`}
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="data-card text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slot-available border border-risk-safe/30" />
                  <span>可预约</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slot-booked border border-gray-200" />
                  <span>已预约</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slot-full border border-risk-absolute/20" />
                  <span>禁忌/已满</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slot-selected border border-medical-500" />
                  <span>已选中</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <div className="data-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'day'
                        ? 'bg-white text-medical-600 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    日视图
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'week'
                        ? 'bg-white text-medical-600 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    周视图
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  当前筛选：
                  <span className="font-semibold text-risk-safe ml-1">
                    {filteredSlots.length}
                  </span>
                  个可用时段
                </div>
              </div>

              <div className="p-5">
                {viewMode === 'day' ? (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDateChange(-1)}
                          className="btn-ghost !px-2 !py-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="min-w-[140px] text-center">
                          <div className="text-lg font-bold text-foreground">
                            {formatDateDisplay(formatDate(currentDate))}
                          </div>
                          {formatDate(currentDate) === formatDate(today) && (
                            <div className="text-xs text-medical-600 font-medium">今天</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDateChange(1)}
                          className="btn-ghost !px-2 !py-1.5"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleToday}
                          className="btn-secondary ml-2 !py-1.5 !px-3 text-xs"
                        >
                          今天
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        <div className="grid gap-2">
                          {machines.map((machine) => {
                            const machineSlots = daySlots.filter(
                              (s) => s.machineId === machine.id,
                            );
                            return (
                              <div key={machine.id} className="grid grid-cols-[180px_repeat(10,1fr)] gap-2 items-center">
                                <div className="pr-2">
                                  <div className="text-sm font-semibold text-foreground">
                                    {machine.roomNo}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {machine.model}
                                  </div>
                                </div>
                                {timeSlots.map((time) => {
                                  const slot = machineSlots.find(
                                    (s) => s.startTime === time,
                                  );
                                  if (!slot) {
                                    return (
                                      <div
                                        key={time}
                                        className="slot-cell slot-booked cursor-not-allowed opacity-40"
                                      >
                                        -
                                      </div>
                                    );
                                  }
                                  const slotClass = getSlotClass(slot);
                                  const canInteract = bookingAbility.canBook && slot.isAvailable && (!order.isEnhanced || slot.supportsEnhanced);
                                  return (
                                    <div
                                      key={time}
                                      onClick={() => canInteract && handleSlotClick(slot)}
                                      className={`${slotClass} ${canInteract ? '' : 'cursor-not-allowed'}`}
                                      title={
                                        !slot.isAvailable
                                          ? `${getPatientNameForSlot(slot)}`
                                          : order.isEnhanced && !slot.supportsEnhanced
                                            ? '该时段不支持增强扫描'
                                            : `${slot.startTime}-${slot.endTime} · ${slot.coilType}`
                                      }
                                    >
                                      {slot.startTime}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2">
                        <div></div>
                        {weekSlots.map((d) => {
                          const isToday = formatDate(d) === formatDate(today);
                          return (
                            <div
                              key={d.toISOString()}
                              className={`text-center py-2 rounded-md ${
                                isToday ? 'bg-medical-50 text-medical-700' : ''
                              }`}
                            >
                              <div className="text-sm font-semibold">
                                {d.getMonth() + 1}/{d.getDate()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                              </div>
                              {isToday && (
                                <div className="text-xs text-medical-600 font-medium">今天</div>
                              )}
                            </div>
                          );
                        })}

                        {machines.map((machine) => (
                          <>
                            <div
                              key={machine.id}
                              className="flex items-center pr-2 py-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {machine.roomNo}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {machine.model}
                                </div>
                              </div>
                            </div>
                            {weekSlots.map((d) => {
                              const stats = getWeekStats(d, machine.id);
                              const dateStr = formatDate(d);
                              const hasAvailable = stats.available > 0;
                              const isPast = d < today;
                              return (
                                <div
                                  key={`${machine.id}-${dateStr}`}
                                  className={`rounded-md border p-3 text-center transition-all ${
                                    isPast
                                      ? 'bg-muted/30 border-border opacity-50'
                                      : hasAvailable
                                        ? 'border-risk-safe/30 bg-risk-safe/5 hover:bg-risk-safe/10 cursor-pointer'
                                        : 'border-border bg-muted/30'
                                  } ${!bookingAbility.canBook ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (bookingAbility.canBook && hasAvailable && !isPast) {
                                      setCurrentDate(d);
                                      setViewMode('day');
                                    }
                                  }}
                                >
                                  <div className="text-lg font-bold text-foreground">
                                    {stats.total}
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-1">时段</div>
                                  <div
                                    className={`text-sm font-semibold ${
                                      hasAvailable ? 'text-risk-safe' : 'text-muted-foreground'
                                    }`}
                                  >
                                    {stats.available} 可用
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookingAbility.canBook && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white/95 backdrop-blur-sm shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="grid grid-cols-3 gap-6 items-center">
              <div>
                {selectedSlot ? (
                  <div className="data-card !p-3 !shadow-none">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <CheckCircle2 className="w-4 h-4 text-medical-600" />
                      <span className="font-semibold text-medical-700">已选择时段</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">日期：</span>
                        <span className="font-medium text-foreground">
                          {formatDateDisplay(selectedSlot.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">时间：</span>
                        <span className="font-medium text-foreground">
                          {selectedSlot.startTime}-{selectedSlot.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">机房：</span>
                        <span className="font-medium text-foreground">
                          {machines.find((m) => m.id === selectedSlot.machineId)?.roomNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground">线圈：</span>
                        <span className="font-medium text-foreground">{selectedSlot.coilType}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    请在上方时段表中选择一个时段
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                  <span>检查时间约 30-45 分钟，请合理安排</span>
                </div>
                {order.isEnhanced && (
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                    <span>增强扫描需预留额外 15-30 分钟</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClearSelection}
                  disabled={!selectedSlot}
                >
                  <X className="w-4 h-4" />
                  清空选择
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!selectedSlot}
                >
                  <Check className="w-4 h-4" />
                  确认预约
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-medical-50/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-medical-600" />
                <h3 className="text-lg font-bold text-foreground">确认预约信息</h3>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setShowConfirmModal(false)}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-medical-100 flex items-center justify-center">
                    <span className="text-medical-700 font-bold text-sm">
                      {patient.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{patient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · 病历号{' '}
                      {patient.medicalRecordNo}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">检查部位</div>
                    <div className="font-medium">{BODY_PART_LABELS[order.bodyPart]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">检查方式</div>
                    <div className="font-medium">
                      {order.isEnhanced ? '增强扫描' : '平扫'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">预约日期</div>
                    <div className="font-medium">{formatDateDisplay(selectedSlot.date)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">预约时段</div>
                    <div className="font-medium">
                      {selectedSlot.startTime} - {selectedSlot.endTime}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">机房</div>
                    <div className="font-medium">
                      {machines.find((m) => m.id === selectedSlot.machineId)?.roomNo}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">线圈</div>
                    <div className="font-medium">{selectedSlot.coilType}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">预约须知</div>
                    <ul className="text-xs space-y-0.5 opacity-90">
                      <li>• 请提前 15 分钟到达影像科登记</li>
                      <li>• 如需取消请提前 24 小时通知预约中心</li>
                      <li>• {order.isEnhanced ? '增强检查前 6 小时禁食禁水' : '去除所有金属物品'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/30">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmAppointment}
              >
                <Printer className="w-4 h-4" />
                确认并打印核验单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


