import { create } from 'zustand';
import type {
  FollowUpItem,
  ConclusionResult,
  MaterialType,
} from '@/types';
import { generateFollowUpTasks } from '@/lib/riskEngine';
import useScreeningStore from './screeningStore';
import usePatientStore from './patientStore';
import useAuthStore from './authStore';

interface ReviewState {
  followUpItems: FollowUpItem[];
  conclusionOverride: ConclusionResult | null;
}

interface ReviewActions {
  loadReviewTasks: (orderId: string) => void;
  toggleFollowUpItem: (itemId: string, answer?: string) => void;
  approveMaterial: (orderId: string, type: MaterialType) => void;
  adjustConclusion: (
    orderId: string,
    newResult: ConclusionResult,
    reviewerId: string,
    reason?: string,
  ) => void;
  isAllFollowUpCompleted: () => boolean;
  isRiskFollowUpCompleted: () => { completed: boolean; unfinishedCount: number };
}

type ReviewStore = ReviewState & ReviewActions;

const useReviewStore = create<ReviewStore>()((set, get) => ({
  followUpItems: [],
  conclusionOverride: null,

  loadReviewTasks: (orderId) => {
    const { riskFlags, getConclusionByOrderId } = useScreeningStore.getState();
    const orderRiskFlags = riskFlags.filter((r) => r.orderId === orderId);
    const orderConclusion = getConclusionByOrderId(orderId) || null;

    const tasks = generateFollowUpTasks(orderId, orderRiskFlags, orderConclusion);
    set({ followUpItems: tasks, conclusionOverride: null });
  },

  toggleFollowUpItem: (itemId, answer) => {
    const user = useAuthStore.getState().user;
    set((state) => ({
      followUpItems: state.followUpItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: !item.completed,
              answer: answer !== undefined ? answer : item.answer,
              completedAt: !item.completed ? new Date().toISOString() : undefined,
              completedBy: !item.completed ? user?.id : undefined,
            }
          : item,
      ),
    }));
  },

  approveMaterial: (orderId, type) => {
    const screening = useScreeningStore.getState();
    const conclusion = screening.getConclusionByOrderId(orderId);
    if (!conclusion?.materialsRequired) return;

    const updatedMaterials = conclusion.materialsRequired.map((m) =>
      m.type === type
        ? {
            ...m,
            uploaded: true,
            uploadedAt: new Date().toISOString(),
          }
        : m,
    );

    const updatedConclusion = {
      ...conclusion,
      materialsRequired: updatedMaterials,
    };

    const prev = useScreeningStore.getState();
    useScreeningStore.setState({
      conclusions: prev.conclusions.map((c) =>
        c.orderId === orderId ? updatedConclusion : c,
      ),
    });
  },

  adjustConclusion: (orderId, newResult, reviewerId, reason) => {
    const screening = useScreeningStore.getState();
    const conclusion = screening.getConclusionByOrderId(orderId);
    if (!conclusion) return;

    const updatedConclusion = {
      ...conclusion,
      finalResult: newResult,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      reasonSummary: reason ? `${conclusion.reasonSummary} | 复核说明: ${reason}` : conclusion.reasonSummary,
    };

    const prev = useScreeningStore.getState();
    useScreeningStore.setState({
      conclusions: prev.conclusions.map((c) =>
        c.orderId === orderId ? updatedConclusion : c,
      ),
    });
    set({ conclusionOverride: newResult });

    const { updateOrderStatus } = usePatientStore.getState();
    if (newResult === 'rejected') {
      updateOrderStatus(orderId, 'rejected');
    } else if (newResult === 'materials_needed') {
      updateOrderStatus(orderId, 'review_pending');
    } else {
      updateOrderStatus(orderId, 'review_done');
      setTimeout(() => {
        updateOrderStatus(orderId, 'scheduling_pending');
      }, 100);
    }
  },

  isAllFollowUpCompleted: () => {
    const { followUpItems } = get();
    if (followUpItems.length === 0) return true;
    return followUpItems.every((item) => item.completed);
  },

  isRiskFollowUpCompleted: () => {
    const { followUpItems } = get();
    const riskItems = followUpItems.filter(
      (item) => item.riskType !== 'general' && item.riskType !== 'material',
    );
    if (riskItems.length === 0) return { completed: true, unfinishedCount: 0 };
    const unfinished = riskItems.filter((item) => !item.completed).length;
    return { completed: unfinished === 0, unfinishedCount: unfinished };
  },
}));

export default useReviewStore;
