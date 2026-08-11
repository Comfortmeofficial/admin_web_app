import { Outlet, Navigate } from 'react-router-dom';
import { LogOut, Bus } from 'lucide-react';
import { useDriverAuth } from '../context/DriverAuthContext';

export function DriverAuthLayout() {
  const { isAuthenticated } = useDriverAuth();
  if (isAuthenticated) return <Navigate to="/driver" replace />;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xl font-bold text-gray-900">Comfortme</p>
          <p className="text-gray-500 text-sm mt-1">Driver Portal</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function RequireDriverAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useDriverAuth();
  if (!isAuthenticated) return <Navigate to="/driver/login" replace />;
  return <>{children}</>;
}

export function DriverPortalLayout() {
  const { driver, logout } = useDriverAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-900">
            {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver Portal'}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <LogOut size={16} />
          Log out
        </button>
      </header>
      <main className="p-4 max-w-lg mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
