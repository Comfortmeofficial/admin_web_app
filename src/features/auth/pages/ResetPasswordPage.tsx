import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { authApi } from '../api/authApi';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';

interface ResetForm {
  email: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetForm>();

  const onSubmit = async (values: ResetForm) => {
    setError('');
    try {
      await authApi.resetPassword({
        email: values.email,
        otp: values.otp,
        new_password: values.new_password,
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Password reset!</h2>
          <p className="text-sm text-gray-500 mt-1">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reset password</h2>
        <p className="text-sm text-gray-500 mt-1">Enter the code sent to your email and your new password.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <Input
        label="Email address"
        type="email"
        placeholder="admin@comfortmeng.com"
        required
        {...register('email', { required: 'Email is required' })}
        error={errors.email?.message}
      />

      <Input
        label="Reset code (OTP)"
        type="text"
        placeholder="Enter 6-digit code"
        required
        {...register('otp', { required: 'OTP is required' })}
        error={errors.otp?.message}
      />

      <Input
        label="New password"
        type="password"
        placeholder="Min. 8 characters"
        leftIcon={<Lock className="w-4 h-4" />}
        required
        {...register('new_password', { required: 'Password is required', minLength: { value: 8, message: 'Min. 8 characters' } })}
        error={errors.new_password?.message}
      />

      <Input
        label="Confirm new password"
        type="password"
        placeholder="Repeat new password"
        leftIcon={<Lock className="w-4 h-4" />}
        required
        {...register('confirm_password', {
          required: 'Please confirm password',
          validate: (val) => val === watch('new_password') || 'Passwords do not match',
        })}
        error={errors.confirm_password?.message}
      />

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Reset password
      </Button>

      <Link to="/login" className="text-sm text-center text-gray-500 hover:text-gray-700">
        Back to sign in
      </Link>
    </form>
  );
}
