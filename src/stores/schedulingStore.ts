import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MRIMachine,
  MRISlot,
  Appointment,
  OrderStatus,
} from '@/types';
import { MOCK_MACHINES, MOCK_SLOTS } from '@/data/mockData';
import { filterSlots, checkCanBook, type SlotFilters } from '@/lib/schedulingFilter';
import usePatientStore from './patientStore';
import useScreeningStore from './screeningStore';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateAppointmentNo(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `MRI-${datePart}-${randomPart}`;
}

interface SchedulingState {
  machines: MRIMachine[];
  slots: MRISlot[];
  appointments: Appointment[];
  currentSlotId: string | null;
  filters: SlotFilters;
}

interface SchedulingActions {
  loadSlotsAndMachines: () => void;
  setFilters: (partial: Partial<SlotFilters>) => void;
  selectSlot: (slotId: string | null) => void;
  getFilteredSlots: () => MRISlot[];
  confirmAppointment: (
    orderId: string,
    slotId: string,
    patientId: string,
    operatorId: string,
  ) => Appointment | null;
  checkBookingAbility: (orderId: string) => { canBook: boolean; reason?: string };
}

type SchedulingStore = SchedulingState & SchedulingActions;

const useSchedulingStore = create<SchedulingStore>()(
  persist(
    (set, get) => ({
      machines: [],
      slots: [],
      appointments: [],
      currentSlotId: null,
      filters: {},

      loadSlotsAndMachines: () => {
        const { machines, slots } = get();
        if (machines.length === 0) {
          set({ machines: MOCK_MACHINES });
        }
        if (slots.length === 0) {
          set({ slots: MOCK_SLOTS });
        }
      },

      setFilters: (partial) => {
        set((state) => ({
          filters: { ...state.filters, ...partial },
        }));
      },

      selectSlot: (slotId) => {
        set({ currentSlotId: slotId });
      },

      getFilteredSlots: () => {
        const { slots, filters } = get();
        return filterSlots(slots, filters);
      },

      confirmAppointment: (orderId, slotId, patientId, operatorId) => {
        const { slots, appointments } = get();
        const slot = slots.find((s) => s.id === slotId);
        if (!slot || !slot.isAvailable) return null;

        const appointment: Appointment = {
          id: uuid(),
          orderId,
          slotId,
          patientId,
          appointmentNo: generateAppointmentNo(),
          confirmedAt: new Date().toISOString(),
          confirmedBy: operatorId,
          status: 'confirmed',
        };

        set({
          slots: slots.map((s) =>
            s.id === slotId
              ? { ...s, isAvailable: false, bookedOrderId: orderId, bookedBy: operatorId }
              : s,
          ),
          appointments: [...appointments, appointment],
          currentSlotId: null,
        });

        const { updateOrderStatus } = usePatientStore.getState();
        updateOrderStatus(orderId, 'scheduled');

        return appointment;
      },

      checkBookingAbility: (orderId) => {
        const { orders } = usePatientStore.getState();
        const order = orders.find((o) => o.id === orderId);
        if (!order) {
          return { canBook: false, reason: '检查单不存在' };
        }

        const screeningState = useScreeningStore.getState();
        const conclusion = screeningState?.conclusion;
        const finalResult = conclusion?.finalResult || conclusion?.result;

        return checkCanBook(order, finalResult);
      },
    }),
    {
      name: 'scheduling-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.loadSlotsAndMachines();
          }
        };
      },
    },
  ),
);

export default useSchedulingStore;
