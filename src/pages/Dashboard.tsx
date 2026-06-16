import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Search,
  FileSearch,
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Activity,
  ChevronRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import usePatientStore from '@/stores/patientStore';
import useSchedulingStore from '@/stores/schedulingStore';
import useScreeningStore from '@/stores/screeningStore';
import {
  BODY_PART_LABELS,
  RISK_FLAG_LABELS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type RiskFlag,
  type Patient,
  type ExaminationOrder,
  type MRISlot,
} from '@/types';
import { cn } from '@/lib/utils';

const STATUS_COLOR_MAP: Record<OrderStatus, string> = {
  pending_screening: 'status-pending',
  screening_done: 'status-safe',
  review_pending: 'status-warning',
  review_done: 'status-safe',
  scheduling_pending: 'status-pending',
  scheduled: 'status-safe',
  reverify_pending: 'status-warning',
  completed: 'status-safe',
  rejected: 'status-rejected',
};

const PIE_COLORS = ['#1E6FD9', '#22C55E', '#06B6D4'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { patients, orders } = usePatientStore();
  const { machines, slots, appointments } = useSchedulingStore();
  const { riskFlags } = useScreeningStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const stats = useMemo(() => {
    const pendingScreening = orders.filter((o) => o.status === 'pending_screening').length;
    const reviewPending = orders.filter((o) => o.status === 'review_pending').length;
    const schedulingPending = orders.filter((o) => o.status === 'scheduling_pending').length;
    const reverifyPending = orders.filter((o) => o.status === 'reverify_pending').length;
    return { pendingScreening, reviewPending, schedulingPending, reverifyPending };
  }, [orders]);

  const highRiskList = useMemo(() => {
    const absoluteFlags = riskFlags.filter((r) => r.level === 'absolute_contraindication');
    return absoluteFlags
      .map((flag) => {
        const order = orders.find((o) => o.id === flag.orderId);
        const patient = order ? patients.find((p) => p.id === order.patientId) : null;
        if (!order || !patient) return null;
        return { flag, order, patient };
      })
      .filter(
        (item): item is { flag: RiskFlag; order: ExaminationOrder; patient: Patient } => item !== null,
      );
  }, [riskFlags, orders, patients]);

  const todayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const slot = slots.find((s) => s.id === apt.slotId);
      return slot && slot.date === todayStr;
    });
  }, [appointments, slots, todayStr]);

  const appointmentStats = useMemo(() => {
    const confirmed = todayAppointments.filter((a) => a.status === 'confirmed').length;
    const pending = todayAppointments.filter(
      (a) => a.status === 'confirmed' && a.reverifyStatus !== 'passed',
    ).length;
    const completed = todayAppointments.filter((a) => a.status === 'completed').length;
    return { confirmed, pending, completed };
  }, [todayAppointments]);

  const timeDistribution = useMemo(() => {
    const morning = todayAppointments.filter((apt) => {
      const slot = slots.find((s) => s.id === apt.slotId);
      if (!slot) return false;
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      return hour >= 8 && hour < 12;
    }).length;
    const afternoon = todayAppointments.filter((apt) => {
      const slot = slots.find((s) => s.id === apt.slotId);
      if (!slot) return false;
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      return hour >= 12 && hour < 17;
    }).length;
    const evening = todayAppointments.filter((apt) => {
      const slot = slots.find((s) => s.id === apt.slotId);
      if (!slot) return false;
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      return hour >= 17 && hour < 20;
    }).length;
    return [
      { name: '上午', value: morning },
      { name: '下午', value: afternoon },
      { name: '晚间', value: evening },
    ];
  }, [todayAppointments, slots]);

  const roomOccupancyData = useMemo(() => {
    const timeSlots: string[] = [];
    for (let h = 8; h < 18; h++) {
      timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    const todaySlots = slots.filter((s) => s.date === todayStr);

    return timeSlots.map((time) => {
      const record: Record<string, string | number> = { time };
      machines.forEach((machine) => {
        const matchingSlot = todaySlots.find(
          (s: MRISlot) => s.machineId === machine.id && s.startTime === time,
        );
        record[machine.roomNo] = matchingSlot && !matchingSlot.isAvailable ? 1 : 0;
      });
      return record;
    });
  }, [slots, machines, todayStr]);

  const recentPatients = useMemo(() => {
    const recentOrders = [...orders]
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    return recentOrders
      .map((order) => {
        const patient = patients.find((p) => p.id === order.patientId);
        if (!patient) return null;
        return { patient, order };
      })
      .filter(
        (item): item is { patient: Patient; order: ExaminationOrder } => item !== null,
      );
  }, [orders, patients]);

  const todayDateText = format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN });

  const getRoomBarColor = (index: number) => {
    const colors = ['#1E6FD9', '#22C55E', '#F59E0B'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">工作台</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayDateText}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-medical-100 p-2">
                  <Search className="h-5 w-5 text-medical-600" />
                </div>
                <span className="data-stat-label">待筛查</span>
              </div>
              <span className="data-stat-value text-medical-700">{stats.pendingScreening}</span>
              <span className="text-xs text-muted-foreground">待筛查检查单</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients?status=pending_screening')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-medical-600 hover:text-medical-700"
          >
            查看 <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-orange-100 p-2">
                  <FileSearch className="h-5 w-5 text-orange-600" />
                </div>
                <span className="data-stat-label">待复核</span>
              </div>
              <span className="data-stat-value text-orange-600">{stats.reviewPending}</span>
              <span className="text-xs text-muted-foreground">待复核检查单</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients?status=review_pending')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            查看 <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-green-100 p-2">
                  <CalendarDays className="h-5 w-5 text-green-600" />
                </div>
                <span className="data-stat-label">待排班</span>
              </div>
              <span className="data-stat-value text-green-600">{stats.schedulingPending}</span>
              <span className="text-xs text-muted-foreground">待排班检查单</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients?status=scheduling_pending')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
          >
            查看 <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-red-100 p-2">
                  <RefreshCw className="h-5 w-5 text-red-600" />
                </div>
                <span className="data-stat-label">待二次核验</span>
              </div>
              <span className="data-stat-value text-red-600">{stats.reverifyPending}</span>
              <span className="text-xs text-muted-foreground">待二次核验检查单</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients?status=reverify_pending')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
          >
            查看 <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 data-card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-risk-absolute" />
            <h2 className="text-lg font-semibold">高危预警看板</h2>
          </div>
          <div className="space-y-3">
            {highRiskList.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无高危预警记录</div>
            ) : (
              highRiskList.map(({ flag, order, patient }) => (
                <div
                  key={flag.id}
                  className="rounded-lg border border-risk-absolute/30 bg-risk-absolute/5 p-4 shadow-risk-high"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {patient.name}
                          {patient.gender === 'male' ? '男' : '女'}，{patient.age}岁
                        </span>
                        <span className="status-badge status-absolute">
                          {RISK_FLAG_LABELS[flag.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>检查部位：{BODY_PART_LABELS[order.bodyPart]}</span>
                        <span>录入时间：{format(new Date(flag.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        navigate(`/patients/${patient.id}/screening?orderId=${order.id}`)
                      }
                      className="btn-danger text-xs"
                    >
                      立即处理
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="data-card">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-medical-600" />
            <h2 className="text-lg font-semibold">今日预约</h2>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-medical-50 p-3 text-center">
              <div className="text-2xl font-bold text-medical-600">{appointmentStats.confirmed}</div>
              <div className="text-xs text-muted-foreground">已确认</div>
            </div>
            <div className="rounded-md bg-orange-50 p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{appointmentStats.pending}</div>
              <div className="text-xs text-muted-foreground">待到检</div>
            </div>
            <div className="rounded-md bg-green-50 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{appointmentStats.completed}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {timeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="data-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-medical-600" />
          <h2 className="text-lg font-semibold">今日机房时段占用</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomOccupancyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {machines.map((machine, index) => (
                <Bar
                  key={machine.id}
                  dataKey={machine.roomNo}
                  fill={getRoomBarColor(index)}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="data-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近登记患者</h2>
          <button
            onClick={() => navigate('/patients')}
            className="text-sm font-medium text-medical-600 hover:text-medical-700"
          >
            查看全部
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">姓名</th>
                <th className="table-th">检查部位</th>
                <th className="table-th">状态</th>
                <th className="table-th">录入时间</th>
                <th className="table-th">操作</th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map(({ patient, order }) => (
                <tr key={order.id}>
                  <td className="table-td font-medium">{patient.name}</td>
                  <td className="table-td">{BODY_PART_LABELS[order.bodyPart]}</td>
                  <td className="table-td">
                    <span className={cn('status-badge', STATUS_COLOR_MAP[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="table-td text-muted-foreground">
                    {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}
                  </td>
                  <td className="table-td">
                    {order.status === 'pending_screening' ? (
                      <button
                        onClick={() =>
                          navigate(`/patients/${patient.id}/screening?orderId=${order.id}`)
                        }
                        className="btn-primary text-xs"
                      >
                        去筛查
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="btn-ghost text-xs"
                      >
                        查看详情
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
