import { useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleDot,
  ClipboardList,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useScreeningStore from '@/stores/screeningStore';
import type { ExaminationOrder, OrderStatus, ConclusionResult } from '@/types';
import {
  BODY_PART_LABELS,
  ORDER_STATUS_LABELS,
  CONCLUSION_RESULT_LABELS,
} from '@/types';
import { cn } from '@/lib/utils';

const STATUS_ICON_MAP: Record<OrderStatus, typeof Circle> = {
  pending_screening: Circle,
  screening_done: CircleCheck,
  review_pending: CircleDot,
  review_done: CircleCheck,
  scheduling_pending: CircleDot,
  scheduled: CheckCircle2,
  reverify_pending: CircleDot,
  completed: CheckCircle2,
  rejected: XCircle,
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending_screening: 'bg-muted-foreground/40',
  screening_done: 'bg-medical-500',
  review_pending: 'bg-amber-500',
  review_done: 'bg-medical-500',
  scheduling_pending: 'bg-green-500',
  scheduled: 'bg-green-600',
  reverify_pending: 'bg-purple-500',
  completed: 'bg-green-700',
  rejected: 'bg-red-500',
};

interface OrderSwitcherProps {
  currentOrder: ExaminationOrder;
  compact?: boolean;
}

export default function OrderSwitcher({ currentOrder, compact }: OrderSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams<{ patientId: string }>();
  const { getOrdersByPatient } = usePatientStore();
  const screeningState = useScreeningStore();

  const [open, setOpen] = useState(false);

  const allOrders = useMemo(
    () => (patientId ? getOrdersByPatient(patientId) : [currentOrder]),
    [patientId, getOrdersByPatient, currentOrder],
  );

  const sortedOrders = useMemo(
    () =>
      [...allOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allOrders],
  );

  const orderToConclusion = useMemo(() => {
    const map = new Map<string, ConclusionResult | undefined>();
    for (const order of allOrders) {
      const c = screeningState.conclusions.find((x) => x.orderId === order.id);
      map.set(order.id, c ? (c.finalResult || c.result) : undefined);
    }
    return map;
  }, [allOrders, screeningState.conclusions]);

  const currentSegment = location.pathname.split('/').pop() || '';

  const switchToOrder = (order: ExaminationOrder) => {
    if (order.id === currentOrder.id) {
      setOpen(false);
      return;
    }
    const base = `/patients/${patientId}/${currentSegment}`;
    navigate(`${base}?orderId=${order.id}`);
    setOpen(false);
  };

  const currentConclusion = orderToConclusion.get(currentOrder.id);

  if (sortedOrders.length <= 1) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            currentOrder.isEnhanced
              ? 'bg-gradient-to-br from-medical-500 to-blue-600 text-white'
              : 'bg-muted/70 text-medical-700',
          )}
        >
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {BODY_PART_LABELS[currentOrder.bodyPart]} MRI
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                currentOrder.isEnhanced
                  ? 'bg-medical-100 text-medical-700'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {currentOrder.isEnhanced ? '增强扫描' : '平扫'}
            </span>
            <span className={cn('status-badge',
              currentOrder.status === 'rejected' ? 'status-rejected' :
              currentOrder.status === 'completed' ? 'status-safe' :
              currentOrder.status === 'scheduled' ? 'status-safe' :
              'status-warning'
            )}>
              {ORDER_STATUS_LABELS[currentOrder.status]}
            </span>
          </div>
          {currentConclusion && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {currentConclusion === 'absolute_contraindication' ? (
                <XCircle className="h-3 w-3 text-red-500" />
              ) : currentConclusion === 'materials_needed' ? (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
              结论：{CONCLUSION_RESULT_LABELS[currentConclusion]}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="group inline-flex items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs transition-all hover:border-medical-300 hover:bg-medical-50/50"
        >
          <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', STATUS_DOT[currentOrder.status])} />
          <span className="font-medium text-foreground">
            {BODY_PART_LABELS[currentOrder.bodyPart]}
            {currentOrder.isEnhanced ? '·增强' : '·平扫'}
          </span>
          <span className="text-muted-foreground/70">
            {ORDER_STATUS_LABELS[currentOrder.status]}
          </span>
          <span className="rounded bg-muted/70 px-1 py-0.5 text-[10px] text-muted-foreground">
            {sortedOrders.length}张
          </span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 w-72 origin-top-right rounded-lg border border-border bg-white shadow-lg ring-1 ring-black/5">
              <div className="border-b border-border px-3 py-2 text-[11px] font-medium text-muted-foreground">
                该患者共 {sortedOrders.length} 张检查单，点击切换
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {sortedOrders.map((order) => {
                  const isActive = order.id === currentOrder.id;
                  const c = orderToConclusion.get(order.id);
                  const StatusIcon = STATUS_ICON_MAP[order.status];
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => switchToOrder(order)}
                      className={cn(
                        'mb-0.5 flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors',
                        isActive
                          ? 'bg-medical-50 ring-1 ring-medical-200'
                          : 'hover:bg-muted/50',
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 flex h-7 w-7 items-center justify-center rounded-md',
                        isActive
                          ? order.isEnhanced
                            ? 'bg-medical-500 text-white'
                            : 'bg-medical-100 text-medical-700'
                          : 'bg-muted/60 text-muted-foreground',
                      )}>
                        <ClipboardList className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            'text-xs font-semibold',
                            isActive ? 'text-medical-800' : 'text-foreground',
                          )}>
                            {BODY_PART_LABELS[order.bodyPart]}
                          </span>
                          {order.isEnhanced ? (
                            <span className="rounded bg-medical-100 px-1 py-0.5 text-[9px] font-medium text-medical-700">
                              增强
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                              平扫
                            </span>
                          )}
                          {isActive && (
                            <span className="rounded bg-medical-600 px-1 py-0.5 text-[9px] font-medium text-white">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[order.status])} />
                          <span className="text-[11px] text-muted-foreground">
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <span className="mx-0.5 h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[11px] text-muted-foreground/80">
                            {format(new Date(order.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                          </span>
                        </div>
                        {c && (
                          <div className="mt-1 flex items-center gap-1 text-[11px]">
                            {c === 'absolute_contraindication' ? (
                              <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                            ) : c === 'materials_needed' ? (
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            )}
                            <span className="truncate text-muted-foreground">
                              {CONCLUSION_RESULT_LABELS[c]}
                            </span>
                          </div>
                        )}
                      </div>
                      <StatusIcon className={cn(
                        'mt-1 h-3.5 w-3.5 flex-shrink-0',
                        order.status === 'rejected'
                          ? 'text-red-500'
                          : order.status === 'completed' || order.status === 'scheduled'
                            ? 'text-green-500'
                            : 'text-muted-foreground/60',
                      )} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="data-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">检查单切换</h3>
        <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
          共 {sortedOrders.length} 张
        </span>
      </div>
      <div className="space-y-2">
        {sortedOrders.map((order) => {
          const isActive = order.id === currentOrder.id;
          const c = orderToConclusion.get(order.id);
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => switchToOrder(order)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                isActive
                  ? 'border-medical-300 bg-medical-50/60 ring-1 ring-medical-200'
                  : 'border-border bg-white hover:border-medical-200 hover:bg-medical-50/30',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                  isActive
                    ? order.isEnhanced
                      ? 'bg-gradient-to-br from-medical-500 to-blue-600 text-white'
                      : 'bg-medical-100 text-medical-700'
                    : 'bg-muted/70 text-muted-foreground',
                )}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isActive ? 'text-medical-800' : 'text-foreground',
                    )}
                  >
                    {BODY_PART_LABELS[order.bodyPart]} MRI
                  </span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      order.isEnhanced
                        ? 'bg-medical-100 text-medical-700'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {order.isEnhanced ? '增强扫描' : '平扫'}
                  </span>
                  {isActive && (
                    <span className="rounded-full bg-medical-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      当前打开
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn('status-badge',
                    order.status === 'rejected' ? 'status-rejected' :
                    order.status === 'completed' ? 'status-safe' :
                    order.status === 'scheduled' ? 'status-safe' : 'status-warning'
                  )}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-[11px]">
                    {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                </div>
                {c && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {c === 'absolute_contraindication' ? (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    ) : c === 'materials_needed' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    <span className="text-muted-foreground">
                      结论：{CONCLUSION_RESULT_LABELS[c]}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
