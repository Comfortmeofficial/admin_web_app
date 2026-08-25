import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout, RequireAuth } from './components/layout/AuthLayout';
import { DriverAuthProvider } from './features/driver-portal/context/DriverAuthContext';
import { DriverAuthLayout, RequireDriverAuth, DriverPortalLayout } from './features/driver-portal/layout/DriverPortalLayout';
import { DriverLoginPage } from './features/driver-portal/pages/DriverLoginPage';
import { DriverHomePage } from './features/driver-portal/pages/DriverHomePage';

// Auth pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';

// App pages
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { AdminsPage } from './features/admins/pages/AdminsPage';
import { UsersPage } from './features/users/pages/UsersPage';
import { UserDetailPage } from './features/users/pages/UserDetailPage';
import { DriversPage } from './features/drivers/pages/DriversPage';
import { DriverDetailPage } from './features/drivers/pages/DriverDetailPage';
import { BusesPage } from './features/buses/pages/BusesPage';
import { BusDetailPage } from './features/buses/pages/BusDetailPage';
import { RoutesPage } from './features/routes/pages/RoutesPage';
import { SchedulesPage } from './features/schedules/pages/SchedulesPage';
import { RidesPage } from './features/rides/pages/RidesPage';
import { RideDetailPage } from './features/rides/pages/RideDetailPage';
import { BookingsPage } from './features/bookings/pages/BookingsPage';
import { BookingDetailPage } from './features/bookings/pages/BookingDetailPage';
import { PaymentsPage } from './features/payments/pages/PaymentsPage';
import { ReferralsPage } from './features/referrals/pages/ReferralsPage';
import { RentalsPage } from './features/rentals/pages/RentalsPage';
// Packages feature disabled — see Sidebar.tsx and the /packages route below.
// import { PackagesPage } from './features/packages/pages/PackagesPage';
import { NotificationsPage } from './features/notifications/pages/NotificationsPage';
import { ContentPage } from './features/content/pages/ContentPage';
import { ReportsPage } from './features/reports/pages/ReportsPage';
import { AuditLogsPage } from './features/audit/pages/AuditLogsPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { SupportPage } from './features/support/pages/SupportPage';
import { MyTripPage } from './features/marshal/pages/MyTripPage';

// A bus marshal's whole job in this dashboard is My Trip — everything else
// on the general Dashboard is irrelevant to their role.
function HomeRedirect() {
  const { admin } = useAuth();
  if (admin?.role === 'bus_marshal') {
    return <Navigate to="/my-trip" replace />;
  }
  return <DashboardPage />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              {/* Driver portal — a separate principal/auth flow from admin staff */}
              <Route
                element={
                  <DriverAuthProvider>
                    <Outlet />
                  </DriverAuthProvider>
                }
              >
                <Route element={<DriverAuthLayout />}>
                  <Route path="/driver/login" element={<DriverLoginPage />} />
                </Route>
                <Route
                  element={
                    <RequireDriverAuth>
                      <DriverPortalLayout />
                    </RequireDriverAuth>
                  }
                >
                  <Route path="/driver" element={<DriverHomePage />} />
                </Route>
              </Route>

              {/* Protected app routes */}
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<HomeRedirect />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="/my-trip" element={<MyTripPage />} />

                {/* Users */}
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />

                {/* Drivers */}
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/drivers/:id" element={<DriverDetailPage />} />

                {/* Buses */}
                <Route path="/buses" element={<BusesPage />} />
                <Route path="/buses/:id" element={<BusDetailPage />} />

                {/* Operations */}
                <Route path="/routes" element={<Navigate to="/schedules" replace />} />
                <Route path="/locations" element={<RoutesPage />} />
                <Route path="/schedules" element={<SchedulesPage />} />

                {/* Rides */}
                <Route path="/rides" element={<RidesPage />} />
                <Route path="/rides/:id" element={<RideDetailPage />} />

                {/* Bookings */}
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />

                {/* Other modules */}
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/rentals" element={<RentalsPage />} />
                {/* <Route path="/packages" element={<PackagesPage />} /> */}
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/content" element={<ContentPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/support" element={<SupportPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
