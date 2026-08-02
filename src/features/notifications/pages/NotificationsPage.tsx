import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Send, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { notificationClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import type { NotificationChannel, SendNotificationPayload } from '@/types';

const CHANNEL_OPTIONS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push Notification' },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'users', label: 'Users Only' },
  { value: 'drivers', label: 'Drivers Only' },
  { value: 'specific', label: 'Specific User/Phone' },
];

interface NotificationForm {
  title: string;
  message: string;
  channel: NotificationChannel;
  target_type: string;
  phone?: string;
  user_id?: string;
  scheduled_at?: string;
}

export function NotificationsPage() {
  const toast = useToast();
  const [showSend, setShowSend] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<NotificationForm>({
    defaultValues: { channel: 'sms', target_type: 'all' },
  });

  const targetType = watch('target_type');
  const channel = watch('channel');

  const sendMutation = useMutation({
    mutationFn: async (data: NotificationForm) => {
      const endpoint = data.channel === 'sms' ? '/api/v1/notifications/ride-update'
        : '/api/v1/notifications/ride-update';
      await notificationClient.post(endpoint, {
        phone: data.phone,
        user_id: data.user_id,
        message: data.message,
      });
    },
    onSuccess: () => {
      toast.success('Notification sent');
      setShowSend(false);
      reset();
    },
    onError: (e) => toast.error('Failed to send', getErrorMessage(e)),
  });

  const submit = handleSubmit((data) => sendMutation.mutate(data));

  return (
    <div className="flex flex-col h-full">
      <Header title="Notification Management" subtitle="Send and schedule notifications to users and drivers" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Send SMS',
              desc: 'Send immediate SMS to users or drivers via Twilio',
              icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
              iconBg: 'bg-blue-100',
              action: () => setShowSend(true),
            },
            {
              title: 'Send Push Notification',
              desc: 'Send push notifications to mobile app users',
              icon: <Smartphone className="w-6 h-6 text-purple-600" />,
              iconBg: 'bg-purple-100',
              action: () => setShowSend(true),
            },
            {
              title: 'Schedule Broadcast',
              desc: 'Schedule a notification for a future time',
              icon: <Bell className="w-6 h-6 text-amber-600" />,
              iconBg: 'bg-amber-100',
              action: () => setShowSchedule(true),
            },
          ].map((card) => (
            <Card key={card.title} className="flex flex-col items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={card.action} className="mt-auto">
                {card.title}
              </Button>
            </Card>
          ))}
        </div>

        {/* Notification channels info */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Notification Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { channel: 'SMS', provider: 'Twilio', icon: <MessageSquare className="w-5 h-5 text-blue-600" />, status: 'Active' },
              { channel: 'Email', provider: 'Twilio SendGrid', icon: <Mail className="w-5 h-5 text-green-600" />, status: 'Active' },
              { channel: 'Push', provider: 'Firebase', icon: <Smartphone className="w-5 h-5 text-orange-600" />, status: 'Configured' },
            ].map((ch) => (
              <div key={ch.channel} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {ch.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{ch.channel}</p>
                  <p className="text-xs text-gray-500">{ch.provider}</p>
                </div>
                <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                  {ch.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Notification templates */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Notification Templates</h3>
          <div className="space-y-3">
            {[
              { name: 'Booking Confirmation', trigger: 'On booking created', channel: 'SMS + Push' },
              { name: 'Payment Receipt', trigger: 'On payment success', channel: 'SMS + Email' },
              { name: 'Ride Reminder', trigger: '2 hours before departure', channel: 'SMS + Push' },
              { name: 'OTP Verification', trigger: 'On signup/password reset', channel: 'SMS' },
              { name: 'Ride Update', trigger: 'Manual trigger', channel: 'SMS + Push' },
            ].map((t) => (
              <div key={t.name} className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.trigger}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t.channel}</span>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Send Notification Modal */}
      <Modal
        open={showSend}
        onClose={() => { setShowSend(false); reset(); }}
        title="Send Notification"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowSend(false); reset(); }}>Cancel</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={submit} loading={sendMutation.isPending}>Send Now</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Channel"
            options={CHANNEL_OPTIONS}
            {...register('channel', { required: 'Required' })}
            error={errors.channel?.message}
          />
          <Select
            label="Target Audience"
            options={TARGET_OPTIONS}
            {...register('target_type', { required: 'Required' })}
            error={errors.target_type?.message}
          />
          {targetType === 'specific' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone Number" placeholder="+234..." {...register('phone')} />
              <Input label="User ID" placeholder="Optional" {...register('user_id')} />
            </div>
          )}
          <Input label="Title" required {...register('title', { required: 'Required' })} error={errors.title?.message} />
          <Textarea label="Message" required rows={4} {...register('message', { required: 'Required' })} error={errors.message?.message} />
        </div>
      </Modal>

      {/* Schedule Notification Modal */}
      <Modal
        open={showSchedule}
        onClose={() => { setShowSchedule(false); reset(); }}
        title="Schedule Notification"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button icon={<Bell className="w-4 h-4" />} onClick={submit} loading={sendMutation.isPending}>Schedule</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="Channel" options={CHANNEL_OPTIONS} {...register('channel')} />
          <Select label="Target Audience" options={TARGET_OPTIONS} {...register('target_type')} />
          <Input label="Title" required {...register('title', { required: 'Required' })} error={errors.title?.message} />
          <Textarea label="Message" required rows={3} {...register('message', { required: 'Required' })} error={errors.message?.message} />
          <Input label="Schedule At" type="datetime-local" {...register('scheduled_at')} />
        </div>
      </Modal>
    </div>
  );
}
