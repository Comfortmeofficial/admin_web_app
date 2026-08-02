import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';
import type { Admin } from '@/types';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setError('');
    try {
      const data = await authApi.login(values);
      const admin: Admin = {
        id: data.admin_id,
        email: values.email,
        first_name: data.admin?.first_name ?? '',
        last_name: data.admin?.last_name ?? '',
        role: data.role as Admin['role'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      login({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? '',
        expires_in: data.expires_in ?? 3600,
        admin_id: data.admin_id,
        role: data.role as Admin['role'],
        admin,
      });
      navigate('/', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sign in to your account</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <Input
        label="Email address"
        type="email"
        placeholder="admin@comfortmeng.com"
        leftIcon={<Mail className="w-4 h-4" />}
        required
        {...register('email', { required: 'Email is required' })}
        error={errors.email?.message}
      />

      <div className="flex flex-col gap-1">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="pointer-events-auto text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          required
          {...register('password', { required: 'Password is required' })}
          error={errors.password?.message}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Sign in
      </Button>
    </form>
  );
}
