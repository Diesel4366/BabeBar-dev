export type Profile = {
  id: string;
  phone: string | null;
  name: string | null;
  role: 'client' | 'admin';
  telegram_chat_id: string | null;
  telegram_id: string | null;
  oidc_id: string | null;
  telegram_username: string | null;
  telegram_photo: string | null;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  category: string;
  is_addon: boolean;
  addon_for_category: string | null;
  created_at: string;
};

export type ScheduleRule = {
  id: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  is_working: boolean;
};

export type ScheduleException = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  is_working: boolean;
};

export type AppointmentStatus = 'active' | 'cancelled_by_client' | 'cancelled_by_admin' | 'completed';

export type Appointment = {
  id: string;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  total_price: number;
  created_at: string;
};

export type AppointmentWithDetails = Appointment & {
  client: Profile;
  services: Service[];
};
