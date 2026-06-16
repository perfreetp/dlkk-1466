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
  approveMaterial: (type: MaterialType) => void;
  adjustConclusion: (
    orderId: string,
    newResult: ConclusionResult,
    reviewerId: string,
    reason?: string,
  ) => void;
  isAllFollowUpCompleted: () => boolean;
}

type ReviewStore = ReviewState & ReviewActions;

const useReviewStore = create<ReviewStore>()((set, get) => ({
  followUpItems: [],
  conclusionOverride: null,

  loadReviewTasks: (orderId) => {
    const { riskFlags, conclusion } = useScreeningStore.getState();
    const orderRiskFlags = riskFlags.filter((r) => r.orderId === orderId);
    const orderConclusion = conclusion?.orderId === orderId ? conclusion : null;

    const tasks = generateFollowUpTasks(orderId, orderRiskFlags, orderConclusion);
    set({ followUpItems: tasks });
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

  approveMaterial: (type) => {
    const { conclusion } = useScreeningStore.getState();
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

    useScreeningStore.setState({
      conclusion: {
        ...conclusion,
        materialsRequired: updatedMaterials,
      },
    });
  },

  adjustConclusion: (orderId, newResult, reviewerId, reason) => {
    const { conclusion } = useScreeningStore.getState();
    if (!conclusion || conclusion.orderId !== orderId) return;

    const updatedConclusion = {
      ...conclusion,
      finalResult: newResult,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
      reasonSummary: reason ? `${conclusion.reasonSummary} | 复核说明: ${reason}` : conclusion.reasonSummary,
    };

    useScreeningStore.setState({ conclusion: updatedConclusion });
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
    if (followUpItems.length === 0) return false;
    return followUpItems.every((item) => item.completed);
  },
}));

export default useReviewStore;
