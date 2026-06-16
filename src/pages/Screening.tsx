import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useScreeningStore from '@/stores/screeningStore';
import { BODY_PART_LABELS, RISK_FLAG_LABELS, RISK_LEVEL_LABELS } from '@/types';
import { RISK_RULES } from '@/data/riskRules';
import type { Question, ScreeningAnswer } from '@/types';

function getAnswerValue(answers: ScreeningAnswer[], orderId: string, questionId: string): boolean | string | undefined {
  const found = answers.find((a) => a.orderId === orderId && a.questionId === questionId);
  return found?.answer;
}

function questionHasRisk(question: Question): boolean {
  if (!question.options) return false;
  return question.options.some((opt) => opt.triggersRisk);
}

function isRiskTriggered(
  question: Question,
  answer: boolean | string | undefined,
): boolean {
  if (!question.options || answer === undefined) return false;
  const selectedOpt = question.options.find((opt) => opt.value === answer);
  return !!selectedOpt?.triggersRisk;
}

function getSubQuestions(question: Question, answer: boolean | string | undefined): Question[] {
  if (!question.options || answer === undefined) return [];
  const selectedOpt = question.options.find((opt) => opt.value === answer);
  return selectedOpt?.subQuestions || [];
}

export default function Screening() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { setCurrentPatientAndOrder, currentPatient, currentOrder } = usePatientStore();
  const screeningState = useScreeningStore();
  const {
    initScreening,
    currentQuestions,
    saveAnswer,
    resetScreening,
    submitScreening,
    answers,
    riskFlags,
  } = screeningState;

  const [subAnswersState, setSubAnswersState] = useState<Record<string, Record<string, boolean | string>>>({});

  useEffect(() => {
    if (patientId) {
      const orderId = searchParams.get('orderId') || undefined;
      setCurrentPatientAndOrder(patientId, orderId);
    }
  }, [patientId, searchParams, setCurrentPatientAndOrder]);

  useEffect(() => {
    if (currentOrder) {
      initScreening(currentOrder.id, currentOrder.bodyPart, currentOrder.isEnhanced);
    }
  }, [currentOrder, initScreening]);

  const order = currentOrder;
  const patient = currentPatient;

  const conclusion = useMemo(() => {
    if (!order) return undefined;
    return screeningState.conclusions.find((c) => c.orderId === order.id);
  }, [order, screeningState.conclusions]);

  const orderRiskFlags = order ? riskFlags.filter((r) => r.orderId === order.id) : [];

  const hasAbsolute = orderRiskFlags.some((r) => r.level === 'absolute_contraindication');
  const hasMaterials = orderRiskFlags.some((r) => r.level === 'needs_materials');

  let conclusionLevel: 'absolute_contraindication' | 'materials_needed' | 'proceed' = 'proceed';
  if (hasAbsolute) conclusionLevel = 'absolute_contraindication';
  else if (hasMaterials) conclusionLevel = 'materials_needed';

  if (conclusion?.orderId === order?.id) {
    if (conclusion.result === 'absolute_contraindication') conclusionLevel = 'absolute_contraindication';
    else if (conclusion.result === 'materials_needed') conclusionLevel = 'materials_needed';
    else if (conclusion.result === 'proceed') conclusionLevel = 'proceed';
  }

  const handleAnswer = (questionId: string, answer: boolean | string) => {
    if (!order) return;
    const subAnswers = subAnswersState[questionId];
    saveAnswer(order.id, questionId, answer, subAnswers);
  };

  const handleSubAnswer = (
    parentQId: string,
    subQId: string,
    answer: boolean | string,
  ) => {
    if (!order) return;
    setSubAnswersState((prev) => {
      const parent = prev[parentQId] || {};
      const updated = { ...parent, [subQId]: answer };
      return { ...prev, [parentQId]: updated };
    });

    const parentQuestion = currentQuestions.find((q) => q.id === parentQId);
    if (parentQuestion) {
      const parentAns = getAnswerValue(answers, order.id, parentQId);
      const existingSubs = subAnswersState[parentQId] || {};
      const newSubs = { ...existingSubs, [subQId]: answer };
      if (parentAns !== undefined) {
        saveAnswer(order.id, parentQId, parentAns, newSubs);
      }
    }
  };

  const isQuestionnaireComplete = (): { complete: boolean; missing: string[] } => {
    if (!order) return { complete: false, missing: [] };
    const missing: string[] = [];
    for (const q of currentQuestions) {
      const val = getAnswerValue(answers, order.id, q.id);
      if (val === undefined || val === null || val === '') {
        missing.push(q.title);
      }
    }
    if (order.isEnhanced) {
      const egfr = getAnswerValue(answers, order.id, 'renal_function_egfr');
      if (egfr === undefined || egfr === null || String(egfr).trim() === '') {
        const alreadyHas = missing.some((t) => t.includes('eGFR') || t.includes('肾功能'));
        if (!alreadyHas) missing.push('增强扫描必填：近期肾功能 eGFR 数值');
      }
      const iodine = getAnswerValue(answers, order.id, 'iodine_allergy_history');
      if (iodine === undefined || iodine === null) {
        const alreadyHas = missing.some((t) => t.includes('碘对比剂') || t.includes('碘过敏'));
        if (!alreadyHas) missing.push('增强扫描必填：碘对比剂过敏史');
      }
    }
    return { complete: missing.length === 0, missing };
  };

  const completeness = isQuestionnaireComplete();
  const canSubmit = completeness.complete;

  const handleSubmit = () => {
    if (!order) return;
    if (!canSubmit) {
      alert(`请先完成以下必填项：\n${completeness.missing.map((t, i) => `${i + 1}. ${t}`).join('\n')}`);
      return;
    }
    submitScreening(order.id, order.bodyPart, order.isEnhanced);
    if (patientId) {
      navigate(`/patients/${patientId}/review`);
    }
  };

  const handleReset = () => {
    resetScreening();
    if (order) {
      initScreening(order.id, order.bodyPart, order.isEnhanced);
    }
    setSubAnswersState({});
  };

  if (!patient || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const renderQuestionAnswer = (q: Question, answer: boolean | string | undefined, isSub = false) => {
    const onChange = (val: boolean | string) => {
      if (isSub) {
        // parent question id is not passed, handled by caller
      } else {
        handleAnswer(q.id, val);
      }
    };

    if (q.type === 'boolean') {
      const yesSelected = answer === true;
      const noSelected = answer === false;
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`flex-1 h-12 rounded-lg border-2 font-medium text-base transition-all duration-200 ${
              yesSelected
                ? 'border-medical-500 bg-medical-50 text-medical-700'
                : 'border-border bg-white text-muted-foreground hover:border-medical-300 hover:text-medical-600'
            }`}
          >
            是
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`flex-1 h-12 rounded-lg border-2 font-medium text-base transition-all duration-200 ${
              noSelected
                ? 'border-medical-500 bg-medical-50 text-medical-700'
                : 'border-border bg-white text-muted-foreground hover:border-medical-300 hover:text-medical-600'
            }`}
          >
            否
          </button>
        </div>
      );
    }

    if (q.type === 'select') {
      return (
        <select
          className="form-select"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择...</option>
          {q.options?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (q.type === 'text') {
      return (
        <input
          type="text"
          className="form-input"
          placeholder="请输入..."
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-28">
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
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-medical-50 border border-medical-200 px-4 py-3 text-medical-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                请逐项询问患者并填写问卷，带红色标记为高风险敏感项
              </span>
            </div>

            {currentQuestions.map((q, idx) => {
              const answer = getAnswerValue(answers, order.id, q.id);
              const hasRisk = questionHasRisk(q);
              const triggered = isRiskTriggered(q, answer);
              const subQuestions = getSubQuestions(q, answer);
              const cardClass = triggered
                ? 'question-card question-card-risk'
                : 'question-card';

              return (
                <div key={q.id} className={cardClass}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-medical-100 text-medical-700 text-sm font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{q.title}</h3>
                          {hasRisk && (
                            <span className="inline-flex items-center gap-1 bg-risk-absolute/10 text-risk-absolute px-2 py-0.5 rounded text-xs font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              风险项
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {q.description && (
                    <p className="text-sm text-muted-foreground mb-4 pl-10">{q.description}</p>
                  )}

                  <div className={q.description ? 'pl-10' : 'pl-10 mt-2'}>
                    {renderQuestionAnswer(q, answer)}
                  </div>

                  {subQuestions.length > 0 && (
                    <div className="mt-5 ml-10 pl-6 border-l-2 border-medical-300 space-y-4">
                      {subQuestions.map((subQ, subIdx) => {
                        const subAns = getAnswerValue(answers, order.id, subQ.id);
                        return (
                          <div key={subQ.id}>
                            <div className="flex items-start gap-2 mb-2">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mt-0.5">
                                {String.fromCharCode(97 + subIdx)}
                              </span>
                              <h4 className="text-sm font-medium text-foreground pt-0.5">{subQ.title}</h4>
                            </div>
                            <div className="pl-7">
                              {subQ.type === 'boolean' ? (
                                (() => {
                                  const yesSelected = subAns === true;
                                  const noSelected = subAns === false;
                                  return (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSubAnswer(q.id, subQ.id, true)}
                                        className={`flex-1 h-10 rounded-md border-2 font-medium text-sm transition-all duration-200 ${
                                          yesSelected
                                            ? 'border-medical-500 bg-medical-50 text-medical-700'
                                            : 'border-border bg-white text-muted-foreground hover:border-medical-300'
                                        }`}
                                      >
                                        是
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSubAnswer(q.id, subQ.id, false)}
                                        className={`flex-1 h-10 rounded-md border-2 font-medium text-sm transition-all duration-200 ${
                                          noSelected
                                            ? 'border-medical-500 bg-medical-50 text-medical-700'
                                            : 'border-border bg-white text-muted-foreground hover:border-medical-300'
                                        }`}
                                      >
                                        否
                                      </button>
                                    </div>
                                  );
                                })()
                              ) : subQ.type === 'text' ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="请输入..."
                                  value={typeof subAns === 'string' ? subAns : ''}
                                  onChange={(e) => handleSubAnswer(q.id, subQ.id, e.target.value)}
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="data-card">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-medical-600" />
                  <h2 className="text-lg font-bold text-foreground">筛查结论（实时）</h2>
                </div>

                <div className="mb-5">
                  {conclusionLevel === 'absolute_contraindication' ? (
                    <div className="status-absolute rounded-lg p-5 text-center">
                      <ShieldAlert className="w-12 h-12 mx-auto mb-2" />
                      <div className="text-xl font-bold">绝对禁忌</div>
                      <div className="text-xs mt-1 opacity-80">不可进行 MRI 检查</div>
                    </div>
                  ) : conclusionLevel === 'materials_needed' ? (
                    <div className="status-warning rounded-lg p-5 text-center">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                      <div className="text-xl font-bold">需补材料</div>
                      <div className="text-xs mt-1 opacity-80">补充资料后复核</div>
                    </div>
                  ) : (
                    <div className="status-safe rounded-lg p-5 text-center">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-2" />
                      <div className="text-xl font-bold">可继续预约</div>
                      <div className="text-xs mt-1 opacity-80">未发现明显禁忌</div>
                    </div>
                  )}
                </div>

                {orderRiskFlags.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">已触发风险项</h3>
                    <div className="space-y-2.5">
                      {orderRiskFlags.map((flag) => {
                        const rule = RISK_RULES[flag.type];
                        return (
                          <div
                            key={flag.id}
                            className="rounded-md border border-border bg-muted/30 p-3"
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="status-badge bg-gray-100 text-gray-700">
                                {RISK_FLAG_LABELS[flag.type]}
                              </span>
                              <span
                                className={`status-badge ${
                                  flag.level === 'absolute_contraindication'
                                    ? 'bg-risk-absolute/10 text-risk-absolute'
                                    : flag.level === 'needs_materials'
                                      ? 'bg-risk-warning/10 text-risk-warning'
                                      : 'bg-medical-50 text-medical-700'
                                }`}
                              >
                                {RISK_LEVEL_LABELS[flag.level]}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{rule?.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {conclusion?.materialsRequired && conclusion.materialsRequired.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">需补材料清单</h3>
                    <div className="space-y-2">
                      {conclusion.materialsRequired.map((mat) => (
                        <div
                          key={mat.type}
                          className="flex items-center gap-2.5 rounded-md border border-border bg-white px-3 py-2.5"
                        >
                          {mat.uploaded ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-risk-safe flex-shrink-0" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 text-risk-warning flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              mat.uploaded ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}
                          >
                            {mat.label}
                          </span>
                          {mat.fileName && (
                            <FileText className="w-4 h-4 text-muted-foreground ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {conclusion?.reasonSummary && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">结论摘要</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {conclusion.reasonSummary}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
                本结论为系统初判，最终以人工复核结果为准
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          {!canSubmit && (
            <div className="flex items-center gap-2 text-risk-warning text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>还有 {completeness.missing.length} 项必填内容未完成</span>
            </div>
          )}
          {canSubmit && <div />}
          <div className="flex items-center gap-3">
            <button type="button" className="btn-danger" onClick={handleReset}>
              重置问卷
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
            >
              提交筛查结论 → 进入人工复核
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
