import type { Database } from './database.types';

type T = Database['public']['Tables'];
type V = Database['public']['Views'];
export type Row<K extends keyof T> = T[K]['Row'];
export type ViewRow<K extends keyof V> = V[K]['Row'];

export type Profile = Row<'profiles'>;
export type Project = Row<'projects'>;
export type Plot = Row<'plots'>;
export type Booking = Row<'bookings'>;
export type Installment = Row<'payment_schedule'>;
export type Payment = Row<'payments'>;
export type Milestone = Row<'milestones'>;
export type ConstructionUpdate = Row<'construction_updates'>;
export type Lead = Row<'leads'>;
export type LeadActivity = Row<'lead_activities'>;
export type SiteVisit = Row<'site_visits'>;
export type Contractor = Row<'contractors'>;
export type WorkPackage = Row<'work_packages'>;
export type Material = Row<'materials'>;
export type Vendor = Row<'vendors'>;
export type Delivery = Row<'deliveries'>;
export type MaterialRequest = Row<'material_requests'>;
export type StockMovement = Row<'stock_movements'>;
export type Employee = Row<'employees'>;
export type Attendance = Row<'attendance'>;
export type Modification = Row<'modification_requests'>;
export type ActivityItem = Row<'activity_log'>;
export type DocumentRow = Row<'documents'>;
export type NotificationRow = Row<'notifications'>;
export type MaterialStock = ViewRow<'material_stock'>;
export type ContractorUsage = ViewRow<'contractor_material_usage'>;

export type PlotStatus = Database['public']['Enums']['plot_status'];
export type LeadStage = Database['public']['Enums']['lead_stage'];
export type MilestoneKey = 'compound_wall' | 'roads' | 'drains' | 'electrical' | 'water_tank' | 'park' | 'clubhouse';
export type Progress = Partial<Record<MilestoneKey, number>>;

export type Rect = { x: number; y: number; w: number; h: number; label?: string; main?: boolean };
export type SiteLayout = {
  viewBox: [number, number, number, number];
  boundary: Rect;
  roads: Rect[];
  park?: Rect;
  clubhouse?: Rect;
  water_tank?: { x: number; y: number };
  gate?: { x: number; y: number; label?: string };
  north?: { x: number; y: number };
};

/** The minimum a plot needs to be drawn in 2D or 3D. */
export type PlotShape = Pick<Plot, 'id' | 'plot_number' | 'status' | 'shape_path' | 'area_sqft' | 'facing' | 'is_corner' | 'price' | 'held_until'>;
