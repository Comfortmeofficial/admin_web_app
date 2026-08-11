// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'operations_manager'
  | 'customer_support'
  | 'finance_officer'
  | 'bus_marshal';

export interface Admin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  admin_id: string;
  role: AdminRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateAdminPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  password: string;
}

export interface UpdateAdminPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: AdminRole;
  is_active?: boolean;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  is_verified: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export type DriverStatus =
  | 'available'
  | 'assigned'
  | 'on_trip'
  | 'offline'
  | 'on_leave'
  | 'suspended';

export type DriverVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface Driver {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  emergency_contact?: string;
  next_of_kin?: string;
  license_number: string;
  license_expiry: string;
  driver_type?: string;
  status: DriverStatus;
  verification_status: DriverVerificationStatus;
  rating?: number;
  total_trips?: number;
  assigned_bus_id?: string;
  assigned_ride_id?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDriverPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  emergency_contact?: string;
  next_of_kin?: string;
  license_number: string;
  license_expiry: string;
  driver_type?: string;
}

// ─── Bus ──────────────────────────────────────────────────────────────────────

export type BusStatus = 'active' | 'maintenance' | 'retired' | 'in_service' | 'inactive';

export type SeatType = 'standard' | 'premium' | 'disabled' | 'driver' | 'walkway' | 'empty';

// row/col are 1-indexed (row 1 = first row) to match the backend and what
// the mobile seat picker expects — the designer used to generate these
// 0-indexed internally, which only "worked" for buses whose layout was
// never regenerated through this screen.
export interface SeatDefinition {
  row: number;
  col: number;
  seat_number: string;
  seat_type: SeatType;
  is_seat: boolean;
}

// A draggable section of the layout (e.g. "left side", "back row"),
// positioned on the designer's canvas at (x, y) — both 1-indexed grid
// units — with seats numbered locally within the section. Flattened into
// SeatLayout.seats (translated to global row/col) before saving, so every
// other consumer of a bus's layout only ever needs `seats`.
export interface SeatBlock {
  id: string;
  label?: string;
  x: number;
  y: number;
  rows: number;
  cols: number;
  seats: SeatDefinition[];
}

export interface SeatLayout {
  rows: number;
  cols: number;
  seats: SeatDefinition[];
  blocks?: SeatBlock[];
}

export interface Bus {
  id: string;
  plate_number: string;
  model: string;
  capacity: number;
  status: BusStatus;
  driver_id?: string;
  layout?: SeatLayout;
  created_at: string;
  updated_at: string;
}

export interface CreateBusPayload {
  plate_number: string;
  model: string;
  capacity?: number;
  rows?: number;
  cols?: number;
  layout?: SeatLayout;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  state?: string;
  created_at: string;
}

export interface Destination {
  id: string;
  name: string;
  state?: string;
  created_at: string;
}

export interface Stop {
  id: string;
  name: string;
  order?: number;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  location_id: string;
  destination_id: string;
  distance_km?: number;
  stops?: Stop[];
  created_at: string;
  updated_at: string;
}

export interface CreateRoutePayload {
  name: string;
  location_id: number;
  destination_id: number;
  distance_km?: number;
  stops?: { stop_id: number; fare?: number }[];
}

// ─── Ride ─────────────────────────────────────────────────────────────────────

export type RideStatus =
  | 'scheduled'
  | 'boarding'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface Ride {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id: string;
  departure_time: string;
  arrival_time?: string;
  fare: number;
  total_seats: number;
  booked_seats: number;
  status: RideStatus;
  driver_name?: string;
  driver_rating?: number;
  bus_plate?: string;
  bus_model?: string;
  marshal_admin_id?: number | null;
  marshal_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRidePayload {
  route_id: number;
  bus_id: number;
  driver_id: number;
  departure_time: string;
  arrival_time?: string;
  fare: number;
  total_seats: number;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed';
export type PaymentMethod = 'wallet' | 'debit_card' | 'bank_transfer';

export interface Booking {
  id: string;
  reference: string;
  user_id: string;
  ride_id: string;
  seat_number: string;
  amount: number;
  discount_amount?: number;
  final_amount: number;
  coupon_code?: string;
  payment_method: PaymentMethod;
  status: BookingStatus;
  is_on_board: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Marshal / trip chat ────────────────────────────────────────────────────

export interface Passenger {
  booking_id: number;
  reference: string;
  seat_number: string;
  status: BookingStatus;
  is_on_board: boolean;
  pickup_stop_id: number | null;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
}

export interface ChatMessage {
  id: number;
  ride_id: number;
  user_id: number;
  sender_type: 'customer' | 'marshal';
  message: string;
  created_at: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type TransactionType = 'booking' | 'wallet_fund' | 'refund' | 'withdrawal';

export interface Transaction {
  id: string;
  reference: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: PaymentStatus;
  description?: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  description: string;
  reference: string;
  created_at: string;
}

// ─── Referral ─────────────────────────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  code: string;
  user_id?: string;
  discount_percent?: number;
  flat_amount?: number;
  max_uses?: number;
  uses_count: number;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateReferralCodePayload {
  code?: string;
  user_id?: string;
  discount_percent?: number;
  flat_amount?: number;
  max_uses?: number;
  expiry_date?: string;
}

export type MilestoneRewardType = 'flat' | 'percentage';

export interface ReferralMilestone {
  id: string;
  threshold: number;
  reward_type: MilestoneRewardType;
  reward_value: number;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MilestoneFormValues {
  threshold: number;
  reward_type: MilestoneRewardType;
  reward_value: number;
  label: string;
  is_active: boolean;
}

// ─── Rental ───────────────────────────────────────────────────────────────────

export type RentalStatus = 'pending' | 'awaiting_payment' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
export type RentalPaymentMethod = 'wallet' | 'card' | 'bank';

export interface Rental {
  id: string;
  user_id: string;
  pickup: string;
  destination: string;
  event_type: string;
  pickup_date: string;
  pickup_time: string;
  phone: string;
  notes?: string;
  is_round_trip: boolean;
  return_date?: string;
  return_time?: string;
  amount: number;
  payment_method: RentalPaymentMethod;
  status: RentalStatus;
  created_at: string;
  updated_at: string;
}

// ─── Package ───────────────────────────────────────────────────────────────────

export type PackageStatus = 'pending_pickup' | 'in_transit' | 'delivered' | 'cancelled';

export interface Package {
  id: string;
  order_id: string;
  ride_id: string;
  sender_user_id: string;
  recipient_name: string;
  recipient_phone: string;
  drop_off_note?: string;
  fare_amount: number;
  status: PackageStatus;
  ride: {
    route: {
      location: { name: string };
      destination: { name: string };
    };
  };
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationChannel = 'sms' | 'email' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'scheduled';

export interface Notification {
  id: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  target?: string;
  status: NotificationStatus;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

export interface SendNotificationPayload {
  title: string;
  message: string;
  channels: NotificationChannel[];
  target_type: 'all' | 'users' | 'drivers' | 'specific';
  target_ids?: string[];
  scheduled_at?: string;
  phone?: string;
  user_id?: string;
}

// ─── Terms & Conditions ───────────────────────────────────────────────────────

export type ContentStatus = 'draft' | 'published';

export type TermsDocType = 'terms' | 'privacy';

export interface TermsAndConditions {
  id: string;
  title: string;
  content: string;
  version: string;
  status: ContentStatus;
  doc_type: TermsDocType;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Support Ticket ───────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketCategory = 'booking' | 'payment' | 'driver' | 'general' | 'complaint';

export interface SupportTicket {
  id: string;
  reference: string;
  user_id: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Dashboard Analytics ──────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_drivers: number;
  total_buses: number;
  active_rides: number;
  scheduled_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  total_bookings: number;
  revenue: number;
  pending_payments: number;
  successful_payments: number;
  failed_payments: number;
  referral_usage: number;
}

export type DateRangeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
