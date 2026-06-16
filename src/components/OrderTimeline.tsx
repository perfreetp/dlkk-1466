import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ClipboardList,
  FileCheck,
  CalendarClock,
  Send,
  Stethoscope,
  Printer,
  AlertCircle,
  CircleCheck,
  ChevronRight,
  Upload,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useScreeningStore from '@/stores/screeningStore';
import useSchedulingStore from '@/stores/schedulingStore';
import type { ExaminationOrder } from '@/types';
import { ORDER_STATUS_LABELS, BODY_PART_LABELS, CONCLUSION_RESULT_LABELS } from '@/types';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  key: string;
  label: string;
  icon: typeof ClipboardList;
  status: 'done' | 'active' | 'pending';
  time?: string;
  route?: string;
  note?: string;
  color: string;
}

interface OrderTimelineProps {
  order: ExaminationOrder;
  compact?: boolean;
}

function generateTimeline(
  order: ExaminationOrder,
  storeData: {
    hasConclusion: boolean;
    hasReview: boolean;
    hasMaterials: boolean;
    allMaterialsUploaded: boolean;
    hasAppointment: boolean;
    hasRejection: boolean;
    hasReverify: boolean;
  },
): TimelineStep[] {
  const statusOrder: ExaminationOrder['status'][] = [
    'pending_screening',
    'screening_done',
    'review_pending',
    'review_done',
    'scheduling_pending',
    'scheduled',
    'reverify_pending',
    'completed',
  ];
  const currentIdx = statusOrder.indexOf(order.status);
  const atLeast = (s: ExaminationOrder['status']) =>
    currentIdx >= 0 && statusOrder.indexOf(s) <= currentIdx;

  const steps: TimelineStep[] = [];

  const screeningDone = storeData.hasConclusion;
  steps.push({
    key: 'screening',
    label: '问卷筛查',
    icon: ClipboardList,
    status: screeningDone
      ? 'done'
      : order.status === 'pending_screening'
        ? 'active'
        : 'pending',
    time: storeData.hasConclusion ? undefined : undefined,
    route: 'screening',
    color: 'bg-medical-500',
  });

  const reviewDone = storeData.hasReview;
  const materialNote = storeData.hasMaterials
    ? storeData.allMaterialsUploaded
      ? '材料已补齐'
      : `待补齐 ${storeData.hasMaterials && !storeData.allMaterialsUploaded ? '' : ''}材料`
    : undefined;
  steps.push({
    key: 'review',
    label: '人工复核',
    icon: FileCheck,
    status: reviewDone
      ? 'done'
      : order.status === 'review_pending' || order.status === 'screening_done'
        ? 'active'
        : 'pending',
    route: 'review',
    note: materialNote,
    color: 'bg-amber-500',
  });

  if (storeData.hasMaterials) {
    steps.push({
      key: 'materials',
      label: '补齐材料',
      icon: Upload,
      status: storeData.allMaterialsUploaded ? 'done' : 'active',
      route: 'review',
      color: 'bg-orange-500',
    });
  }

  const schedulingDone = order.status === 'scheduled' || atLeast('scheduled');
  steps.push({
    key: 'scheduling',
    label: '预约排班',
    icon: CalendarClock,
    status: schedulingDone
      ? 'done'
      : order.status === 'scheduling_pending' || order.status === 'review_done'
        ? 'active'
        : 'pending',
    route: 'scheduling',
    color: 'bg-green-500',
  });

  if (order.status === 'scheduled' || storeData.hasAppointment) {
    steps.push({
      key: 'print',
      label: '核验单打印',
      icon: Printer,
      status: storeData.hasAppointment ? 'done' : 'active',
      route: 'print',
      color: 'bg-teal-500',
    });
  }

  if (storeData.hasRejection || order.status === 'rejected') {
    steps.push({
      key: 'callback',
      label: '退回开单医生',
      icon: Send,
      status: 'done',
      route: 'callback',
      color: 'bg-red-500',
    });
  }

  if (atLeast('reverify_pending') || schedulingDone) {
    const reverifyDone = order.status === 'completed';
    steps.push({
      key: 'reverify',
      label: '二次核验',
      icon: Stethoscope,
      status: reverifyDone
        ? 'done'
        : order.status === 'reverify_pending' || schedulingDone
          ? 'active'
          : 'pending',
      route: 'reverify',
      color: 'bg-purple-500',
    });
  }

  return steps;
}

export default function OrderTimeline({ order, compact }: OrderTimelineProps) {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const { getRejectionRecord, getOrdersByPatient } = usePatientStore();
  const screeningState = useScreeningStore();
  const { appointments } = useSchedulingStore();

  const conclusion = useMemo(
    () => screeningState.conclusions.find((c) => c.orderId === order.id),
    [screeningState.conclusions, order.id],
  );
  const rejection = getRejectionRecord(order.id);
  const hasAppointment = appointments.some((a) => a.orderId === order.id);
  const materialsRequired = conclusion?.materialsRequired || [];
  const allMaterialsUploaded =
    materialsRequired.length === 0 || materialsRequired.every((m) => m.uploaded);

  const steps = useMemo(
    () =>
      generateTimeline(order, {
        hasConclusion: !!conclusion,
        hasReview: !!conclusion?.reviewedAt || !!conclusion?.finalResult,
        hasMaterials: materialsRequired.length > 0,
        allMaterialsUploaded,
        hasAppointment,
        hasRejection: !!rejection,
        hasReverify: order.status === 'completed',
      }),
    [order, conclusion, materialsRequired, allMaterialsUploaded, hasAppointment, rejection],
  );

  const currentSegment = location.pathname.split('/').pop() || '';

  const handleStepClick = (step: TimelineStep) => {
    if (!step.route || !patientId) return;
    navigate(`/patients/${patientId}/${step.route}?orderId=${order.id}`);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.route === currentSegment;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepClick(step)}
                className={cn(
                  'group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all',
                  step.status === 'done'
                    ? 'text-foreground hover:bg-accent'
                    : step.status === 'active'
                      ? isCurrent
                        ? 'bg-medical-50 text-medical-700 font-medium'
                        : 'text-amber-700 hover:bg-amber-50'
                      : 'text-muted-foreground/60 hover:text-muted-foreground',
                )}
                disabled={!step.route}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full',
                    step.status === 'done'
                      ? `${step.color} text-white`
                      : step.status === 'active'
                        ? 'border-2 border-current'
                        : 'border border-muted-foreground/40',
                  )}
                >
                  {step.status === 'done' ? (
                    <CircleCheck className="h-3 w-3" />
                  ) : (
                    <Icon className="h-2.5 w-2.5" />
                  )}
                </span>
                <span className={cn(isCurrent && 'font-semibold')}>{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="data-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">检查单流转进度</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('status-badge',
            order.status === 'rejected' ? 'status-rejected' :
            order.status === 'completed' ? 'status-safe' :
            order.status === 'scheduled' ? 'status-safe' : 'status-warning'
          )}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className="text-muted-foreground">
            {BODY_PART_LABELS[order.bodyPart]}
            {order.isEnhanced ? '·增强' : '·平扫'}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.route === currentSegment;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(step)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all ring-2',
                    step.status === 'done'
                      ? `${step.color} text-white ring-transparent hover:scale-110`
                      : step.status === 'active'
                        ? isCurrent
                          ? 'bg-medical-500 text-white ring-medical-100'
                          : 'bg-white text-amber-600 ring-amber-200 hover:bg-amber-50'
                        : 'bg-muted/30 text-muted-foreground/50 ring-transparent hover:text-muted-foreground',
                  )}
                  disabled={!step.route}
                >
                  <Icon className="h-4 w-4" />
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'my-1 h-5 w-0.5',
                      step.status === 'done' ? step.color : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(step)}
                  className={cn(
                    'group text-left',
                    step.route && 'hover:text-medical-600',
                  )}
                  disabled={!step.route}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCurrent ? 'text-medical-700' : '',
                        step.status === 'pending' ? 'text-muted-foreground/60' : 'text-foreground',
                      )}
                    >
                      {step.label}
                    </span>
                    {step.status === 'done' && (
                      <CircleCheck className="h-3.5 w-3.5 text-green-600" />
                    )}
                    {step.status === 'active' && isCurrent && (
                      <span className="rounded-full bg-medical-100 px-1.5 py-0.5 text-[10px] font-medium text-medical-700">
                        当前
                      </span>
                    )}
                    {step.route && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </button>
                {(step.note || step.time) && (
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {step.note && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {step.note}
                      </span>
                    )}
                    {step.time && <span>{format(new Date(step.time), 'MM-dd HH:mm', { locale: zhCN })}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {conclusion && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">筛查结论</div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'status-badge',
                conclusion.finalResult === 'absolute_contraindication' || conclusion.result === 'absolute_contraindication'
                  ? 'status-rejected'
                  : conclusion.finalResult === 'materials_needed' || conclusion.result === 'materials_needed'
                    ? 'status-warning'
                    : 'status-safe',
              )}
            >
              {CONCLUSION_RESULT_LABELS[(conclusion.finalResult || conclusion.result)!]}
            </span>
            {conclusion.reasonSummary && (
              <span className="text-xs text-muted-foreground line-clamp-1">{conclusion.reasonSummary}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
