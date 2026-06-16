import { useEffect, useMemo, useState } from 'react';
import {
  format,
  startOfToday,
  startOfMonth,
  endOfToday,
  endOfMonth,
  subDays,
} from 'date-fns';
import {
  ClipboardList,
  CalendarCheck2,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart,
  TrendingUp,
  Building,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Line,
  PieChart as RePieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import useStatisticsStore from '@/stores/statisticsStore';
import usePatientStore from '@/stores/patientStore';
import { BODY_PART_LABELS, type CallbackStatus } from '@/types';
import { cn } from '@/lib/utils';

type DateRangePreset = 'today' | '7days' | '30days' | 'month' | 'custom';

const CALLBACK_STATUS_LABELS: Record<CallbackStatus, string> = {
  sent: '已发送',
  replied: '已回复',
  pending: '待处理',
};

const CALLBACK_STATUS_COLORS: Record<CallbackStatus, string> = {
  sent: 'status-warning',
  replied: 'status-safe',
  pending: 'status-pending',
};

const BAR_GRADIENT_COLORS = ['#93C5FD', '#60A5FA', '#3B82F6', '#1E6FD9', '#1a5fc0', '#174fa6'];

const PIE_MEDICAL_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#1E6FD9',
  '#22C55E',
  '#06B6D4',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

function pct(value: number, total: number): string {
  if (total === 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
}

export default function Statistics() {
  const { statistics, trendData, loadStatistics, loadTrendData } = useStatisticsStore();
  const { patients, orders } = usePatientStore();

  const [preset, setPreset] = useState<DateRangePreset>('7days');
  const [startDate, setStartDate] = useState<string>(format(subDays(startOfToday(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfToday(), 'yyyy-MM-dd'));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadStatistics(startDate, endDate);
    loadTrendData(30);
  }, [startDate, endDate, loadStatistics, loadTrendData]);

  const handlePresetChange = (p: DateRangePreset) => {
    setPreset(p);
    const today = new Date();
    switch (p) {
      case 'today': {
        const s = format(startOfToday(), 'yyyy-MM-dd');
        const e = format(endOfToday(), 'yyyy-MM-dd');
        setStartDate(s);
        setEndDate(e);
        break;
      }
      case '7days': {
        const s = format(subDays(startOfToday(), 6), 'yyyy-MM-dd');
        const e = format(endOfToday(), 'yyyy-MM-dd');
        setStartDate(s);
        setEndDate(e);
        break;
      }
      case '30days': {
        const s = format(subDays(startOfToday(), 29), 'yyyy-MM-dd');
        const e = format(endOfToday(), 'yyyy-MM-dd');
        setStartDate(s);
        setEndDate(e);
        break;
      }
      case 'month': {
        const s = format(startOfMonth(today), 'yyyy-MM-dd');
        const e = format(endOfMonth(today), 'yyyy-MM-dd');
        setStartDate(s);
        setEndDate(e);
        break;
      }
      default:
        break;
    }
  };

  const rejectionReasonsData = useMemo(() => {
    return statistics?.rejectionReasons ?? [];
  }, [statistics]);

  const topRiskData = useMemo(() => {
    return (statistics?.topRiskFlags ?? []).slice().sort((a, b) => b.count - a.count);
  }, [statistics]);

  const totalRiskCount = useMemo(() => {
    return topRiskData.reduce((sum, r) => sum + r.count, 0);
  }, [topRiskData]);

  const trendLineData = useMemo(() => {
    if (trendData.length === 0) return [];
    const result = trendData.map((item, index, arr) => {
      let ma7 = 0;
      let windowCount = 0;
      for (let i = Math.max(0, index - 6); i <= index; i++) {
        ma7 += arr[i].rejected || 0;
        windowCount++;
      }
      return {
        ...item,
        ma7: windowCount > 0 ? Number((ma7 / windowCount).toFixed(2)) : 0,
      };
    });
    return result;
  }, [trendData]);

  const trendAvg = useMemo(() => {
    if (trendLineData.length === 0) return 0;
    const sum = trendLineData.reduce((s, d) => s + (d.rejected || 0), 0);
    return Number((sum / trendLineData.length).toFixed(2));
  }, [trendLineData]);

  const departmentRejectionData = useMemo(() => {
    const deptMap = new Map<string, { total: number; rejected: number }>();
    orders.forEach((order) => {
      const patient = patients.find((p) => p.id === order.patientId);
      if (!patient) return;
      const dept = patient.orderingDepartment;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { total: 0, rejected: 0 });
      }
      const entry = deptMap.get(dept)!;
      entry.total++;
      if (order.status === 'rejected') {
        entry.rejected++;
      }
    });
    return Array.from(deptMap.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        rejected: v.rejected,
        rate: v.total > 0 ? Number(((v.rejected / v.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [orders, patients]);

  const rejectionDetailList = useMemo(() => {
    const rejectedOrders = orders.filter((o) => o.status === 'rejected');
    const list = rejectedOrders.map((order) => {
      const patient = patients.find((p) => p.id === order.patientId);
      return {
        order,
        patient,
      };
    }).filter((item): item is { order: typeof orders[number]; patient: typeof patients[number] } => item.patient != null);

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      return list.filter(({ patient, order }) =>
        patient.name.toLowerCase().includes(kw) ||
        patient.medicalRecordNo.toLowerCase().includes(kw) ||
        patient.orderingDepartment.toLowerCase().includes(kw) ||
        patient.orderingDoctor.toLowerCase().includes(kw) ||
        BODY_PART_LABELS[order.bodyPart].includes(kw)
      );
    }
    return list;
  }, [orders, patients, searchKeyword]);

  const totalPages = Math.max(1, Math.ceil(rejectionDetailList.length / PAGE_SIZE));
  const paginatedList = rejectionDetailList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const headers = ['患者姓名', '病历号', '开单科室', '开单医生', '检查部位', '退回原因', '退回时间', '处理状态'];
    const rows = rejectionDetailList.map(({ patient, order }) => [
      patient.name,
      patient.medicalRecordNo,
      patient.orderingDepartment,
      patient.orderingDoctor,
      BODY_PART_LABELS[order.bodyPart],
      '绝对禁忌退回',
      format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm'),
      CALLBACK_STATUS_LABELS.pending,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `退单明细_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBarColorByRate = (rate: number) => {
    if (rate <= 5) return '#22C55E';
    if (rate <= 15) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据统计</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {startDate} ~ {endDate}
          </p>
        </div>
      </div>

      <div className="data-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {(['today', '7days', '30days', 'month'] as DateRangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  preset === p
                    ? 'bg-medical-500 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-medical-50 hover:text-medical-700'
                )}
              >
                {p === 'today' ? '今日' : p === '7days' ? '近7日' : p === '30days' ? '近30日' : '本月'}
              </button>
            ))}
            <button
              onClick={() => setPreset('custom')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                preset === 'custom'
                  ? 'bg-medical-500 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-medical-50 hover:text-medical-700'
              )}
            >
              自定义
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="form-input w-40"
            />
            <span className="text-muted-foreground">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="form-input w-40"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-medical-100 p-2">
                  <ClipboardList className="h-5 w-5 text-medical-600" />
                </div>
                <span className="data-stat-label">检查单总数</span>
              </div>
              <span className="data-stat-value text-medical-700">{statistics?.totalOrders ?? 0}</span>
              <span className="text-xs text-green-600">环比 +12.5%</span>
            </div>
          </div>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-green-100 p-2">
                  <CalendarCheck2 className="h-5 w-5 text-green-600" />
                </div>
                <span className="data-stat-label">预约成功率</span>
              </div>
              <span className="data-stat-value text-green-600">
                {statistics ? pct(statistics.scheduledCount, statistics.totalOrders) : '0.0'}%
              </span>
              <span className="text-xs text-muted-foreground">
                {statistics?.scheduledCount ?? 0} / {statistics?.totalOrders ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-red-100 p-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <span className="data-stat-label">退单率</span>
              </div>
              <span className="data-stat-value text-red-600">
                {statistics ? pct(statistics.rejectionCount, statistics.totalOrders) : '0.0'}%
              </span>
              <span className="text-xs text-muted-foreground">
                {statistics?.rejectionCount ?? 0} 单
              </span>
            </div>
          </div>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-orange-100 p-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <span className="data-stat-label">平均筛查耗时</span>
              </div>
              <span className="data-stat-value text-orange-600">
                {statistics?.avgScreeningDurationMinutes ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">分钟 / 单</span>
            </div>
          </div>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-cyan-100 p-2">
                  <Activity className="h-5 w-5 text-cyan-600" />
                </div>
                <span className="data-stat-label">机房利用率</span>
              </div>
              <span className="data-stat-value text-cyan-600">
                {statistics ? (statistics.roomUtilizationRate * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-xs text-muted-foreground">整体时段占用</span>
            </div>
          </div>
        </div>

        <div className="data-card">
          <div className="flex items-start justify-between">
            <div className="data-stat">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-yellow-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="data-stat-label">到检后退检率</span>
              </div>
              <span className="data-stat-value text-yellow-600">
                {statistics ? (statistics.onSiteRejectionRate * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-xs text-muted-foreground">现场核验不通过</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 data-card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-medical-600" />
            <h2 className="text-lg font-semibold">退单原因分布</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rejectionReasonsData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ fill: 'rgba(30, 111, 217, 0.05)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 12 }}>
                  {rejectionReasonsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_GRADIENT_COLORS[index % BAR_GRADIENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="data-card">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-medical-600" />
            <h2 className="text-lg font-semibold">高频风险项排行</h2>
          </div>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={topRiskData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="label"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {topRiskData.map((_, index) => (
                    <Cell key={`pie-cell-${index}`} fill={PIE_MEDICAL_COLORS[index % PIE_MEDICAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number, name: string) => [`${value} 次`, name]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-xs text-muted-foreground">风险总数</div>
              <div className="text-xl font-bold text-medical-700">共 {totalRiskCount} 项</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="data-card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-medical-600" />
            <h2 className="text-lg font-semibold">近30天退单趋势</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendLineData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E6FD9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1E6FD9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval={4}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={trendAvg}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label={{ value: `平均 ${trendAvg}`, position: 'insideTopRight', fontSize: 11, fill: '#64748b' }}
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  stroke="none"
                  fill="url(#areaRejected)"
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  name="退单数"
                  stroke="#1E6FD9"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1E6FD9' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="ma7"
                  name="7日移动平均"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="data-card">
          <div className="mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-medical-600" />
            <h2 className="text-lg font-semibold">各科室退单率对比</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentRejectionData}
                layout="vertical"
                barCategoryGap="40%"
                margin={{ top: 10, right: 40, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number, _name, props) => {
                    const d = props.payload;
                    return [`${value}% (${d.rejected}/${d.total})`, '退单率'];
                  }}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 6, 6, 0]}
                  label={{
                    position: 'right',
                    fontSize: 12,
                    formatter: (v: number) => `${v}%`,
                  }}
                >
                  {departmentRejectionData.map((entry, index) => (
                    <Cell key={`dept-bar-${index}`} fill={getBarColorByRate(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="data-card">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold">退单明细</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索姓名/病历号/科室..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="form-input pl-9 w-64"
              />
            </div>
            <button onClick={exportCSV} className="btn-ghost">
              <Download className="h-4 w-4" />
              导出 CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">患者姓名</th>
                <th className="table-th">病历号</th>
                <th className="table-th">开单科室</th>
                <th className="table-th">开单医生</th>
                <th className="table-th">检查部位</th>
                <th className="table-th">退回原因</th>
                <th className="table-th">退回时间</th>
                <th className="table-th">处理状态</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-td text-center py-8 text-muted-foreground">
                    暂无退单明细
                  </td>
                </tr>
              ) : (
                paginatedList.map(({ patient, order }) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="table-td font-medium">{patient.name}</td>
                    <td className="table-td font-mono text-sm">{patient.medicalRecordNo}</td>
                    <td className="table-td">{patient.orderingDepartment}</td>
                    <td className="table-td">{patient.orderingDoctor}</td>
                    <td className="table-td">{BODY_PART_LABELS[order.bodyPart]}</td>
                    <td className="table-td text-red-600">绝对禁忌退回</td>
                    <td className="table-td text-muted-foreground">
                      {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="table-td">
                      <span className={cn('status-badge', CALLBACK_STATUS_COLORS.pending)}>
                        {CALLBACK_STATUS_LABELS.pending}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {rejectionDetailList.length} 条，每页 {PAGE_SIZE} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-all',
                  p === page
                    ? 'bg-medical-500 text-white'
                    : 'border border-input bg-background hover:bg-accent'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-sm transition-all hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
