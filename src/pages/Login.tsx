import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stethoscope,
  User,
  Lock,
  ShieldCheck,
  Clock,
  TrendingUp,
} from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { USER_ROLE_LABELS } from '@/types';
import type { UserRole } from '@/types';

const loginSchema = z.object({
  employeeId: z.string().min(1, { message: '请输入工号' }),
  password: z.string().min(1, { message: '请输入密码' }),
  role: z.enum(['booking_staff', 'nurse', 'admin'] as const),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const { login, initUsers } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeId: '',
      password: '',
      role: 'booking_staff',
    },
  });

  const roleOptions: Array<{ value: UserRole; label: string }> = [
    { value: 'booking_staff', label: USER_ROLE_LABELS.booking_staff },
    { value: 'nurse', label: USER_ROLE_LABELS.nurse },
    { value: 'admin', label: USER_ROLE_LABELS.admin },
  ];

  const featureCards = [
    {
      icon: ShieldCheck,
      title: '智能风险筛查',
      desc: 'AI 驱动的禁忌证自动识别，降低漏检风险',
    },
    {
      icon: Clock,
      title: '高效预约排班',
      desc: '机房资源智能调度，减少空档期超过 30%',
    },
    {
      icon: TrendingUp,
      title: '数据可视化',
      desc: '全流程数据追踪，持续优化运营效率',
    },
  ];

  const onSubmit = async (data: LoginFormValues) => {
    initUsers();
    let employeeId = data.employeeId;
    const demoMap: Record<string, UserRole> = {
      admin: 'admin',
      nurse: 'nurse',
      booking: 'booking_staff',
    };
    if (demoMap[employeeId]) {
      const { users } = useAuthStore.getState();
      const matched = users.find((u) => u.role === demoMap[employeeId]);
      if (matched) {
        employeeId = matched.employeeId;
      }
    }
    const success = login(employeeId, data.password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('employeeId', {
        type: 'manual',
        message: '工号或密码错误，请重试',
      });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="relative flex w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-medical-50 via-medical-100 to-medical-200 p-12">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#0D3B7A 1px, transparent 1px), linear-gradient(90deg, #0D3B7A 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-500/15">
              <Stethoscope className="h-6 w-6 text-medical-600" />
            </div>
            <span className="text-lg font-bold text-medical-800">MRI 核验平台</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-white/70 shadow-lg backdrop-blur-sm">
            <Stethoscope className="h-14 w-14 text-medical-600" />
          </div>
          <h1 className="mb-3 text-center text-4xl font-bold tracking-tight text-medical-900">
            磁共振预约核验平台
          </h1>
          <p className="mb-10 text-center text-lg font-medium text-medical-700">
            减少到检后退检 · 降低机房空档 · 提升预约效率
          </p>

          <div className="grid w-full max-w-xl grid-cols-3 gap-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-xl border border-medical-300/60 bg-white/60 p-5 backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-medical-500/10">
                    <Icon className="h-5 w-5 text-medical-600" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-bold text-medical-800">
                    {card.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-medical-600/80">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-center text-xs text-medical-600/60">
          © 2024 MRI 核验平台 · 影像科智能预约系统
        </div>
      </div>

      <div className="flex w-[45%] items-center justify-center bg-card p-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              欢迎登录
            </h2>
            <p className="text-sm text-muted-foreground">
              请输入您的工号和密码
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">工号</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="请输入工号"
                  className="form-input pl-10"
                  {...register('employeeId')}
                />
              </div>
              {errors.employeeId && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.employeeId.message}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">密码</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="请输入密码"
                  className="form-input pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">角色</label>
              <select className="form-select" {...register('role')}>
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.role.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary h-10 w-full text-base"
            >
              {isSubmitting ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              演示账号
            </p>
            <p className="text-xs text-foreground/70">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                admin
              </code>
              <span className="mx-2 text-muted-foreground">/</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                nurse
              </code>
              <span className="mx-2 text-muted-foreground">/</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                booking
              </code>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              （密码任意）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
