import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { authApi } from '../api/authApi';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-500 mt-1">
            We sent password reset instructions to your email address.
          </p>
        </div>
        <Link
          to="/reset-password"
          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Enter reset code
        </Link>
        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Forgot password?</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a reset code.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
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

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Send reset code
      </Button>

      <Link to="/login" className="text-sm text-center text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </Link>
    </form>
  );
}
