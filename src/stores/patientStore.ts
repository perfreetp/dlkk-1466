import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient, ExaminationOrder } from '@/types';
import { MOCK_PATIENTS, MOCK_ORDERS } from '@/data/mockData';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PatientState {
  patients: Patient[];
  orders: ExaminationOrder[];
  currentPatient: Patient | null;
  currentOrder: ExaminationOrder | null;
}

interface PatientActions {
  loadMockData: () => void;
  addPatient: (
    patientData: Omit<Patient, 'id' | 'createdAt'>,
    orderData: Omit<ExaminationOrder, 'id' | 'patientId' | 'status' | 'createdAt'>,
  ) => { patient: Patient; order: ExaminationOrder };
  updateOrderStatus: (orderId: string, status: ExaminationOrder['status']) => void;
  findPatientsByKeyword: (keyword: string) => Patient[];
  getOrdersByPatient: (patientId: string) => ExaminationOrder[];
  setCurrentPatientAndOrder: (patientId: string, orderId?: string) => void;
}

type PatientStore = PatientState & PatientActions;

const usePatientStore = create<PatientStore>()(
  persist(
    (set, get) => ({
      patients: [],
      orders: [],
      currentPatient: null,
      currentOrder: null,

      loadMockData: () => {
        const { patients, orders } = get();
        if (patients.length === 0 && orders.length === 0) {
          set({ patients: MOCK_PATIENTS, orders: MOCK_ORDERS });
        }
      },

      addPatient: (patientData, orderData) => {
        const patient: Patient = {
          ...patientData,
          id: uuid(),
          createdAt: new Date().toISOString(),
        };
        const order: ExaminationOrder = {
          ...orderData,
          id: uuid(),
          patientId: patient.id,
          status: 'pending_screening',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          patients: [...state.patients, patient],
          orders: [...state.orders, order],
        }));
        return { patient, order };
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
          currentOrder:
            state.currentOrder?.id === orderId ? { ...state.currentOrder, status } : state.currentOrder,
        }));
      },

      findPatientsByKeyword: (keyword) => {
        const { patients } = get();
        if (!keyword.trim()) return patients;
        const kw = keyword.trim().toLowerCase();
        return patients.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.medicalRecordNo.toLowerCase().includes(kw) ||
            p.phone.includes(kw),
        );
      },

      getOrdersByPatient: (patientId) => {
        const { orders } = get();
        return orders.filter((o) => o.patientId === patientId);
      },

      setCurrentPatientAndOrder: (patientId, orderId) => {
        const { patients, orders } = get();
        const patient = patients.find((p) => p.id === patientId) || null;
        let order: ExaminationOrder | null = null;
        if (orderId) {
          order = orders.find((o) => o.id === orderId) || null;
        } else if (patient) {
          const patientOrders = orders.filter((o) => o.patientId === patientId);
          order = patientOrders.length > 0 ? patientOrders[0] : null;
        }
        set({ currentPatient: patient, currentOrder: order });
      },
    }),
    {
      name: 'patient-storage',
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

export default usePatientStore;
