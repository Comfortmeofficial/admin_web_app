import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Package as PackageIcon } from 'lucide-react';
import { driverPortalApi } from '../api/driverPortalApi';
import { useDriverAuth } from '../context/DriverAuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import type { DriverPackage } from '../types';

function PackageRow({ pkg, rideId }: { pkg: DriverPackage; rideId: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [otp, setOtp] = useState('');

  const deliverMutation = useMutation({
    mutationFn: () => driverPortalApi.deliverPackage(pkg.id, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-portal-packages', rideId] });
      toast.success(`Package ${pkg.order_id} delivered`);
      setConfirming(false);
      setOtp('');
    },
    onError: (e) => toast.error('Invalid code', getErrorMessage(e)),
  });

  return (
    <div className="border-b border-gray-100 last:border-0 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{pkg.order_id}</p>
          <p className="text-xs text-gray-500">{pkg.recipient_name} · {pkg.recipient_phone}</p>
        </div>
        {!confirming && (
          <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
            Confirm Delivery
          </Button>
        )}
      </div>
      {confirming && (
        <div className="flex items-center gap-2 mt-3">
          <Input
            placeholder="Enter 4-digit code"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={() => deliverMutation.mutate()} loading={deliverMutation.isPending} disabled={otp.length < 4}>
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}

export function DriverHomePage() {
  const { driver } = useDriverAuth();
  const [showCode, setShowCode] = useState(false);
  const rideId = driver?.current_ride_id ?? null;

  const { data: ride } = useQuery({
    queryKey: ['driver-portal-ride', rideId],
    queryFn: () => driverPortalApi.getRide(rideId!),
    enabled: !!rideId,
  });

  const { data: rideCode, isFetching: isLoadingCode } = useQuery({
    queryKey: ['driver-portal-ride-code', rideId],
    queryFn: () => driverPortalApi.getRideCode(rideId!),
    enabled: !!rideId && showCode,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['driver-portal-packages', rideId],
    queryFn: () => driverPortalApi.getRidePackages(rideId!),
    enabled: !!rideId,
  });

  const pendingPackages = packages.filter((p) => p.status === 'pending_pickup' || p.status === 'in_transit');

  if (!rideId) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
        You have no active ride assigned right now.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <p className="text-xs font-medium text-gray-500 uppercase">Current Ride</p>
        {ride ? (
          <>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {ride.route.location.name} → {ride.route.destination.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{formatDateTime(ride.departure_time)}</p>
          </>
        ) : (
          <p className="text-sm text-gray-400 mt-1">Loading ride…</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Show this to riders to confirm boarding or trip completion.
        </p>
        {!showCode ? (
          <Button icon={<QrCode size={16} />} onClick={() => setShowCode(true)} className="w-full">
            Show Boarding Code
          </Button>
        ) : isLoadingCode || !rideCode ? (
          <p className="text-sm text-gray-400 py-8">Generating code…</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <QRCodeSVG value={rideCode.qr_payload} size={200} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Or enter this code manually</p>
              <p className="text-2xl font-bold tracking-widest text-gray-900">{rideCode.otp}</p>
            </div>
          </div>
        )}
      </div>

      {pendingPackages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <PackageIcon size={16} className="text-gray-500" />
            <p className="text-sm font-medium text-gray-900">Packages on this ride</p>
          </div>
          {pendingPackages.map((pkg) => (
            <PackageRow key={pkg.id} pkg={pkg} rideId={rideId} />
          ))}
        </div>
      )}
    </div>
  );
}
