import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Send, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { notificationClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';

// Matches modules/notifications/validation.ts's rideUpdateSchema exactly —
// the only backend capability this page can actually drive today. There's
// no generic "send an arbitrary broadcast" endpoint, no email channel on
// this route, and no server-side scheduler, so the form only offers what's
// real: a single rider, about a single ride, over SMS (phone is optional —
// omit it and the message still lands in the rider's in-app notification
// inbox, just without a text going out).
interface RideUpdateForm {
  user_id: string;
  ride_id: string;
  phone?: string;
  message: string;
}

export function NotificationsPage() {
  const toast = useToast();
  const [showSend, setShowSend] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RideUpdateForm>();

  const sendMutation = useMutation({
    mutationFn: async (data: RideUpdateForm) => {
      await notificationClient.post('/api/v1/notifications/ride-update', {
        user_id: Number(data.user_id),
        ride_id: Number(data.ride_id),
        phone: data.phone || undefined,
        message: data.message,
      });
    },
    onSuccess: () => {
      toast.success('Ride update sent');
      setShowSend(false);
      reset();
    },
    onError: (e) => toast.error('Failed to send', getErrorMessage(e)),
  });

  const submit = handleSubmit((data) => sendMutation.mutate(data));

  return (
    <div className="flex flex-col h-full">
      <Header title="Notification Management" subtitle="Send a manual ride update to a passenger" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card className="flex flex-col items-start gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Send Ride Update</h3>
            <p className="text-sm text-gray-500 mt-1">
              Notify one passenger about one of their rides — e.g. a delay or a driver change. Delivered
              by SMS (if a phone number is given) and always saved to the rider's in-app notifications.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSend(true)} className="mt-auto">
            Send Ride Update
          </Button>
        </Card>

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

        {/* Automatic notifications — informational only, not admin-triggered */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Automatic Notifications</h3>
          <div className="space-y-3">
            {[
              { name: 'Booking Confirmation', trigger: 'On booking created', channel: 'SMS + Push' },
              { name: 'Payment Receipt', trigger: 'On payment success', channel: 'SMS + Email' },
              { name: 'Ride Reminder', trigger: '2 hours before departure', channel: 'SMS + Push' },
              { name: 'OTP Verification', trigger: 'On signup/password reset', channel: 'SMS' },
            ].map((t) => (
              <div key={t.name} className="flex items-center justify-between py-3 border-b last:border-0 border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.trigger}</p>
                </div>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t.channel}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Send Ride Update Modal */}
      <Modal
        open={showSend}
        onClose={() => { setShowSend(false); reset(); }}
        title="Send Ride Update"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowSend(false); reset(); }}>Cancel</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={submit} loading={sendMutation.isPending}>Send</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="User ID"
              required
              {...register('user_id', { required: 'Required' })}
              error={errors.user_id?.message}
            />
            <Input
              label="Ride ID"
              required
              {...register('ride_id', { required: 'Required' })}
              error={errors.ride_id?.message}
            />
          </div>
          <Input
            label="Phone Number"
            placeholder="+234... (optional — sends SMS if given)"
            {...register('phone')}
          />
          <Textarea
            label="Message"
            required
            rows={4}
            placeholder="e.g. Your driver is running about 10 minutes late."
            {...register('message', { required: 'Required' })}
            error={errors.message?.message}
          />
        </div>
      </Modal>
    </div>
  );
}
