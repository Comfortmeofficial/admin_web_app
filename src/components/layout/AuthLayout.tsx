import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Comfort Me" className="w-42 h-42 -mb-32" />
          {/* <h1 className="text-2xl font-bold text-gray-900">Comfort Me</h1> */}
          <p className="text-gray-500 text-sm mt-1">Admin Dashboard</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
