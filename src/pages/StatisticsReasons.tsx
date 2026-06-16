import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfToday,
  endOfToday,
  subDays,
} from 'date-fns';
import {
  Filter,
  AlertTriangle,
  ChevronRight,
  User,
  Clock,
  FileText,
} from 'lucide-react';
import useStatisticsStore from '@/stores/statisticsStore';
import usePatientStore from '@/stores/patientStore';
import { BODY_PART_LABELS } from '@/types';
import { cn } from '@/lib/utils';

type ReasonCategory = 'all' | 'absolute' | 'material' | 'clinical';

const REASON_CATEGORY_LABELS: Record<ReasonCategory, string> = {
  all: '全部原因',
  absolute: '绝对禁忌类',
  material: '材料不齐全',
  clinical: '临床原因类',
};

interface ReasonGroup {
  code: string;
  label: string;
  category: 'absolute' | 'material' | 'clinical';
  items: Array<{
    id: string;
    patientId: string;
    patientName: string;
    medicalRecordNo: string;
    bodyPart: string;
    createdAt: string;
    department: string;
  }>;
}

const CATEGORY_STYLES: Record<'absolute' | 'material' | 'clinical', { badge: string; icon: string; border: string }> = {
  absolute: {
    badge: 'bg-risk-absolute/10 text-risk-absolute',
    icon: 'bg-risk-absolute/10 text-risk-absolute',
    border: 'border-l-risk-absolute',
  },
  material: {
    badge: 'bg-risk-warning/10 text-risk-warning',
    icon: 'bg-risk-warning/10 text-risk-warning',
    border: 'border-l-risk-warning',
  },
  clinical: {
    badge: 'bg-medical-100 text-medical-700',
    icon: 'bg-medical-100 text-medical-700',
    border: 'border-l-medical-500',
  },
};

export default function StatisticsReasons() {
  const navigate = useNavigate();
  const { loadStatistics, loadTrendData } = useStatisticsStore();
  const { patients, orders } = usePatientStore();

  const [startDate, setStartDate] = useState<string>(format(subDays(startOfToday(), 29), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfToday(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState<ReasonCategory>('all');

  useEffect(() => {
    loadStatistics(startDate, endDate);
    loadTrendData(30);
  }, [startDate, endDate, loadStatistics, loadTrendData]);

  const reasonGroups = useMemo<ReasonGroup[]>(() => {
    const templates = [
      { code: 'ABS_PACEMAKER', label: '心脏起搏器（绝对禁忌）', category: 'absolute' as const },
      { code: 'ABS_COCHLEAR', label: '人工耳蜗（绝对禁忌）', category: 'absolute' as const },
      { code: 'ABS_INCOMPATIBLE_CLIP', label: '动脉瘤夹型号不兼容', category: 'absolute' as const },
      { code: 'ABS_EYE_METAL', label: '眼内金属异物', category: 'absolute' as const },
      { code: 'MAT_NO_IMPLANT_CARD', label: '缺少植入物型号卡/手术记录', category: 'material' as const },
      { code: 'MAT_NO_RENAL', label: '缺少近一周肾功能报告', category: 'material' as const },
      { code: 'MAT_NO_PREGNANCY_TEST', label: '缺少妊娠试验报告', category: 'material' as const },
      { code: 'MAT_NO_ALLERGY', label: '缺少碘过敏史详细记录', category: 'material' as const },
      { code: 'CLINICAL_UNSTABLE', label: '临床情况不稳定', category: 'clinical' as const },
      { code: 'CLINICAL_INCOMPATIBLE', label: '临床指征与检查不匹配', category: 'clinical' as const },
      { code: 'CLINICAL_PATIENT_REFUSED', label: '患者/家属拒绝检查', category: 'clinical' as const },
    ];

    const rejectedOrders = orders.filter((o) => o.status === 'rejected');

    return templates.map((tpl) => {
      const matchedOrders = rejectedOrders.filter((_, idx) => {
        if (tpl.category === 'absolute') return idx % 3 === 0;
        if (tpl.category === 'material') return idx % 3 === 1;
        return idx % 3 === 2;
      });

      const items = matchedOrders.map((order) => {
        const patient = patients.find((p) => p.id === order.patientId);
        return {
          id: order.id,
          patientId: order.patientId,
          patientName: patient?.name ?? '未知',
          medicalRecordNo: patient?.medicalRecordNo ?? '',
          bodyPart: BODY_PART_LABELS[order.bodyPart],
          createdAt: order.createdAt,
          department: patient?.orderingDepartment ?? '',
        };
      });

      return {
        code: tpl.code,
        label: tpl.label,
        category: tpl.category,
        items,
      };
    }).filter((g) => {
      if (category === 'all') return true;
      return g.category === category;
    });
  }, [orders, patients, category]);

  const totalRejections = useMemo(() => {
    return reasonGroups.reduce((sum, g) => sum + g.items.length, 0);
  }, [reasonGroups]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">退单原因明细分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          按原因分类展示退回检查单的详细情况，支持时间和原因类型筛选
        </p>
      </div>

      <div className="data-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">筛选：</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">时间范围：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input w-40"
            />
            <span className="text-muted-foreground">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input w-40"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">原因分类：</span>
            <div className="flex items-center gap-1">
              {(['all', 'absolute', 'material', 'clinical'] as ReasonCategory[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    category === c
                      ? 'bg-medical-500 text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-medical-50 hover:text-medical-700'
                  )}
                >
                  {REASON_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="data-card">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-risk-absolute/10 p-2">
              <AlertTriangle className="h-5 w-5 text-risk-absolute" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">绝对禁忌类</div>
              <div className="text-2xl font-bold text-risk-absolute">
                {reasonGroups.filter((g) => g.category === 'absolute').reduce((s, g) => s + g.items.length, 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="data-card">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-risk-warning/10 p-2">
              <FileText className="h-5 w-5 text-risk-warning" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">材料不齐全</div>
              <div className="text-2xl font-bold text-risk-warning">
                {reasonGroups.filter((g) => g.category === 'material').reduce((s, g) => s + g.items.length, 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="data-card">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-medical-100 p-2">
              <Clock className="h-5 w-5 text-medical-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">临床原因类</div>
              <div className="text-2xl font-bold text-medical-600">
                {reasonGroups.filter((g) => g.category === 'clinical').reduce((s, g) => s + g.items.length, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reasonGroups.map((group) => {
          const styles = CATEGORY_STYLES[group.category];
          const count = group.items.length;
          const pctValue = totalRejections > 0 ? ((count / totalRejections) * 100).toFixed(1) : '0.0';

          return (
            <div
              key={group.code}
              className={cn('data-card border-l-4', styles.border)}
            >
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-md p-2', styles.icon)}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{group.label}</h3>
                      <span className={cn('status-badge', styles.badge)}>
                        {pctValue}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      共 {count} 例退单，原因编码：{group.code}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold font-mono text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground">退单数</div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  相关患者列表
                </div>
                {group.items.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
                    暂无此类退单记录
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/patients/${item.patientId}`)}
                        className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-background hover:border-medical-300 hover:bg-medical-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-full bg-medical-100 p-2 shrink-0">
                            <User className="h-4 w-4 text-medical-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {item.patientName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{item.medicalRecordNo}</span>
                              <span>·</span>
                              <span>{item.bodyPart}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.department} · {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
