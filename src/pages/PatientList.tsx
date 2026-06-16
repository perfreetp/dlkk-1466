import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import {
  BODY_PART_LABELS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type Patient,
  type ExaminationOrder,
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

const STATUS_FILTER_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending_screening', label: '待筛查' },
  { value: 'screening_done', label: '筛查完成' },
  { value: 'review_pending', label: '待复核' },
  { value: 'scheduled', label: '已预约' },
  { value: 'rejected', label: '已退回' },
];

const PAGE_SIZE = 10;

export default function PatientList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { patients, orders, findPatientsByKeyword } = usePatientStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
    (searchParams.get('status') as OrderStatus) || 'all',
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (statusFilter !== 'all') {
      setSearchParams({ status: statusFilter });
    } else {
      searchParams.delete('status');
      setSearchParams(searchParams);
    }
    setCurrentPage(1);
  }, [statusFilter]);

  const filteredPatients = useMemo(() => {
    const matchedPatients = searchKeyword.trim()
      ? findPatientsByKeyword(searchKeyword)
      : patients;

    if (statusFilter === 'all') {
      return matchedPatients;
    }

    const ordersWithStatus = orders.filter((o) => o.status === statusFilter);
    const patientIdsWithStatus = new Set(ordersWithStatus.map((o) => o.patientId));
    return matchedPatients.filter((p) => patientIdsWithStatus.has(p.id));
  }, [patients, orders, searchKeyword, statusFilter, findPatientsByKeyword]);

  const patientOrdersMap = useMemo(() => {
    const map = new Map<string, ExaminationOrder[]>();
    for (const order of orders) {
      const existing = map.get(order.patientId) || [];
      map.set(order.patientId, [...existing, order]);
    }
    return map;
  }, [orders]);

  const tableData = useMemo(() => {
    const data: Array<{ patient: Patient; order: ExaminationOrder }> = [];
    for (const patient of filteredPatients) {
      const patientOrders = patientOrdersMap.get(patient.id) || [];
      const sortedOrders = [...patientOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (statusFilter !== 'all') {
        const matchedOrder = sortedOrders.find((o) => o.status === statusFilter);
        if (matchedOrder) {
          data.push({ patient, order: matchedOrder });
        }
      } else if (sortedOrders.length > 0) {
        data.push({ patient, order: sortedOrders[0] });
      }
    }
    return data.sort(
      (a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime(),
    );
  }, [filteredPatients, patientOrdersMap, statusFilter]);

  const totalCount = tableData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedData = tableData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const handleActionClick = (patient: Patient, order: ExaminationOrder) => {
    switch (order.status) {
      case 'pending_screening':
      case 'screening_done':
        navigate(`/patients/${patient.id}/screening?orderId=${order.id}`);
        break;
      case 'review_pending':
      case 'review_done':
        navigate(`/patients/${patient.id}/review?orderId=${order.id}`);
        break;
      case 'scheduling_pending':
      case 'scheduled':
        navigate(`/patients/${patient.id}/scheduling?orderId=${order.id}`);
        break;
      case 'reverify_pending':
      case 'completed':
        navigate(`/patients/${patient.id}/reverify?orderId=${order.id}`);
        break;
      case 'rejected':
        navigate(`/patients/${patient.id}/callback?orderId=${order.id}`);
        break;
      default:
        navigate(`/patients/${patient.id}/scheduling?orderId=${order.id}`);
        break;
    }
  };

  const getActionButton = (patient: Patient, order: ExaminationOrder) => {
    const btnBase = (bg: string, label: string) => (
      <button
        onClick={() => handleActionClick(patient, order)}
        className="text-xs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          borderRadius: '0.375rem',
          padding: '0.4rem 0.875rem',
          fontSize: '0.75rem',
          fontWeight: '500',
          backgroundColor: bg,
          color: 'white',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s',
        }}
      >
        {label}
      </button>
    );
    switch (order.status) {
      case 'pending_screening':
      case 'screening_done':
        return btnBase('#1E6FD9', '筛查问卷');
      case 'review_pending':
      case 'review_done':
        return btnBase('#F59E0B', '人工复核');
      case 'scheduling_pending':
        return btnBase('#22C55E', '预约排班');
      case 'scheduled':
        return (
          <div className="flex items-center gap-1.5">
            {btnBase('#22C55E', '查看预约')}
            <button
              onClick={() => navigate(`/patients/${patient.id}/print?orderId=${order.id}`)}
              className="btn-ghost text-xs px-2"
            >
              打印
            </button>
          </div>
        );
      case 'reverify_pending':
        return btnBase('#8B5CF6', '二次核验');
      case 'completed':
        return btnBase('#10B981', '核验记录');
      case 'rejected':
        return btnBase('#EF4444', '结果回传');
      default:
        return btnBase('#1E6FD9', '详情');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">患者列表</h1>

      <div className="data-card">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="搜索患者姓名/病历号/手机号"
                className="form-input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="form-select w-40"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate('/patients/register')}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            新患者登记
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">患者信息</th>
                <th className="table-th">病历号</th>
                <th className="table-th">检查部位</th>
                <th className="table-th">增强</th>
                <th className="table-th">开单科室</th>
                <th className="table-th">状态</th>
                <th className="table-th">登记时间</th>
                <th className="table-th">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-td py-12 text-center text-muted-foreground">
                    暂无患者数据
                  </td>
                </tr>
              ) : (
                pagedData.map(({ patient, order }) => (
                  <tr key={`${patient.id}-${order.id}`}>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white',
                            patient.gender === 'male' ? 'bg-medical-500' : 'bg-pink-500',
                          )}
                        >
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {patient.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {patient.gender === 'male' ? '男' : '女'}，{patient.age}岁
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{patient.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-sm">{patient.medicalRecordNo}</td>
                    <td className="table-td">{BODY_PART_LABELS[order.bodyPart]}</td>
                    <td className="table-td">
                      {order.isEnhanced ? (
                        <span className="status-badge status-pending">增强</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">平扫</span>
                      )}
                    </td>
                    <td className="table-td">{patient.orderingDepartment}</td>
                    <td className="table-td">
                      <span className={cn('status-badge', STATUS_COLOR_MAP[order.status])}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="table-td text-muted-foreground">
                      {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="table-td">{getActionButton(patient, order)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">共 {totalCount} 条记录</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            >
              首页
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (totalPages <= 7) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                        page === currentPage
                          ? 'bg-medical-500 text-white'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {page}
                    </button>
                  );
                }
                if (page === 1 || page === totalPages) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                        page === currentPage
                          ? 'bg-medical-500 text-white'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {page}
                    </button>
                  );
                }
                if (page >= currentPage - 1 && page <= currentPage + 1) {
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                        page === currentPage
                          ? 'bg-medical-500 text-white'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {page}
                    </button>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span
                      key={page}
                      className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            >
              末页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
