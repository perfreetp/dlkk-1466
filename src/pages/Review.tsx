import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useScreeningStore from '@/stores/screeningStore';
import useReviewStore from '@/stores/reviewStore';
import useAuthStore from '@/stores/authStore';
import {
  BODY_PART_LABELS,
  CONCLUSION_RESULT_LABELS,
  RISK_FLAG_LABELS,
  ORDER_STATUS_LABELS,
} from '@/types';
import { rejectionReasonTemplates, formatDate } from '@/data/mockData';
import type { ConclusionResult, MaterialType, RiskFlagType } from '@/types';
import OrderSwitcher from '@/components/OrderSwitcher';
import OrderTimeline from '@/components/OrderTimeline';

type TabKey = 'followup' | 'materials' | 'conclusion';

export default function Review() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder } = usePatientStore();
  const screeningState = useScreeningStore();
  const {
    followUpItems,
    loadReviewTasks,
    toggleFollowUpItem,
    approveMaterial,
    adjustConclusion,
    isAllFollowUpCompleted,
    isRiskFollowUpCompleted,
  } = useReviewStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('followup');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [itemAnswers, setItemAnswers] = useState<Record<string, string>>({});
  const [materialFileNames, setMaterialFileNames] = useState<Record<string, string>>({});

  const [adjustedResult, setAdjustedResult] = useState<ConclusionResult>('proceed');
  const [adjustReason, setAdjustReason] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>('');
  const [rejectAdditionalNote, setRejectAdditionalNote] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const order = currentOrder;
  const patient = currentPatient;

  const conclusion = useMemo(() => {
    if (!order) return undefined;
    return screeningState.conclusions.find((c) => c.orderId === order.id);
  }, [order, screeningState.conclusions]);

  useEffect(() => {
    if (patientId) {
      const orderId = searchParams.get('orderId') || undefined;
      setCurrentPatientAndOrder(patientId, orderId);
    }
  }, [patientId, searchParams, setCurrentPatientAndOrder]);

  useEffect(() => {
    if (currentOrder) {
      loadReviewTasks(currentOrder.id);
      const initialExpanded: Record<string, boolean> = {};
      const initialAnswers: Record<string, string> = {};
      for (const item of followUpItems) {
        initialExpanded[item.id] = !item.completed;
        if (item.answer) initialAnswers[item.id] = item.answer;
      }
      if (Object.keys(initialExpanded).length === 0) {
        setTimeout(() => {
          const items = useReviewStore.getState().followUpItems;
          const exp: Record<string, boolean> = {};
          const ans: Record<string, string> = {};
          for (const it of items) {
            exp[it.id] = !it.completed;
            if (it.answer) ans[it.id] = it.answer;
          }
          setExpandedItems(exp);
          setItemAnswers(ans);
        }, 100);
      } else {
        setExpandedItems(initialExpanded);
        setItemAnswers(initialAnswers);
      }
    }
  }, [currentOrder, loadReviewTasks]);

  useEffect(() => {
    if (conclusion?.result) {
      setAdjustedResult(conclusion.result === 'rejected' ? 'absolute_contraindication' : conclusion.result);
    }
  }, [conclusion]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const materialsRequired = conclusion?.materialsRequired || [];
  const allMaterialsUploaded =
    materialsRequired.length === 0 || materialsRequired.every((m) => m.uploaded);

  const completedCount = followUpItems.filter((i) => i.completed).length;
  const totalCount = followUpItems.length;
  const followUpProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;

  const hasAbsolute =
    conclusion?.result === 'absolute_contraindication' ||
    adjustedResult === 'absolute_contraindication';

  const handleCopyScript = async (itemId: string, script: string) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedItemId(itemId);
      setTimeout(() => setCopiedItemId(null), 1500);
    } catch {
      showToast('error', '复制失败');
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleMarkComplete = (itemId: string) => {
    toggleFollowUpItem(itemId, itemAnswers[itemId]);
    setExpandedItems((prev) => ({ ...prev, [itemId]: false }));
  };

  const handleMaterialUpload = (type: MaterialType) => {
    if (!order) return;
    const mockFileName = `${type}_${Date.now()}.pdf`;
    setMaterialFileNames((prev) => ({ ...prev, [type]: mockFileName }));
    approveMaterial(order.id, type);
    showToast('success', '材料上传审核通过');
  };

  const handleAdjustedResultChange = (val: ConclusionResult) => {
    setAdjustedResult(val);
  };

  const handleFinalReview = () => {
    if (!order || !patientId || !user) return;
    const riskStatus = isRiskFollowUpCompleted();
    if (!riskStatus.completed) {
      showToast('error', `还有 ${riskStatus.unfinishedCount} 项风险追问未完成，请先完成风险相关的电话随访`);
      return;
    }
    if (!allMaterialsUploaded) {
      const missingLabels = materialsRequired.filter((m) => !m.uploaded).map((m) => m.label);
      showToast('error', `缺少材料：${missingLabels.join('、')}`);
      return;
    }
    adjustConclusion(order.id, adjustedResult, user.id, adjustReason || undefined);
    navigate(`/patients/${patientId}/scheduling?orderId=${order.id}`);
  };

  const handleConfirmReject = () => {
    if (!order || !patientId || !user) return;
    if (!selectedRejectReason) {
      showToast('error', '请选择退回原因');
      return;
    }
    adjustConclusion(order.id, 'rejected', user.id, `${selectedRejectReason} ${rejectAdditionalNote}`);
    setShowRejectModal(false);
    navigate(`/patients/${patientId}/callback?orderId=${order.id}`);
  };

  if (!patient || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const currentResult: ConclusionResult =
    conclusion?.finalResult || conclusion?.result || 'proceed';

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="bg-gradient-to-r from-medical-500 to-medical-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl font-bold">{patient.name}</span>
                  <span className="text-sm opacity-90 bg-white/20 px-2 py-0.5 rounded">
                    病历号 {patient.medicalRecordNo}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded text-xs font-bold">
                    <AlertCircle className="w-3 h-3" />
                    人工复核中
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm opacity-95">
                  <span className="flex items-center gap-1.5">
                    <span className="opacity-70">检查部位</span>
                    <span className="font-medium">{BODY_PART_LABELS[order.bodyPart]}</span>
                  </span>
                  {order.isEnhanced && (
                    <span className="bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded text-xs font-bold">
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

      <div className="bg-white border-b border-border shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <OrderTimeline order={order} compact />
          <OrderSwitcher currentOrder={order} compact />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4 order-first">
            <OrderTimeline order={order} />
            <OrderSwitcher currentOrder={order} />
          </div>
          <div className="col-span-2">
            <div className="data-card p-0 overflow-hidden">
              <div className="flex border-b border-border">
                {[
                  { key: 'followup' as TabKey, label: '追问清单' },
                  { key: 'materials' as TabKey, label: '资料上传审核' },
                  { key: 'conclusion' as TabKey, label: '结论调整' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                      activeTab === tab.key
                        ? 'text-medical-600 bg-medical-50/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'followup' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        请逐项询问患者并勾选完成，未完成的追问无法通过复核
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {completedCount}/{totalCount} 项已完成
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-risk-safe rounded-full transition-all duration-500"
                          style={{ width: `${followUpProgress}%` }}
                        />
                      </div>
                    </div>

                    {followUpItems.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-risk-safe/60" />
                        <p className="text-sm">暂无追问项，无需电话随访</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {followUpItems.map((item) => {
                          const isCopied = copiedItemId === item.id;
                          const isExpanded = expandedItems[item.id] ?? !item.completed;
                          const riskLabel =
                            item.riskType in RISK_FLAG_LABELS
                              ? RISK_FLAG_LABELS[item.riskType as RiskFlagType]
                              : item.riskType === 'general'
                                ? '常规确认'
                                : item.riskType;

                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg border transition-all ${
                                item.completed
                                  ? 'border-risk-safe/30 bg-risk-safe/5'
                                  : 'border-border bg-white'
                              }`}
                            >
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <span className="flex-shrink-0 mt-0.5">
                                      {item.completed ? (
                                        <CheckCircle className="w-5 h-5 text-risk-safe" />
                                      ) : (
                                        <span className="w-5 h-5 flex items-center justify-center">
                                          <span className="w-2.5 h-2.5 rounded-full bg-risk-warning animate-pulse-slow" />
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4
                                          className={`font-semibold ${
                                            item.completed ? 'text-muted-foreground' : 'text-foreground'
                                          }`}
                                        >
                                          {item.question}
                                        </h4>
                                        <span className="status-badge bg-medical-50 text-medical-700 text-xs">
                                          {riskLabel}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyScript(item.id, item.standardScript)}
                                      className="btn-ghost !px-2.5 !py-1.5 text-xs"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      {isCopied ? '已复制' : '复制话术'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(item.id)}
                                      className="btn-ghost !px-2.5 !py-1.5 text-xs"
                                    >
                                      {isExpanded ? '收起' : '展开'}
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-4 ml-8 space-y-4">
                                    <div className="script-bubble">{item.standardScript}</div>
                                    <div>
                                      <label className="form-label text-xs">患者回答记录</label>
                                      <textarea
                                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                                        placeholder="患者回答记录..."
                                        value={itemAnswers[item.id] || ''}
                                        onChange={(e) =>
                                          setItemAnswers((prev) => ({
                                            ...prev,
                                            [item.id]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => handleMarkComplete(item.id)}
                                      >
                                        {item.completed ? '取消完成' : '标记完成'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'materials' && (
                  <div className="space-y-4">
                    {materialsRequired.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">无需补充材料</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {materialsRequired.map((mat) => {
                            const fileName =
                              materialFileNames[mat.type] || mat.fileName || undefined;
                            return (
                              <div
                                key={mat.type}
                                className="rounded-lg border border-border bg-white p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{mat.label}</span>
                                    {mat.uploaded ? (
                                      <span className="status-badge bg-risk-safe/10 text-risk-safe">
                                        <CheckCircle2 className="w-3 h-3" />
                                        已审核
                                      </span>
                                    ) : (
                                      <span className="status-badge bg-risk-absolute/10 text-risk-absolute">
                                        <AlertTriangle className="w-3 h-3" />
                                        待上传
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {mat.uploaded ? (
                                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <FileText className="w-5 h-5 text-medical-600" />
                                      <div>
                                        <div className="text-sm font-medium text-foreground">
                                          {fileName || `${mat.label}_已上传.pdf`}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          上传时间：
                                          {mat.uploadedAt
                                            ? formatDate(new Date(mat.uploadedAt))
                                            : new Date().toISOString().split('T')[0]}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn-ghost text-xs !px-3 !py-1.5"
                                      onClick={() => handleMaterialUpload(mat.type as MaterialType)}
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      重新上传
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => handleMaterialUpload(mat.type as MaterialType)}
                                    className="group cursor-pointer rounded-md border-2 border-dashed border-border bg-muted/20 hover:border-medical-400 hover:bg-medical-50/40 transition-all px-4 py-6 text-center"
                                  >
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-medical-500 transition-colors" />
                                    <div className="text-sm text-muted-foreground group-hover:text-medical-600 transition-colors">
                                      点击选择文件或拖拽文件到此处
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      支持 PDF、JPG、PNG 格式
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div
                          className={`rounded-lg border p-4 flex items-center gap-2 ${
                            allMaterialsUploaded
                              ? 'border-risk-safe/30 bg-risk-safe/5 text-risk-safe'
                              : 'border-risk-absolute/30 bg-risk-absolute/5 text-risk-absolute'
                          }`}
                        >
                          {allMaterialsUploaded ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                              <span className="text-sm font-medium">资料齐全</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                              <span className="text-sm font-medium">
                                缺失材料：
                                {materialsRequired
                                  .filter((m) => !m.uploaded)
                                  .map((m) => m.label)
                                  .join('、')}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'conclusion' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">系统自动结论</h3>
                      <div
                        className={`rounded-lg p-5 text-center ${
                          currentResult === 'absolute_contraindication'
                            ? 'status-absolute'
                            : currentResult === 'materials_needed'
                              ? 'status-warning'
                              : currentResult === 'rejected'
                                ? 'status-absolute'
                                : 'status-safe'
                        }`}
                      >
                        {currentResult === 'absolute_contraindication' ||
                        currentResult === 'rejected' ? (
                          <ShieldAlert className="w-12 h-12 mx-auto mb-2" />
                        ) : currentResult === 'materials_needed' ? (
                          <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                        ) : (
                          <ShieldCheck className="w-12 h-12 mx-auto mb-2" />
                        )}
                        <div className="text-xl font-bold">
                          {CONCLUSION_RESULT_LABELS[currentResult]}
                        </div>
                        {conclusion?.reasonSummary && (
                          <div className="text-xs mt-2 opacity-80 max-w-md mx-auto">
                            {conclusion.reasonSummary}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">调整结论</label>
                      <select
                        className="form-select"
                        value={adjustedResult}
                        onChange={(e) =>
                          handleAdjustedResultChange(e.target.value as ConclusionResult)
                        }
                      >
                        <option value="absolute_contraindication">
                          绝对禁忌 — 存在 MRI 检查绝对禁忌风险
                        </option>
                        <option value="materials_needed">
                          需补材料 — 缺少必要资料，补充后再评估
                        </option>
                        <option value="proceed">可继续预约 — 无明显禁忌，可安排检查</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">
                        调整理由 <span className="text-risk-absolute">*</span>
                      </label>
                      <textarea
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        placeholder="请填写调整结论的理由..."
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                      />
                    </div>

                    <div className="rounded-md bg-muted/40 border border-border px-4 py-3">
                      <div className="text-xs text-muted-foreground mb-1">复核护士签名确认</div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-medical-600" />
                        <span className="text-sm font-medium text-foreground">
                          {user ? `${user.name}（${user.employeeId}）` : '未登录'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="data-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">进度概览</h3>

                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          className="fill-none stroke-muted"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9155"
                          className="fill-none stroke-risk-safe"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${followUpProgress}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-foreground">
                          {Math.round(followUpProgress)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">追问完成率</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {completedCount}/{totalCount} 项已完成
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">材料齐全率</span>
                      <span
                        className={`text-sm font-bold ${
                          allMaterialsUploaded ? 'text-risk-safe' : 'text-risk-warning'
                        }`}
                      >
                        {materialsRequired.length === 0
                          ? '无需材料'
                          : `${materialsRequired.filter((m) => m.uploaded).length}/${materialsRequired.length}`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          allMaterialsUploaded ? 'bg-risk-safe' : 'bg-risk-warning'
                        }`}
                        style={{
                          width:
                            materialsRequired.length === 0
                              ? '100%'
                              : `${
                                  (materialsRequired.filter((m) => m.uploaded).length /
                                    materialsRequired.length) *
                                  100
                                }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="data-card space-y-3">
                {hasAbsolute && (
                  <button
                    type="button"
                    className="btn-danger w-full"
                    onClick={() => setShowRejectModal(true)}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    退回开单医生
                  </button>
                )}
                <button type="button" className="btn-secondary w-full">
                  保存草稿
                </button>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={handleFinalReview}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  复核完成，前往排班
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-risk-absolute/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-risk-absolute" />
                <h3 className="text-lg font-bold text-foreground">退回开单医生</h3>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setShowRejectModal(false)}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">
                  退回原因模板 <span className="text-risk-absolute">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedRejectReason}
                  onChange={(e) => setSelectedRejectReason(e.target.value)}
                >
                  <option value="">请选择退回原因...</option>
                  {rejectionReasonTemplates.map((tpl) => (
                    <option key={tpl.code} value={`${tpl.code}: ${tpl.label}`}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">补充说明</label>
                <textarea
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="可补充具体说明..."
                  value={rejectAdditionalNote}
                  onChange={(e) => setRejectAdditionalNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-muted/30">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </button>
              <button type="button" className="btn-danger" onClick={handleConfirmReject}>
                确认退回
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-lg px-5 py-3 shadow-lg flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-risk-safe text-white'
              : 'bg-risk-absolute text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
