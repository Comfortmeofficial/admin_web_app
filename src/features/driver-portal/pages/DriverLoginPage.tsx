import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { driverPortalApi } from '../api/driverPortalApi';
import { useDriverAuth } from '../context/DriverAuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';

interface DriverLoginForm {
  email: string;
  password: string;
}

export function DriverLoginPage() {
  const { login } = useDriverAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DriverLoginForm>();

  const onSubmit = async (values: DriverLoginForm) => {
    setError('');
    try {
      const tokens = await driverPortalApi.login(values.email, values.password);
      login(tokens);
      navigate('/driver', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Driver Sign In</h2>
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
        placeholder="you@comfortmeng.com"
        leftIcon={<Mail className="w-4 h-4" />}
        required
        {...register('email', { required: 'Email is required' })}
        error={errors.email?.message}
      />

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

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Sign in
      </Button>
    </form>
  );
}
