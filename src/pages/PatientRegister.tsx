import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, AlertCircle } from 'lucide-react';
import usePatientStore from '@/stores/patientStore';
import useSchedulingStore from '@/stores/schedulingStore';
import { BODY_PART_LABELS, type BodyPart, type Patient, type ExaminationOrder } from '@/types';
import { cn } from '@/lib/utils';

const DEPARTMENT_OPTIONS = [
  '内科',
  '外科',
  '神经科',
  '骨科',
  '心内科',
  '妇科',
  '其他',
];

const registerSchema = z.object({
  name: z.string().min(1, '请输入患者姓名'),
  gender: z.enum(['male', 'female'], { required_error: '请选择性别' }),
  age: z.number({ invalid_type_error: '请输入年龄' }).min(0, '年龄不能小于0').max(150, '年龄不能超过150'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  idCardNo: z.string().regex(/^\d{17}[\dXx]$/, '请输入有效的身份证号'),
  medicalRecordNo: z.string().min(1, '请输入病历号'),
  orderingDepartment: z.string().min(1, '请选择开单科室'),
  orderingDoctor: z.string().min(1, '请输入开单医生'),
  bodyPart: z.enum(Object.keys(BODY_PART_LABELS) as [BodyPart, ...BodyPart[]], {
    required_error: '请选择检查部位',
  }),
  isEnhanced: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  clinicalDiagnosis: z.string().min(1, '请输入临床诊断'),
  mriMachineRequired: z.string().optional(),
  coilRequired: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-medical-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-medical-500' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export default function PatientRegister() {
  const navigate = useNavigate();
  const { addPatient } = usePatientStore();
  const { machines } = useSchedulingStore();
  const [currentStep] = useState(1);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      gender: 'male',
      age: undefined as unknown as number,
      phone: '',
      idCardNo: '',
      medicalRecordNo: '',
      orderingDepartment: '',
      orderingDoctor: '',
      bodyPart: undefined as unknown as BodyPart,
      isEnhanced: false,
      isUrgent: false,
      clinicalDiagnosis: '',
      mriMachineRequired: '',
      coilRequired: '',
    },
  });

  const isUrgent = watch('isUrgent');

  const onSubmit = async (data: RegisterFormData) => {
    const patientData: Omit<Patient, 'id' | 'createdAt'> = {
      name: data.name,
      gender: data.gender,
      age: data.age,
      phone: data.phone,
      medicalRecordNo: data.medicalRecordNo,
      idCardNo: data.idCardNo,
      orderingDepartment: data.orderingDepartment,
      orderingDoctor: data.orderingDoctor,
    };

    const orderData: Omit<ExaminationOrder, 'id' | 'patientId' | 'status' | 'createdAt'> = {
      bodyPart: data.bodyPart,
      isEnhanced: data.isEnhanced,
      isUrgent: data.isUrgent,
      mriMachineRequired: data.mriMachineRequired || undefined,
      coilRequired: data.coilRequired || undefined,
      clinicalDiagnosis: data.clinicalDiagnosis,
    };

    const { patient, order } = addPatient(patientData, orderData);
    navigate(`/patients/${patient.id}/screening?orderId=${order.id}`);
  };

  const steps = [
    { id: 1, label: '基础信息' },
    { id: 2, label: '检查信息' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">新患者登记</h1>
        <div className="flex items-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    step.id <= currentStep
                      ? 'bg-medical-500 text-white'
                      : 'bg-gray-200 text-gray-500',
                  )}
                >
                  {step.id}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    step.id <= currentStep ? 'text-medical-700' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 w-16 transition-colors',
                    step.id < currentStep ? 'bg-medical-500' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className={cn(
              'data-card',
              isUrgent && 'border-risk-absolute/50 ring-1 ring-risk-absolute/20',
            )}>
              <h2 className="mb-4 text-lg font-semibold">基础信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 姓名
                  </label>
                  <input
                    type="text"
                    className={cn('form-input', errors.name && 'border-risk-absolute')}
                    placeholder="请输入患者姓名"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 性别
                  </label>
                  <div className="flex h-9 items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="radio"
                            value="male"
                            checked={field.value === 'male'}
                            onChange={() => field.onChange('male')}
                            className="h-4 w-4 text-medical-600 focus:ring-medical-500"
                          />
                        )}
                      />
                      <span className="text-sm">男</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="radio"
                            value="female"
                            checked={field.value === 'female'}
                            onChange={() => field.onChange('female')}
                            className="h-4 w-4 text-medical-600 focus:ring-medical-500"
                          />
                        )}
                      />
                      <span className="text-sm">女</span>
                    </label>
                  </div>
                  {errors.gender && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.gender.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 年龄
                  </label>
                  <input
                    type="number"
                    className={cn('form-input', errors.age && 'border-risk-absolute')}
                    placeholder="请输入年龄"
                    {...register('age', { valueAsNumber: true })}
                  />
                  {errors.age && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.age.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 手机号
                  </label>
                  <input
                    type="text"
                    className={cn('form-input', errors.phone && 'border-risk-absolute')}
                    placeholder="请输入手机号"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 身份证号
                  </label>
                  <input
                    type="text"
                    className={cn('form-input', errors.idCardNo && 'border-risk-absolute')}
                    placeholder="请输入身份证号"
                    {...register('idCardNo')}
                  />
                  {errors.idCardNo && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.idCardNo.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 病历号
                  </label>
                  <input
                    type="text"
                    className={cn('form-input', errors.medicalRecordNo && 'border-risk-absolute')}
                    placeholder="请输入病历号"
                    {...register('medicalRecordNo')}
                  />
                  {errors.medicalRecordNo && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.medicalRecordNo.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 开单科室
                  </label>
                  <select
                    className={cn('form-select', errors.orderingDepartment && 'border-risk-absolute')}
                    defaultValue=""
                    {...register('orderingDepartment')}
                  >
                    <option value="" disabled>请选择开单科室</option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.orderingDepartment && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.orderingDepartment.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 开单医生
                  </label>
                  <input
                    type="text"
                    className={cn('form-input', errors.orderingDoctor && 'border-risk-absolute')}
                    placeholder="请输入开单医生姓名"
                    {...register('orderingDoctor')}
                  />
                  {errors.orderingDoctor && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.orderingDoctor.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(
              'data-card',
              isUrgent && 'border-risk-absolute/50 ring-1 ring-risk-absolute/20',
            )}>
              <h2 className="mb-4 text-lg font-semibold">检查信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 检查部位
                  </label>
                  <select
                    className={cn('form-select', errors.bodyPart && 'border-risk-absolute')}
                    defaultValue=""
                    {...register('bodyPart')}
                  >
                    <option value="" disabled>请选择检查部位</option>
                    {Object.entries(BODY_PART_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {errors.bodyPart && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.bodyPart.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">增强扫描</label>
                  <div className="flex h-9 items-center gap-3">
                    <Controller
                      name="isEnhanced"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onChange={field.onChange} />
                      )}
                    />
                    <span className="text-sm text-muted-foreground">
                      {watch('isEnhanced') ? '已启用（需使用造影剂）' : '未启用'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="form-label">加急标记</label>
                  <div className="flex h-9 items-center gap-3">
                    <Controller
                      name="isUrgent"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onChange={field.onChange} />
                      )}
                    />
                    <span className={cn(
                      'text-sm',
                      isUrgent ? 'text-risk-absolute font-medium' : 'text-muted-foreground',
                    )}>
                      {isUrgent ? '已标记为加急' : '普通检查'}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="form-label">
                    <span className="text-risk-absolute">*</span> 临床诊断
                  </label>
                  <textarea
                    rows={4}
                    className={cn(
                      'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none',
                      errors.clinicalDiagnosis && 'border-risk-absolute',
                    )}
                    placeholder="请输入临床诊断、病史摘要等关键信息..."
                    {...register('clinicalDiagnosis')}
                  />
                  {errors.clinicalDiagnosis && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-risk-absolute">
                      <AlertCircle className="h-3 w-3" /> {errors.clinicalDiagnosis.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">指定机型（可选）</label>
                  <select
                    className="form-select"
                    defaultValue=""
                    {...register('mriMachineRequired')}
                  >
                    <option value="">不指定，系统自动分配</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name}（{machine.roomNo}）
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">指定线圈（可选）</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="如需指定请输入线圈类型"
                    {...register('coilRequired')}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-border pt-4">
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? '保存中...' : '保存并开始筛查'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="col-span-1 space-y-4 self-start">
          <div className="data-card bg-medical-50/50 border-medical-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-medical-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-medical-800 mb-2">请仔细核实患者身份信息</h3>
                <ul className="space-y-2 text-sm text-medical-700">
                  <li>• 核对身份证与患者本人一致</li>
                  <li>• 确认病历号与系统记录匹配</li>
                  <li>• 询问并记录有效联系电话</li>
                  <li>• 确认开单科室与医生信息</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="data-card">
            <h3 className="font-semibold text-foreground mb-3">必须询问的关键问题</h3>
            <ul className="space-y-3">
              {[
                '是否有心脏起搏器、人工耳蜗等植入物？',
                '是否有金属异物、手术史（尤其近期）？',
                '是否有肾功能不全病史（增强扫描必问）？',
                '是否有碘过敏或药物过敏史？',
                '是否可能妊娠（育龄女性必问）？',
                '是否有幽闭恐惧症或精神类疾病？',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-risk-safe flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {isUrgent && (
            <div className="data-card bg-risk-absolute/5 border-risk-absolute/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-risk-absolute flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-risk-absolute mb-1">加急检查提醒</h3>
                  <p className="text-sm text-risk-absolute/80">
                    已标记为加急检查，请优先安排筛查与排班，并通知相关人员。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
