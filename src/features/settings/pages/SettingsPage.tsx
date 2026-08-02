import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, CreditCard, Bell, Gift, FileText, Shield } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Tabs';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authApi } from '@/features/auth/api/authApi';
import { getErrorMessage } from '@/lib/utils';

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'payment', label: 'Payment' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'booking', label: 'Booking Rules' },
  { key: 'security', label: 'Security' },
];

export function SettingsPage() {
  const [tab, setTab] = useState('company');
  const { admin } = useAuth();
  const toast = useToast();

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Configure platform settings and preferences" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'company' && <CompanySettings />}
        {tab === 'payment' && <PaymentSettings />}
        {tab === 'notifications' && <NotificationSettings />}
        {tab === 'booking' && <BookingRulesSettings />}
        {tab === 'security' && <SecuritySettings admin={admin} toast={toast} />}
      </div>
    </div>
  );
}

function CompanySettings() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      company_name: 'Comfort Me Transport',
      email: 'admin@comfortmeng.com',
      phone: '+234-800-000-0000',
      address: 'Lagos, Nigeria',
      about: '',
    },
  });
  const toast = useToast();
  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-900">Company Information</h3>
      </div>
      <form onSubmit={handleSubmit(() => toast.success('Settings saved'))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Company Name" {...register('company_name')} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Address" {...register('address')} />
        </div>
        <Textarea label="About" rows={4} {...register('about')} placeholder="Brief description of your company…" />
        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}

function PaymentSettings() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      provider: 'paystack',
      public_key: '',
      cancellation_fee_percent: '0',
      refund_window_hours: '24',
    },
  });
  const toast = useToast();
  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">Payment Settings</h3>
      </div>
      <form onSubmit={handleSubmit(() => toast.success('Payment settings saved'))} className="space-y-4">
        <Select
          label="Payment Provider"
          options={[{ value: 'paystack', label: 'Paystack' }]}
          {...register('provider')}
          hint="Additional providers can be added via the adapter pattern"
        />
        <Input label="Public Key" {...register('public_key')} placeholder="pk_live_..." />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Cancellation Fee (%)" type="number" min={0} max={100} {...register('cancellation_fee_percent')} />
          <Input label="Refund Window (hours)" type="number" {...register('refund_window_hours')} />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Save Payment Settings</Button>
        </div>
      </form>
    </Card>
  );
}

function NotificationSettings() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      sms_enabled: true,
      email_enabled: true,
      push_enabled: true,
      booking_reminder_hours: '2',
    },
  });
  const toast = useToast();
  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-gray-900">Notification Settings</h3>
      </div>
      <form onSubmit={handleSubmit(() => toast.success('Notification settings saved'))} className="space-y-4">
        <div className="space-y-3">
          {[
            { key: 'sms_enabled', label: 'SMS Notifications', hint: 'Send SMS via Twilio' },
            { key: 'email_enabled', label: 'Email Notifications', hint: 'Send emails via Twilio SendGrid' },
            { key: 'push_enabled', label: 'Push Notifications', hint: 'Send push via Firebase' },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                <p className="text-xs text-gray-500">{setting.hint}</p>
              </div>
              <input type="checkbox" {...register(setting.key as 'sms_enabled')} className="w-4 h-4 rounded text-primary-600" />
            </div>
          ))}
        </div>
        <Input label="Ride Reminder (hours before departure)" type="number" {...register('booking_reminder_hours')} />
        <div className="flex justify-end">
          <Button type="submit">Save Notification Settings</Button>
        </div>
      </form>
    </Card>
  );
}

function BookingRulesSettings() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      min_booking_hours: '1',
      max_seats_per_booking: '5',
      cancellation_deadline_hours: '2',
    },
  });
  const toast = useToast();
  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Booking Rules</h3>
      </div>
      <form onSubmit={handleSubmit(() => toast.success('Booking rules saved'))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Min Booking Lead Time (hours)" type="number" {...register('min_booking_hours')} />
          <Input label="Max Seats Per Booking" type="number" {...register('max_seats_per_booking')} />
          <Input label="Cancellation Deadline (hours before departure)" type="number" {...register('cancellation_deadline_hours')} />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Save Rules</Button>
        </div>
      </form>
    </Card>
  );
}

function SecuritySettings({ admin, toast }: { admin: { email: string } | null; toast: ReturnType<typeof useToast> }) {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<{
    current_password: string;
    new_password: string;
    confirm_password: string;
  }>();

  const onSubmit = handleSubmit(async (data) => {
    if (!admin) return;
    try {
      await authApi.changePassword({
        email: admin.email,
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (e) {
      toast.error('Failed to change password', getErrorMessage(e));
    }
  });

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-gray-900">Security</h3>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <h4 className="font-medium text-gray-700">Change Password</h4>
        <Input label="Current Password" type="password" required {...register('current_password', { required: 'Required' })} error={errors.current_password?.message} />
        <Input label="New Password" type="password" required {...register('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={errors.new_password?.message} />
        <Input label="Confirm New Password" type="password" required
          {...register('confirm_password', { required: 'Required', validate: (v) => v === watch('new_password') || 'Passwords do not match' })}
          error={errors.confirm_password?.message}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>Change Password</Button>
        </div>
      </form>
    </Card>
  );
}
