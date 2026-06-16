import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  MessageCircle,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  Upload,
  Paperclip,
  Image,
  FileText,
  Stethoscope,
  Clock,
  Check,
  Home,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useAuthStore from '@/stores/authStore';
import { BODY_PART_LABELS } from '@/types';
import { rejectionReasonTemplates, formatDate } from '@/data/mockData';
import type { RejectionReasonTemplate, RejectionRecord } from '@/types';

type ReasonCategory = 'absolute' | 'material' | 'clinical';

const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  absolute: '绝对禁忌',
  material: '需补材料',
  clinical: '临床评估',
};

interface TimelineItem {
  id: string;
  type: 'current' | 'reply' | 'history';
  time: string;
  sender: string;
  content: string;
  attachments?: Array<{ name: string; type: 'image' | 'pdf' }>;
  isCurrent?: boolean;
}

export default function Callback() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder, saveRejectionRecord, getRejectionRecord, updateRejectionCallbackStatus } = usePatientStore();
  const { user } = useAuthStore();

  const [activeCategory, setActiveCategory] = useState<ReasonCategory>('absolute');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; type: 'image' | 'pdf' }>
  >([]);
  const [quickMessage, setQuickMessage] = useState('');
  const [callbackStatus, setCallbackStatus] = useState<'pending' | 'sent' | 'replied'>('pending');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (patientId) {
      const orderId = searchParams.get('orderId') || undefined;
      setCurrentPatientAndOrder(patientId, orderId);
    }
  }, [patientId, searchParams, setCurrentPatientAndOrder]);

  useEffect(() => {
    if (currentOrder) {
      const record = getRejectionRecord(currentOrder.id);
      if (record) {
        setCallbackStatus(record.callbackStatus);
        setReasonText(record.reasonText);
        setAdditionalNote(record.additionalNote);
        const tpl = rejectionReasonTemplates.find((t) => t.code === record.reasonCode);
        if (tpl) {
          setActiveCategory(tpl.category);
          setSelectedTemplate(tpl.code);
        }
      } else {
        setCallbackStatus('pending');
        setReasonText('');
        setAdditionalNote('');
        setSelectedTemplate(null);
      }
    }
  }, [currentOrder, getRejectionRecord]);

  const patient = currentPatient;
  const order = currentOrder;

  const filteredTemplates = useMemo(() => {
    return rejectionReasonTemplates.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    if (order) {
      const record = getRejectionRecord(order.id);

      items.push({
        id: 'current',
        type: 'current',
        time: record?.rejectedAt || new Date().toISOString(),
        sender: callbackStatus === 'sent' ? '您（影像科）' : '本次提交（待发送）',
        content: reasonText || '（请填写退回原因）',
        isCurrent: true,
      });

      if (record?.doctorReply) {
        items.push({
          id: 'reply',
          type: 'reply',
          time: record.repliedAt || new Date().toISOString(),
          sender: `${patient?.orderingDoctor || '开单医生'}（${patient?.orderingDepartment || '开单科室'}）`,
          content: record.doctorReply,
        });
      }
    }

    return items.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
  }, [order, reasonText, callbackStatus, patient, getRejectionRecord]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSelectTemplate = (tpl: RejectionReasonTemplate) => {
    setSelectedTemplate(tpl.code);
    setReasonText(`${tpl.code}: ${tpl.label}`);
  };

  const handleAddAttachment = () => {
    if (attachments.length >= 3) {
      showToast('error', '最多只能上传 3 个附件');
      return;
    }
    const isImage = Math.random() > 0.5;
    const newAttachment: { id: string; name: string; type: 'image' | 'pdf' } = {
      id: `att-${Date.now()}`,
      name: isImage
        ? `attachment_${Date.now()}.jpg`
        : `document_${Date.now()}.pdf`,
      type: (isImage ? 'image' : 'pdf') as 'image' | 'pdf',
    };
    setAttachments([...attachments, newAttachment]);
    showToast('success', '附件上传成功');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSaveDraft = () => {
    showToast('success', '草稿已保存');
  };

  const handleSend = () => {
    if (!reasonText.trim()) {
      showToast('error', '请填写退回原因');
      return;
    }
    if (!order || !user) return;

    const reasonCode = selectedTemplate || 'CUSTOM';
    saveRejectionRecord({
      orderId: order.id,
      reasonCode,
      reasonText,
      additionalNote,
      rejectedBy: user.id,
      callbackStatus: 'sent',
    });
    setCallbackStatus('sent');
    updateRejectionCallbackStatus(order.id, 'sent');
    showToast('success', '✓ 已发送，医生将在24小时内回复');
  };

  const handleSendQuickMessage = () => {
    if (!quickMessage.trim()) return;
    setQuickMessage('');
    showToast('success', '补充消息已发送');
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
                  <span className="inline-flex items-center gap-1 bg-risk-absolute/90 text-white px-2 py-0.5 rounded text-xs font-bold">
                    <ArrowLeftRight className="w-3 h-3" />
                    结果回传 / 退回处理
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
                  {callbackStatus !== 'pending' && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        callbackStatus === 'replied'
                          ? 'bg-risk-safe/90 text-white'
                          : 'bg-amber-400/90 text-amber-950'
                      }`}
                    >
                      {callbackStatus === 'sent' ? '已发送待回复' : '医生已回复'}
                    </span>
                  )}
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="data-card">
              <div className="flex items-center gap-2 mb-5">
                <ArrowLeftRight className="w-5 h-5 text-risk-absolute" />
                <h2 className="text-lg font-bold text-foreground">退回开单医生</h2>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 mb-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">当前检查信息概览</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">检查部位</div>
                    <div className="font-medium">{BODY_PART_LABELS[order.bodyPart]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">临床诊断</div>
                    <div className="font-medium">{order.clinicalDiagnosis}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">开单科室</div>
                    <div className="font-medium">{patient.orderingDepartment}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">开单医生</div>
                    <div className="font-medium">{patient.orderingDoctor}</div>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <label className="form-label">退回原因分类</label>
                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                  {(Object.keys(CATEGORY_LABELS) as ReasonCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat);
                        setSelectedTemplate(null);
                      }}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                        activeCategory === cat
                          ? cat === 'absolute'
                            ? 'bg-risk-absolute text-white shadow-sm'
                            : cat === 'material'
                              ? 'bg-risk-warning text-white shadow-sm'
                              : 'bg-medical-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat === 'absolute' && <ShieldAlert className="w-4 h-4" />}
                      {cat === 'material' && <AlertTriangle className="w-4 h-4" />}
                      {cat === 'clinical' && <Stethoscope className="w-4 h-4" />}
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="form-label">
                  退回原因模板
                  <span className="text-xs text-muted-foreground ml-2">（点击选择，自动填入）</span>
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-auto border border-border rounded-lg p-2 bg-muted/20">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate === tpl.code;
                    return (
                      <div
                        key={tpl.code}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-medical-50 border-2 border-medical-500'
                            : 'bg-white border-2 border-transparent hover:bg-medical-50/50 hover:border-medical-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'border-medical-500 bg-medical-500'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-medium ${
                              isSelected ? 'text-medical-700' : 'text-foreground'
                            }`}
                          >
                            {tpl.label}
                          </div>
                          <div className="text-xs text-muted-foreground">{tpl.code}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">
                  退回原因详细说明
                  <span className="text-risk-absolute ml-1">*</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="请详细说明退回原因，便于开单医生了解具体情况..."
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">补充说明（选填）</label>
                <textarea
                  className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="可补充个性化说明、建议的替代检查方案等..."
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label flex items-center justify-between">
                  <span>
                    附件
                    <span className="text-xs text-muted-foreground ml-1">（可选，最多3张）</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {attachments.length}/3
                  </span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group rounded-lg border border-border bg-muted/30 p-3 min-w-[140px]"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-risk-absolute text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-2">
                        {att.type === 'image' ? (
                          <Image className="w-6 h-6 text-amber-500 flex-shrink-0" />
                        ) : (
                          <FileText className="w-6 h-6 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate max-w-[100px]">
                            {att.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {att.type === 'image' ? '图片' : 'PDF'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {attachments.length < 3 && (
                    <div
                      onClick={handleAddAttachment}
                      className="group cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/20 hover:border-medical-400 hover:bg-medical-50/40 transition-all px-6 py-5 min-w-[140px] flex flex-col items-center justify-center gap-1.5"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-medical-500 transition-colors" />
                      <div className="text-xs text-muted-foreground group-hover:text-medical-600 transition-colors font-medium">
                        点击上传
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        图片 / PDF
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="sticky top-24 space-y-4">
              <div className="data-card">
                <div className="flex items-center gap-2 mb-5">
                  <MessageCircle className="w-5 h-5 text-medical-600" />
                  <h2 className="text-lg font-bold text-foreground">沟通记录</h2>
                </div>

                <div className="space-y-5 max-h-[500px] overflow-auto pr-1 mb-5">
                  {timelineItems.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">暂无沟通记录</p>
                    </div>
                  ) : (
                    timelineItems.map((item, idx) => {
                      const isLast = idx === timelineItems.length - 1;
                      return (
                        <div key={item.id} className="relative pl-8">
                          {!isLast && (
                            <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-border" />
                          )}
                          <div
                            className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                              item.type === 'current'
                                ? 'bg-medical-500 ring-4 ring-medical-100'
                                : item.type === 'reply'
                                  ? 'bg-risk-safe ring-4 ring-risk-safe/10'
                                  : 'bg-gray-300'
                            }`}
                          >
                            {item.type === 'current' ? (
                              <Send className="w-3 h-3 text-white" />
                            ) : item.type === 'reply' ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <Clock className="w-3 h-3 text-white" />
                            )}
                          </div>

                          <div className="mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm font-semibold ${
                                  item.type === 'current'
                                    ? 'text-medical-700'
                                    : item.type === 'reply'
                                      ? 'text-risk-safe'
                                      : 'text-foreground'
                                }`}
                              >
                                {item.sender}
                              </span>
                              {item.isCurrent && (
                                <span className="status-badge bg-medical-50 text-medical-700">
                                  本次
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(new Date(item.time))}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                              item.type === 'current'
                                ? 'script-bubble'
                                : item.type === 'reply'
                                  ? 'bg-risk-safe/10 border-l-4 border-risk-safe text-risk-safe'
                                  : 'bg-muted/40 text-foreground border-l-4 border-gray-300'
                            }`}
                          >
                            {item.content}
                          </div>

                          {item.attachments && item.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {item.attachments.map((att, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                                >
                                  {att.type === 'image' ? (
                                    <Image className="w-3.5 h-3.5 text-amber-500" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                  )}
                                  <span className="text-muted-foreground truncate max-w-[80px]">
                                    {att.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <label className="form-label">快速补充沟通</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="输入补充消息..."
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      className="btn-primary !py-1.5 !px-3 text-sm"
                      onClick={handleSendQuickMessage}
                      disabled={!quickMessage.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      发送
                    </button>
                  </div>
                </div>
              </div>

              <div className="data-card space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>支持上传的文件格式</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  JPG、PNG、PDF，单个文件不超过 10MB
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
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" />
            取消，返回列表
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4" />
              保存草稿
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSend}
              disabled={!reasonText.trim()}
            >
              <Send className="w-4 h-4" />
              发送至开单医生
            </button>
          </div>
        </div>
      </div>

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
