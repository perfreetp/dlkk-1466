import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScreeningAnswer,
  Question,
  RiskFlag,
  ScreeningConclusion,
  BodyPart,
} from '@/types';
import { getQuestionnaire } from '@/data/questionnaires';
import { runScreeningEngine } from '@/lib/screeningEngine';
import { screeningConclusions as MOCK_CONCLUSIONS, riskFlags as MOCK_RISK_FLAGS } from '@/data/mockData';
import usePatientStore from './patientStore';

interface ScreeningState {
  answers: ScreeningAnswer[];
  currentQuestions: Question[];
  riskFlags: RiskFlag[];
  conclusions: ScreeningConclusion[];
}

interface ScreeningActions {
  initScreening: (orderId: string, bodyPart: BodyPart, isEnhanced: boolean) => void;
  saveAnswer: (
    orderId: string,
    questionId: string,
    answer: boolean | string,
    subAnswers?: Record<string, boolean | string>,
  ) => void;
  submitScreening: (orderId: string, bodyPart: BodyPart, isEnhanced: boolean) => void;
  getConclusionByOrderId: (orderId: string) => ScreeningConclusion | undefined;
  loadMockData: () => void;
  resetScreening: () => void;
}

type ScreeningStore = ScreeningState & ScreeningActions;

const useScreeningStore = create<ScreeningStore>()(
  persist(
    (set, get) => ({
      answers: [],
      currentQuestions: [],
      riskFlags: [],
      conclusions: [],

      loadMockData: () => {
        const { riskFlags, conclusions } = get();
        if (riskFlags.length === 0 && MOCK_RISK_FLAGS && MOCK_RISK_FLAGS.length > 0) {
          set({ riskFlags: MOCK_RISK_FLAGS });
        }
        if (conclusions.length === 0 && MOCK_CONCLUSIONS && MOCK_CONCLUSIONS.length > 0) {
          set({ conclusions: MOCK_CONCLUSIONS });
        }
      },

      getConclusionByOrderId: (orderId) => {
        return get().conclusions.find((c) => c.orderId === orderId);
      },

      initScreening: (orderId, bodyPart, isEnhanced) => {
        const questions = getQuestionnaire(bodyPart, isEnhanced);
        set({
          currentQuestions: questions,
          answers: get().answers.filter((a) => a.orderId === orderId),
          riskFlags: get().riskFlags.filter((r) => r.orderId === orderId),
        });
      },

      saveAnswer: (orderId, questionId, answer, subAnswers) => {
        set((state) => {
          const existingIdx = state.answers.findIndex(
            (a) => a.orderId === orderId && a.questionId === questionId,
          );
          const newAnswer: ScreeningAnswer = {
            orderId,
            questionId,
            answer,
            subAnswers,
            answeredAt: new Date().toISOString(),
          };
          let newAnswers: ScreeningAnswer[];
          if (existingIdx >= 0) {
            newAnswers = [...state.answers];
            newAnswers[existingIdx] = newAnswer;
          } else {
            newAnswers = [...state.answers, newAnswer];
          }

          if (subAnswers) {
            for (const [subQId, subAns] of Object.entries(subAnswers)) {
              const subIdx = newAnswers.findIndex(
                (a) => a.orderId === orderId && a.questionId === subQId,
              );
              const subAnswerObj: ScreeningAnswer = {
                orderId,
                questionId: subQId,
                answer: subAns as boolean | string,
                answeredAt: new Date().toISOString(),
              };
              if (subIdx >= 0) {
                newAnswers[subIdx] = subAnswerObj;
              } else {
                newAnswers.push(subAnswerObj);
              }
            }
          }

          return { answers: newAnswers };
        });
      },

      submitScreening: (orderId, bodyPart, isEnhanced) => {
        const { answers, currentQuestions } = get();
        const orderAnswers = answers.filter((a) => a.orderId === orderId);

        let questions = currentQuestions;
        if (questions.length === 0) {
          questions = getQuestionnaire(bodyPart, isEnhanced);
        }

        const { riskFlags: newFlags, conclusion: newConclusion } = runScreeningEngine(
          orderId,
          questions,
          orderAnswers,
        );

        set((state) => {
          const otherFlags = state.riskFlags.filter((r) => r.orderId !== orderId);
          const otherConclusions = state.conclusions.filter((c) => c.orderId !== orderId);
          return {
            riskFlags: [...otherFlags, ...newFlags],
            conclusions: [...otherConclusions, newConclusion],
          };
        });

        const { updateOrderStatus } = usePatientStore.getState();
        updateOrderStatus(orderId, 'screening_done');
        setTimeout(() => {
          updateOrderStatus(orderId, 'review_pending');
        }, 100);
      },

      resetScreening: () => {
        set({
          answers: [],
          currentQuestions: [],
          riskFlags: [],
          conclusions: [],
        });
      },
    }),
    {
      name: 'screening-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.loadMockData();
          }
        };
      },
    },
  ),
);

export default useScreeningStore;
