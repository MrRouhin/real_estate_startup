
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "access_requests": {
                  Row: {
                    "categories": (string)[],"company_name": string | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"email": string | null,"full_name": string,"gst_number": string | null,"id": string,"message": string | null,"note": string | null,"org_id": string,"phone": string | null,"role": string,"status": string,"trade": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categories"?: (string)[],"company_name"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email"?: string | null,"full_name": string,"gst_number"?: string | null,"id"?: string,"message"?: string | null,"note"?: string | null,"org_id": string,"phone"?: string | null,"role": string,"status"?: string,"trade"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "categories"?: (string)[],"company_name"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"email"?: string | null,"full_name"?: string,"gst_number"?: string | null,"id"?: string,"message"?: string | null,"note"?: string | null,"org_id"?: string,"phone"?: string | null,"role"?: string,"status"?: string,"trade"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "access_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "access_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "access_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activity_log": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"id": number,"kind": string,"message": string,"org_id": string,"project_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"kind": string,"message": string,"org_id": string,"project_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"kind"?: string,"message"?: string,"org_id"?: string,"project_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "activity_log_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_checks": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"org_id": string,"result": NonNullable<Json>,"subject_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"org_id": string,"result": NonNullable<Json>,"subject_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"org_id"?: string,"result"?: NonNullable<Json>,"subject_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_checks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_insights": {
                  Row: {
                    "body": string | null,"created_at": string,"created_by": string | null,"data": NonNullable<Json>,"decided_at": string | null,"decided_by": string | null,"id": string,"kind": string,"org_id": string,"project_id": string | null,"scope": string,"severity": string,"shared_with_contractor": boolean,"source": string,"status": string,"subject_id": string | null,"suggestion": Json | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"kind": string,"org_id": string,"project_id"?: string | null,"scope": string,"severity"?: string,"shared_with_contractor"?: boolean,"source"?: string,"status"?: string,"subject_id"?: string | null,"suggestion"?: Json | null,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"kind"?: string,"org_id"?: string,"project_id"?: string | null,"scope"?: string,"severity"?: string,"shared_with_contractor"?: boolean,"source"?: string,"status"?: string,"subject_id"?: string | null,"suggestion"?: Json | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_insights_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_insights_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_insights_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "ai_insights_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "ai_insights_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_usage": {
                  Row: {
                    "actor": string | null,"created_at": string,"feature": string,"id": number,"input_tokens": number | null,"model": string | null,"org_id": string | null,"output_tokens": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"feature": string,"id"?: never,"input_tokens"?: number | null,"model"?: string | null,"org_id"?: string | null,"output_tokens"?: number | null
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"feature"?: string,"id"?: never,"input_tokens"?: number | null,"model"?: string | null,"org_id"?: string | null,"output_tokens"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"announcements": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"org_id": string,"project_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"org_id": string,"project_id": string,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"org_id"?: string,"project_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "announcements_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "announcements_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "check_in_at": string,"check_out_at": string | null,"distance_m": number | null,"employee_id": string,"id": string,"inside_geofence": boolean | null,"lat": number | null,"lng": number | null,"org_id": string,"project_id": string | null,"selfie_path": string | null,"work_date": string,"work_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "check_in_at"?: string,"check_out_at"?: string | null,"distance_m"?: number | null,"employee_id": string,"id"?: string,"inside_geofence"?: boolean | null,"lat"?: number | null,"lng"?: number | null,"org_id": string,"project_id"?: string | null,"selfie_path"?: string | null,"work_date": string,"work_note"?: string | null
                  }
                  Update: {
                    "check_in_at"?: string,"check_out_at"?: string | null,"distance_m"?: number | null,"employee_id"?: string,"id"?: string,"inside_geofence"?: boolean | null,"lat"?: number | null,"lng"?: number | null,"org_id"?: string,"project_id"?: string | null,"selfie_path"?: string | null,"work_date"?: string,"work_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "attendance_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "attendance_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "buyer_id": string,"confirmed_at": string | null,"created_at": string,"id": string,"notes": string | null,"org_id": string,"plot_id": string,"status": Database["public"]['Enums']["booking_status"],"token_amount": number,"total_amount": number
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id": string,"confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"notes"?: string | null,"org_id": string,"plot_id": string,"status"?: Database["public"]['Enums']["booking_status"],"token_amount": number,"total_amount": number
                  }
                  Update: {
                    "buyer_id"?: string,"confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"notes"?: string | null,"org_id"?: string,"plot_id"?: string,"status"?: Database["public"]['Enums']["booking_status"],"token_amount"?: number,"total_amount"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_plot_id_org_id_fkey"
      columns: ["plot_id","org_id"]
isOneToOne: false
      referencedRelation: "plots"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"construction_updates": {
                  Row: {
                    "body": string | null,"created_at": string,"created_by": string | null,"id": string,"milestone_id": string | null,"milestone_progress": number | null,"org_id": string,"photo_paths": (string)[],"progress_percent": number | null,"project_id": string,"snapshot": Json | null,"title": string,"tower_id": string | null,"tower_snapshot": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"milestone_id"?: string | null,"milestone_progress"?: number | null,"org_id": string,"photo_paths"?: (string)[],"progress_percent"?: number | null,"project_id": string,"snapshot"?: Json | null,"title": string,"tower_id"?: string | null,"tower_snapshot"?: Json | null
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"milestone_id"?: string | null,"milestone_progress"?: number | null,"org_id"?: string,"photo_paths"?: (string)[],"progress_percent"?: number | null,"project_id"?: string,"snapshot"?: Json | null,"title"?: string,"tower_id"?: string | null,"tower_snapshot"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "construction_updates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "construction_updates_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "construction_updates_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "construction_updates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "construction_updates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "construction_updates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "construction_updates_tower_id_fkey"
      columns: ["tower_id"]
isOneToOne: false
      referencedRelation: "towers"
      referencedColumns: ["id"]
    }
                  ]
                },"contractor_bills": {
                  Row: {
                    "contractor_id": string,"created_at": string,"created_by": string | null,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"gross_amount": number,"gst_pct": number,"id": string,"invoice_number": string | null,"net_payable": number | null,"note": string | null,"org_id": string,"paid_at": string | null,"payment_ref": string | null,"period_from": string | null,"period_to": string | null,"progress_claimed": number | null,"project_id": string,"retention_pct": number,"seq": number,"status": string,"tds_pct": number,"work_package_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contractor_id": string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"gross_amount": number,"gst_pct"?: number,"id"?: string,"invoice_number"?: string | null,"net_payable"?: never,"note"?: string | null,"org_id": string,"paid_at"?: string | null,"payment_ref"?: string | null,"period_from"?: string | null,"period_to"?: string | null,"progress_claimed"?: number | null,"project_id": string,"retention_pct"?: number,"seq"?: never,"status"?: string,"tds_pct"?: number,"work_package_id"?: string | null
                  }
                  Update: {
                    "contractor_id"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"gross_amount"?: number,"gst_pct"?: number,"id"?: string,"invoice_number"?: string | null,"net_payable"?: never,"note"?: string | null,"org_id"?: string,"paid_at"?: string | null,"payment_ref"?: string | null,"period_from"?: string | null,"period_to"?: string | null,"progress_claimed"?: number | null,"project_id"?: string,"retention_pct"?: number,"seq"?: never,"status"?: string,"tds_pct"?: number,"work_package_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contractor_bills_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractor_bills_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractor_bills_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractor_bills_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractor_bills_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "contractor_bills_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "contractor_bills_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractor_bills_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"contractors": {
                  Row: {
                    "address": string | null,"bank_ifsc": string | null,"bank_last4": string | null,"company_name": string,"contact_person": string | null,"contract_type": string,"created_at": string,"email": string | null,"gst_number": string | null,"id": string,"insurance_policy": string | null,"insurance_valid_till": string | null,"license_number": string | null,"org_id": string,"pan": string | null,"phone": string | null,"profile_note": string | null,"profile_status": string,"profile_updated_at": string | null,"rating": number | null,"status": string,"team_size": number | null,"trade": Database["public"]['Enums']["trade"],"upi_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"company_name": string,"contact_person"?: string | null,"contract_type"?: string,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"insurance_policy"?: string | null,"insurance_valid_till"?: string | null,"license_number"?: string | null,"org_id": string,"pan"?: string | null,"phone"?: string | null,"profile_note"?: string | null,"profile_status"?: string,"profile_updated_at"?: string | null,"rating"?: number | null,"status"?: string,"team_size"?: number | null,"trade"?: Database["public"]['Enums']["trade"],"upi_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"company_name"?: string,"contact_person"?: string | null,"contract_type"?: string,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"insurance_policy"?: string | null,"insurance_valid_till"?: string | null,"license_number"?: string | null,"org_id"?: string,"pan"?: string | null,"phone"?: string | null,"profile_note"?: string | null,"profile_status"?: string,"profile_updated_at"?: string | null,"rating"?: number | null,"status"?: string,"team_size"?: number | null,"trade"?: Database["public"]['Enums']["trade"],"upi_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contractors_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contractors_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"crew_tasks": {
                  Row: {
                    "contractor_id": string | null,"created_at": string,"created_by": string | null,"details": string | null,"done_at": string | null,"done_note": string | null,"due_date": string | null,"employee_id": string | null,"id": string,"org_id": string,"priority": string,"project_id": string | null,"status": string,"title": string,"work_package_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contractor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: string | null,"done_at"?: string | null,"done_note"?: string | null,"due_date"?: string | null,"employee_id"?: string | null,"id"?: string,"org_id": string,"priority"?: string,"project_id"?: string | null,"status"?: string,"title": string,"work_package_id"?: string | null
                  }
                  Update: {
                    "contractor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: string | null,"done_at"?: string | null,"done_note"?: string | null,"due_date"?: string | null,"employee_id"?: string | null,"id"?: string,"org_id"?: string,"priority"?: string,"project_id"?: string | null,"status"?: string,"title"?: string,"work_package_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "crew_tasks_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crew_tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crew_tasks_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crew_tasks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crew_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "crew_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "crew_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crew_tasks_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"deliveries": {
                  Row: {
                    "accepted_qty": number | null,"created_at": string,"created_by": string | null,"delivered_at": string,"id": string,"inspected_at": string | null,"inspected_by": string | null,"inspection_note": string | null,"invoice_number": string | null,"invoice_path": string | null,"location": string | null,"material_id": string,"org_id": string,"paid_at": string | null,"payment_ref": string | null,"photo_paths": (string)[],"po_id": string | null,"project_id": string,"quantity": number,"seq": number,"status": Database["public"]['Enums']["delivery_status"],"unit_cost": number | null,"vehicle_number": string | null,"vendor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_qty"?: number | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_note"?: string | null,"invoice_number"?: string | null,"invoice_path"?: string | null,"location"?: string | null,"material_id": string,"org_id": string,"paid_at"?: string | null,"payment_ref"?: string | null,"photo_paths"?: (string)[],"po_id"?: string | null,"project_id": string,"quantity": number,"seq"?: never,"status"?: Database["public"]['Enums']["delivery_status"],"unit_cost"?: number | null,"vehicle_number"?: string | null,"vendor_id": string
                  }
                  Update: {
                    "accepted_qty"?: number | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_note"?: string | null,"invoice_number"?: string | null,"invoice_path"?: string | null,"location"?: string | null,"material_id"?: string,"org_id"?: string,"paid_at"?: string | null,"payment_ref"?: string | null,"photo_paths"?: (string)[],"po_id"?: string | null,"project_id"?: string,"quantity"?: number,"seq"?: never,"status"?: Database["public"]['Enums']["delivery_status"],"unit_cost"?: number | null,"vehicle_number"?: string | null,"vendor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliveries_inspected_by_fkey"
      columns: ["inspected_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "deliveries_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_po_id_fkey"
      columns: ["po_id"]
isOneToOne: false
      referencedRelation: "purchase_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "deliveries_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "deliveries_vendor_id_fkey"
      columns: ["vendor_id"]
isOneToOne: false
      referencedRelation: "vendors"
      referencedColumns: ["id"]
    }
                  ]
                },"doc_chunks": {
                  Row: {
                    "booking_id": string | null,"content": string,"document_id": string | null,"heading": string | null,"id": number,"org_id": string,"project_id": string,"title": string,"tsv": unknown,"visibility": Database["public"]['Enums']["doc_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"content": string,"document_id"?: string | null,"heading"?: string | null,"id"?: never,"org_id": string,"project_id": string,"title": string,"tsv"?: never,"visibility"?: Database["public"]['Enums']["doc_visibility"]
                  }
                  Update: {
                    "booking_id"?: string | null,"content"?: string,"document_id"?: string | null,"heading"?: string | null,"id"?: never,"org_id"?: string,"project_id"?: string,"title"?: string,"tsv"?: never,"visibility"?: Database["public"]['Enums']["doc_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "doc_chunks_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_balances"
      referencedColumns: ["booking_id"]
    },{
      foreignKeyName: "doc_chunks_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doc_chunks_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doc_chunks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "doc_chunks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "doc_chunks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "doc_chunks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "booking_id": string | null,"category": string,"created_at": string,"id": string,"org_id": string,"project_id": string,"storage_path": string,"title": string,"uploaded_by": string | null,"visibility": Database["public"]['Enums']["doc_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"category"?: string,"created_at"?: string,"id"?: string,"org_id": string,"project_id": string,"storage_path": string,"title": string,"uploaded_by"?: string | null,"visibility"?: Database["public"]['Enums']["doc_visibility"]
                  }
                  Update: {
                    "booking_id"?: string | null,"category"?: string,"created_at"?: string,"id"?: string,"org_id"?: string,"project_id"?: string,"storage_path"?: string,"title"?: string,"uploaded_by"?: string | null,"visibility"?: Database["public"]['Enums']["doc_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_balances"
      referencedColumns: ["booking_id"]
    },{
      foreignKeyName: "documents_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_profiles": {
                  Row: {
                    "address": string | null,"bank_ifsc": string | null,"bank_last4": string | null,"blood_group": string | null,"city": string | null,"date_of_birth": string | null,"emergency_name": string | null,"emergency_phone": string | null,"emergency_relation": string | null,"employee_id": string,"experience_years": number | null,"home_state": string | null,"id_last4": string | null,"id_type": string | null,"languages": (string)[],"org_id": string,"photo_path": string | null,"review_note": string | null,"safety_trained": boolean,"safety_training_date": string | null,"skills": (string)[],"status": string,"submitted_at": string | null,"trade": string | null,"updated_at": string,"upi_id": string | null,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"blood_group"?: string | null,"city"?: string | null,"date_of_birth"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"employee_id": string,"experience_years"?: number | null,"home_state"?: string | null,"id_last4"?: string | null,"id_type"?: string | null,"languages"?: (string)[],"org_id": string,"photo_path"?: string | null,"review_note"?: string | null,"safety_trained"?: boolean,"safety_training_date"?: string | null,"skills"?: (string)[],"status"?: string,"submitted_at"?: string | null,"trade"?: string | null,"updated_at"?: string,"upi_id"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"blood_group"?: string | null,"city"?: string | null,"date_of_birth"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"employee_id"?: string,"experience_years"?: number | null,"home_state"?: string | null,"id_last4"?: string | null,"id_type"?: string | null,"languages"?: (string)[],"org_id"?: string,"photo_path"?: string | null,"review_note"?: string | null,"safety_trained"?: boolean,"safety_training_date"?: string | null,"skills"?: (string)[],"status"?: string,"submitted_at"?: string | null,"trade"?: string | null,"updated_at"?: string,"upi_id"?: string | null,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_profiles_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: true
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employee_profiles_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employee_profiles_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "active": boolean,"contractor_id": string | null,"created_at": string,"daily_wage": number | null,"employee_code": string,"full_name": string,"id": string,"org_id": string,"phone": string | null,"project_id": string | null,"role_title": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"contractor_id"?: string | null,"created_at"?: string,"daily_wage"?: number | null,"employee_code": string,"full_name": string,"id"?: string,"org_id": string,"phone"?: string | null,"project_id"?: string | null,"role_title"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"contractor_id"?: string | null,"created_at"?: string,"daily_wage"?: number | null,"employee_code"?: string,"full_name"?: string,"id"?: string,"org_id"?: string,"phone"?: string | null,"project_id"?: string | null,"role_title"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "employees_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "employees_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_activities": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"id": number,"lead_id": string,"org_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"lead_id": string,"org_id": string,"type": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"lead_id"?: string,"org_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_activities_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_activities_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "assigned_to": string | null,"budget_max": number | null,"budget_min": number | null,"buyer_id": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"interested_plot_id": string | null,"lost_reason": string | null,"message": string | null,"next_follow_up_at": string | null,"org_id": string,"phone": string,"preferred_facing": Database["public"]['Enums']["facing"] | null,"preferred_size": number | null,"project_id": string | null,"source": string,"stage": Database["public"]['Enums']["lead_stage"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"budget_max"?: number | null,"budget_min"?: number | null,"buyer_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"interested_plot_id"?: string | null,"lost_reason"?: string | null,"message"?: string | null,"next_follow_up_at"?: string | null,"org_id": string,"phone": string,"preferred_facing"?: Database["public"]['Enums']["facing"] | null,"preferred_size"?: number | null,"project_id"?: string | null,"source"?: string,"stage"?: Database["public"]['Enums']["lead_stage"],"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"budget_max"?: number | null,"budget_min"?: number | null,"buyer_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"interested_plot_id"?: string | null,"lost_reason"?: string | null,"message"?: string | null,"next_follow_up_at"?: string | null,"org_id"?: string,"phone"?: string,"preferred_facing"?: Database["public"]['Enums']["facing"] | null,"preferred_size"?: number | null,"project_id"?: string | null,"source"?: string,"stage"?: Database["public"]['Enums']["lead_stage"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_interested_plot_id_fkey"
      columns: ["interested_plot_id"]
isOneToOne: false
      referencedRelation: "plots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "leads_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "leads_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"leave_requests": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"employee_id": string,"from_date": string,"id": string,"kind": string,"org_id": string,"reason": string | null,"status": string,"to_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"employee_id": string,"from_date": string,"id"?: string,"kind"?: string,"org_id": string,"reason"?: string | null,"status"?: string,"to_date": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"employee_id"?: string,"from_date"?: string,"id"?: string,"kind"?: string,"org_id"?: string,"reason"?: string | null,"status"?: string,"to_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leave_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leave_requests_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leave_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"letters": {
                  Row: {
                    "ack_note": string | null,"acknowledged_at": string | null,"body": string,"created_at": string,"created_by": string | null,"data": NonNullable<Json>,"id": string,"issued_at": string | null,"issued_by": string | null,"kind": string,"org_id": string,"project_id": string | null,"recipient_id": string,"recipient_type": string,"seq": number,"source": string,"status": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ack_note"?: string | null,"acknowledged_at"?: string | null,"body": string,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"id"?: string,"issued_at"?: string | null,"issued_by"?: string | null,"kind": string,"org_id": string,"project_id"?: string | null,"recipient_id": string,"recipient_type": string,"seq"?: never,"source"?: string,"status"?: string,"subject": string
                  }
                  Update: {
                    "ack_note"?: string | null,"acknowledged_at"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string | null,"data"?: NonNullable<Json>,"id"?: string,"issued_at"?: string | null,"issued_by"?: string | null,"kind"?: string,"org_id"?: string,"project_id"?: string | null,"recipient_id"?: string,"recipient_type"?: string,"seq"?: never,"source"?: string,"status"?: string,"subject"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "letters_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "letters_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "letters_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "letters_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "letters_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"market_factors": {
                  Row: {
                    "expected_year": number | null,"id": string,"impact_pct": number,"kind": string,"label": string,"org_id": string,"project_id": string,"sort_order": number,"source": string | null,"status": string,"value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "expected_year"?: number | null,"id"?: string,"impact_pct"?: number,"kind"?: string,"label": string,"org_id": string,"project_id": string,"sort_order"?: number,"source"?: string | null,"status"?: string,"value"?: number | null
                  }
                  Update: {
                    "expected_year"?: number | null,"id"?: string,"impact_pct"?: number,"kind"?: string,"label"?: string,"org_id"?: string,"project_id"?: string,"sort_order"?: number,"source"?: string | null,"status"?: string,"value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_factors_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "market_factors_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "market_factors_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "market_factors_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"material_requests": {
                  Row: {
                    "contractor_id": string,"created_at": string,"created_by": string | null,"decided_at": string | null,"decided_by": string | null,"id": string,"location": string | null,"material_id": string,"needed_by": string | null,"org_id": string,"project_id": string,"purpose": string | null,"quantity": number,"seq": number,"status": Database["public"]['Enums']["request_status"],"work_package_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contractor_id": string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"location"?: string | null,"material_id": string,"needed_by"?: string | null,"org_id": string,"project_id": string,"purpose"?: string | null,"quantity": number,"seq"?: never,"status"?: Database["public"]['Enums']["request_status"],"work_package_id"?: string | null
                  }
                  Update: {
                    "contractor_id"?: string,"created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"location"?: string | null,"material_id"?: string,"needed_by"?: string | null,"org_id"?: string,"project_id"?: string,"purpose"?: string | null,"quantity"?: number,"seq"?: never,"status"?: Database["public"]['Enums']["request_status"],"work_package_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_requests_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "material_requests_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "material_requests_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "material_requests_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "category": string,"id": string,"name": string,"org_id": string,"reorder_level": number,"unit": string,"unit_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"id"?: string,"name": string,"org_id": string,"reorder_level"?: number,"unit": string,"unit_cost"?: number | null
                  }
                  Update: {
                    "category"?: string,"id"?: string,"name"?: string,"org_id"?: string,"reorder_level"?: number,"unit"?: string,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "id": string,"key": string,"name": string,"org_id": string,"progress": number,"project_id": string,"sort_order": number,"updated_at": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"key": string,"name": string,"org_id": string,"progress"?: number,"project_id": string,"sort_order"?: number,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "id"?: string,"key"?: string,"name"?: string,"org_id"?: string,"progress"?: number,"project_id"?: string,"sort_order"?: number,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "milestones_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"modification_requests": {
                  Row: {
                    "booking_id": string,"buyer_approved_at": string | null,"buyer_id": string,"contractor_id": string | null,"created_at": string,"deadline": string | null,"id": string,"org_id": string,"quoted_cost": number | null,"requirement": string,"seq": number,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"buyer_approved_at"?: string | null,"buyer_id": string,"contractor_id"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"org_id": string,"quoted_cost"?: number | null,"requirement": string,"seq"?: never,"status"?: string
                  }
                  Update: {
                    "booking_id"?: string,"buyer_approved_at"?: string | null,"buyer_id"?: string,"contractor_id"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"org_id"?: string,"quoted_cost"?: number | null,"requirement"?: string,"seq"?: never,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "modification_requests_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_balances"
      referencedColumns: ["booking_id"]
    },{
      foreignKeyName: "modification_requests_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modification_requests_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modification_requests_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modification_requests_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"org_id": string,"org_role": Database["public"]['Enums']["org_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"org_id": string,"org_role"?: Database["public"]['Enums']["org_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"org_id"?: string,"org_role"?: Database["public"]['Enums']["org_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "address": string | null,"created_at": string,"email": string | null,"gst_number": string | null,"id": string,"invite_code": string | null,"is_demo": boolean,"is_verified": boolean,"name": string,"payment_plan": NonNullable<Json>,"phone": string | null,"signatory_name": string | null,"signatory_title": string | null,"token_percent": number,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"invite_code"?: string | null,"is_demo"?: boolean,"is_verified"?: boolean,"name": string,"payment_plan"?: NonNullable<Json>,"phone"?: string | null,"signatory_name"?: string | null,"signatory_title"?: string | null,"token_percent"?: number,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"invite_code"?: string | null,"is_demo"?: boolean,"is_verified"?: boolean,"name"?: string,"payment_plan"?: NonNullable<Json>,"phone"?: string | null,"signatory_name"?: string | null,"signatory_title"?: string | null,"token_percent"?: number,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"payment_schedule": {
                  Row: {
                    "amount": number,"booking_id": string,"due_date": string | null,"due_note": string | null,"id": string,"label": string,"org_id": string,"sort_order": number,"status": Database["public"]['Enums']["installment_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"booking_id": string,"due_date"?: string | null,"due_note"?: string | null,"id"?: string,"label": string,"org_id": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["installment_status"]
                  }
                  Update: {
                    "amount"?: number,"booking_id"?: string,"due_date"?: string | null,"due_note"?: string | null,"id"?: string,"label"?: string,"org_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["installment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_schedule_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_balances"
      referencedColumns: ["booking_id"]
    },{
      foreignKeyName: "payment_schedule_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_schedule_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"booking_id": string,"buyer_id": string,"created_at": string,"currency": string,"id": string,"installment_id": string | null,"org_id": string,"paid_at": string | null,"razorpay_order_id": string | null,"razorpay_payment_id": string | null,"status": Database["public"]['Enums']["payment_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"booking_id": string,"buyer_id": string,"created_at"?: string,"currency"?: string,"id"?: string,"installment_id"?: string | null,"org_id": string,"paid_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"]
                  }
                  Update: {
                    "amount"?: number,"booking_id"?: string,"buyer_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"installment_id"?: string | null,"org_id"?: string,"paid_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"status"?: Database["public"]['Enums']["payment_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_balances"
      referencedColumns: ["booking_id"]
    },{
      foreignKeyName: "payments_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_installment_id_fkey"
      columns: ["installment_id"]
isOneToOne: false
      referencedRelation: "payment_schedule"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"plot_events": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"org_id": string,"plot_id": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"org_id": string,"plot_id": string,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"org_id"?: string,"plot_id"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plot_events_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plot_events_plot_id_fkey"
      columns: ["plot_id"]
isOneToOne: false
      referencedRelation: "plots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plot_events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "plot_events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "plot_events_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"plot_price_history": {
                  Row: {
                    "changed_at": string,"id": number,"org_id": string,"plot_id": string,"price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"id"?: never,"org_id": string,"plot_id": string,"price": number
                  }
                  Update: {
                    "changed_at"?: string,"id"?: never,"org_id"?: string,"plot_id"?: string,"price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plot_price_history_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plot_price_history_plot_id_fkey"
      columns: ["plot_id"]
isOneToOne: false
      referencedRelation: "plots"
      referencedColumns: ["id"]
    }
                  ]
                },"plots": {
                  Row: {
                    "area_sqft": number,"created_at": string,"dimensions": string | null,"facing": Database["public"]['Enums']["facing"] | null,"floor": number | null,"held_by": string | null,"held_until": string | null,"id": string,"is_corner": boolean,"kind": string,"mirror": boolean,"org_id": string,"plot_number": string,"price": number,"project_id": string,"shape_path": string | null,"stack": number | null,"status": Database["public"]['Enums']["plot_status"],"svg_shape_id": string | null,"tower_id": string | null,"unit_type_id": string | null,"view": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_sqft": number,"created_at"?: string,"dimensions"?: string | null,"facing"?: Database["public"]['Enums']["facing"] | null,"floor"?: number | null,"held_by"?: string | null,"held_until"?: string | null,"id"?: string,"is_corner"?: boolean,"kind"?: string,"mirror"?: boolean,"org_id": string,"plot_number": string,"price": number,"project_id": string,"shape_path"?: string | null,"stack"?: number | null,"status"?: Database["public"]['Enums']["plot_status"],"svg_shape_id"?: string | null,"tower_id"?: string | null,"unit_type_id"?: string | null,"view"?: string | null
                  }
                  Update: {
                    "area_sqft"?: number,"created_at"?: string,"dimensions"?: string | null,"facing"?: Database["public"]['Enums']["facing"] | null,"floor"?: number | null,"held_by"?: string | null,"held_until"?: string | null,"id"?: string,"is_corner"?: boolean,"kind"?: string,"mirror"?: boolean,"org_id"?: string,"plot_number"?: string,"price"?: number,"project_id"?: string,"shape_path"?: string | null,"stack"?: number | null,"status"?: Database["public"]['Enums']["plot_status"],"svg_shape_id"?: string | null,"tower_id"?: string | null,"unit_type_id"?: string | null,"view"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plots_held_by_fkey"
      columns: ["held_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plots_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "plots_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "plots_tower_id_fkey"
      columns: ["tower_id"]
isOneToOne: false
      referencedRelation: "towers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plots_unit_type_id_fkey"
      columns: ["unit_type_id"]
isOneToOne: false
      referencedRelation: "unit_types"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "address": string | null,"city": string | null,"created_at": string,"date_of_birth": string | null,"email": string | null,"full_name": string | null,"id": string,"id_last4": string | null,"id_type": string | null,"kyc_doc_path": string | null,"kyc_note": string | null,"kyc_status": string,"kyc_submitted_at": string | null,"kyc_verified_at": string | null,"occupation": string | null,"phone": string | null,"pincode": string | null,"preferred_language": string | null,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"email"?: string | null,"full_name"?: string | null,"id": string,"id_last4"?: string | null,"id_type"?: string | null,"kyc_doc_path"?: string | null,"kyc_note"?: string | null,"kyc_status"?: string,"kyc_submitted_at"?: string | null,"kyc_verified_at"?: string | null,"occupation"?: string | null,"phone"?: string | null,"pincode"?: string | null,"preferred_language"?: string | null,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"date_of_birth"?: string | null,"email"?: string | null,"full_name"?: string | null,"id"?: string,"id_last4"?: string | null,"id_type"?: string | null,"kyc_doc_path"?: string | null,"kyc_note"?: string | null,"kyc_status"?: string,"kyc_submitted_at"?: string | null,"kyc_verified_at"?: string | null,"occupation"?: string | null,"phone"?: string | null,"pincode"?: string | null,"preferred_language"?: string | null,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "address": string | null,"ai_summary": Json | null,"amenities": (string)[],"city": string | null,"cover_image_path": string | null,"created_at": string,"description": string | null,"geofence_m": number,"id": string,"is_published": boolean,"kind": string,"layout": Json | null,"layout_svg_path": string | null,"layout_viewbox": string | null,"name": string,"org_id": string,"payment_plan": Json | null,"possession_date": string | null,"pricing": Json | null,"progress_percent": number,"rera_number": string | null,"site_lat": number | null,"site_lng": number | null,"slug": string,"status": Database["public"]['Enums']["project_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"ai_summary"?: Json | null,"amenities"?: (string)[],"city"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"geofence_m"?: number,"id"?: string,"is_published"?: boolean,"kind"?: string,"layout"?: Json | null,"layout_svg_path"?: string | null,"layout_viewbox"?: string | null,"name": string,"org_id": string,"payment_plan"?: Json | null,"possession_date"?: string | null,"pricing"?: Json | null,"progress_percent"?: number,"rera_number"?: string | null,"site_lat"?: number | null,"site_lng"?: number | null,"slug": string,"status"?: Database["public"]['Enums']["project_status"]
                  }
                  Update: {
                    "address"?: string | null,"ai_summary"?: Json | null,"amenities"?: (string)[],"city"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"geofence_m"?: number,"id"?: string,"is_published"?: boolean,"kind"?: string,"layout"?: Json | null,"layout_svg_path"?: string | null,"layout_viewbox"?: string | null,"name"?: string,"org_id"?: string,"payment_plan"?: Json | null,"possession_date"?: string | null,"pricing"?: Json | null,"progress_percent"?: number,"rera_number"?: string | null,"site_lat"?: number | null,"site_lng"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["project_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"purchase_orders": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"created_by": string | null,"delivery_location": string | null,"dispatched_at": string | null,"gst_pct": number,"id": string,"items": NonNullable<Json>,"material_request_id": string | null,"org_id": string,"project_id": string,"promised_date": string | null,"required_by": string | null,"seq": number,"status": string,"subtotal": number,"terms": string | null,"total": number | null,"updated_at": string,"vehicle_number": string | null,"vendor_id": string,"vendor_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_location"?: string | null,"dispatched_at"?: string | null,"gst_pct"?: number,"id"?: string,"items"?: NonNullable<Json>,"material_request_id"?: string | null,"org_id": string,"project_id": string,"promised_date"?: string | null,"required_by"?: string | null,"seq"?: never,"status"?: string,"subtotal"?: number,"terms"?: string | null,"total"?: never,"updated_at"?: string,"vehicle_number"?: string | null,"vendor_id": string,"vendor_note"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_location"?: string | null,"dispatched_at"?: string | null,"gst_pct"?: number,"id"?: string,"items"?: NonNullable<Json>,"material_request_id"?: string | null,"org_id"?: string,"project_id"?: string,"promised_date"?: string | null,"required_by"?: string | null,"seq"?: never,"status"?: string,"subtotal"?: number,"terms"?: string | null,"total"?: never,"updated_at"?: string,"vehicle_number"?: string | null,"vendor_id"?: string,"vendor_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_material_request_id_fkey"
      columns: ["material_request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "purchase_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "purchase_orders_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_orders_vendor_id_fkey"
      columns: ["vendor_id"]
isOneToOne: false
      referencedRelation: "vendors"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string | null,"token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform"?: string | null,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string | null,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_visits": {
                  Row: {
                    "created_at": string,"feedback": string | null,"id": string,"lead_id": string,"org_id": string,"project_id": string | null,"scheduled_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback"?: string | null,"id"?: string,"lead_id": string,"org_id": string,"project_id"?: string | null,"scheduled_at": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: string | null,"id"?: string,"lead_id"?: string,"org_id"?: string,"project_id"?: string | null,"scheduled_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_visits_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "site_visits_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "site_visits_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "site_visits_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "site_visits_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_movements": {
                  Row: {
                    "contractor_id": string | null,"created_at": string,"created_by": string | null,"delivery_id": string | null,"id": number,"location": string | null,"material_id": string,"note": string | null,"org_id": string,"project_id": string,"quantity": number,"request_id": string | null,"type": Database["public"]['Enums']["stock_move"],"vendor_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contractor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_id"?: string | null,"id"?: never,"location"?: string | null,"material_id": string,"note"?: string | null,"org_id": string,"project_id": string,"quantity": number,"request_id"?: string | null,"type": Database["public"]['Enums']["stock_move"],"vendor_id"?: string | null
                  }
                  Update: {
                    "contractor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"delivery_id"?: string | null,"id"?: never,"location"?: string | null,"material_id"?: string,"note"?: string | null,"org_id"?: string,"project_id"?: string,"quantity"?: number,"request_id"?: string | null,"type"?: Database["public"]['Enums']["stock_move"],"vendor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_movements_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "stock_movements_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    },{
      foreignKeyName: "stock_movements_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_vendor_id_fkey"
      columns: ["vendor_id"]
isOneToOne: false
      referencedRelation: "vendors"
      referencedColumns: ["id"]
    }
                  ]
                },"towers": {
                  Row: {
                    "code": string,"expected_completion": string | null,"floor_height_m": number,"floors": number,"id": string,"name": string,"org_id": string,"position": NonNullable<Json>,"project_id": string,"slabs_cast": number,"sort_order": number,"stages": NonNullable<Json>,"units_per_floor": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"expected_completion"?: string | null,"floor_height_m"?: number,"floors": number,"id"?: string,"name": string,"org_id": string,"position"?: NonNullable<Json>,"project_id": string,"slabs_cast"?: number,"sort_order"?: number,"stages"?: NonNullable<Json>,"units_per_floor": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"expected_completion"?: string | null,"floor_height_m"?: number,"floors"?: number,"id"?: string,"name"?: string,"org_id"?: string,"position"?: NonNullable<Json>,"project_id"?: string,"slabs_cast"?: number,"sort_order"?: number,"stages"?: NonNullable<Json>,"units_per_floor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "towers_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "towers_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"unit_types": {
                  Row: {
                    "balconies": number,"base_rate": number,"bathrooms": number,"bedrooms": number,"builtup_sqft": number | null,"carpet_sqft": number,"code": string,"description": string | null,"id": string,"layout": NonNullable<Json>,"name": string,"org_id": string,"project_id": string,"super_sqft": number
                  }
                  ComputedFields: never
                  Insert: {
                    "balconies"?: number,"base_rate": number,"bathrooms": number,"bedrooms": number,"builtup_sqft"?: number | null,"carpet_sqft": number,"code": string,"description"?: string | null,"id"?: string,"layout": NonNullable<Json>,"name": string,"org_id": string,"project_id": string,"super_sqft": number
                  }
                  Update: {
                    "balconies"?: number,"base_rate"?: number,"bathrooms"?: number,"bedrooms"?: number,"builtup_sqft"?: number | null,"carpet_sqft"?: number,"code"?: string,"description"?: string | null,"id"?: string,"layout"?: NonNullable<Json>,"name"?: string,"org_id"?: string,"project_id"?: string,"super_sqft"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "unit_types_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "unit_types_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"vendor_catalog": {
                  Row: {
                    "brand": string | null,"id": string,"in_stock": boolean,"lead_days": number | null,"material_id": string | null,"min_order": number | null,"name": string,"org_id": string,"rate": number,"unit": string,"updated_at": string,"vendor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"id"?: string,"in_stock"?: boolean,"lead_days"?: number | null,"material_id"?: string | null,"min_order"?: number | null,"name": string,"org_id": string,"rate": number,"unit": string,"updated_at"?: string,"vendor_id": string
                  }
                  Update: {
                    "brand"?: string | null,"id"?: string,"in_stock"?: boolean,"lead_days"?: number | null,"material_id"?: string | null,"min_order"?: number | null,"name"?: string,"org_id"?: string,"rate"?: number,"unit"?: string,"updated_at"?: string,"vendor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendor_catalog_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "vendor_catalog_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendor_catalog_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendor_catalog_vendor_id_fkey"
      columns: ["vendor_id"]
isOneToOne: false
      referencedRelation: "vendors"
      referencedColumns: ["id"]
    }
                  ]
                },"vendors": {
                  Row: {
                    "address": string | null,"bank_ifsc": string | null,"bank_last4": string | null,"categories": (string)[],"company_name": string,"contact_person": string | null,"created_at": string,"delivery_regions": string | null,"email": string | null,"gst_number": string | null,"id": string,"org_id": string,"pan": string | null,"phone": string | null,"profile_note": string | null,"profile_status": string,"profile_updated_at": string | null,"rating": number | null,"upi_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"categories"?: (string)[],"company_name": string,"contact_person"?: string | null,"created_at"?: string,"delivery_regions"?: string | null,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id": string,"pan"?: string | null,"phone"?: string | null,"profile_note"?: string | null,"profile_status"?: string,"profile_updated_at"?: string | null,"rating"?: number | null,"upi_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"bank_ifsc"?: string | null,"bank_last4"?: string | null,"categories"?: (string)[],"company_name"?: string,"contact_person"?: string | null,"created_at"?: string,"delivery_regions"?: string | null,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id"?: string,"pan"?: string | null,"phone"?: string | null,"profile_note"?: string | null,"profile_status"?: string,"profile_updated_at"?: string | null,"rating"?: number | null,"upi_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendors_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendors_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_packages": {
                  Row: {
                    "contract_value": number,"contractor_id": string,"due_date": string | null,"id": string,"milestone_id": string | null,"org_id": string,"planned_qty": number | null,"progress": number,"project_id": string,"qty_unit": string | null,"scope": string | null,"start_date": string | null,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_value"?: number,"contractor_id": string,"due_date"?: string | null,"id"?: string,"milestone_id"?: string | null,"org_id": string,"planned_qty"?: number | null,"progress"?: number,"project_id": string,"qty_unit"?: string | null,"scope"?: string | null,"start_date"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "contract_value"?: number,"contractor_id"?: string,"due_date"?: string | null,"id"?: string,"milestone_id"?: string | null,"org_id"?: string,"planned_qty"?: number | null,"progress"?: number,"project_id"?: string,"qty_unit"?: string | null,"scope"?: string | null,"start_date"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_packages_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_packages_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_packages_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "work_packages_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"wp_material_budget": {
                  Row: {
                    "id": string,"material_id": string,"org_id": string,"planned_qty": number,"work_package_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"material_id": string,"org_id": string,"planned_qty": number,"work_package_id": string
                  }
                  Update: {
                    "id"?: string,"material_id"?: string,"org_id"?: string,"planned_qty"?: number,"work_package_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wp_material_budget_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "wp_material_budget_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wp_material_budget_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wp_material_budget_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"wp_plan_points": {
                  Row: {
                    "id": string,"note": string | null,"org_id": string,"planned_date": string,"planned_pct": number,"work_package_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"note"?: string | null,"org_id": string,"planned_date": string,"planned_pct": number,"work_package_id": string
                  }
                  Update: {
                    "id"?: string,"note"?: string | null,"org_id"?: string,"planned_date"?: string,"planned_pct"?: number,"work_package_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wp_plan_points_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wp_plan_points_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"wp_progress_log": {
                  Row: {
                    "id": number,"logged_at": string,"logged_by": string | null,"note": string | null,"org_id": string,"progress": number,"work_package_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"logged_at"?: string,"logged_by"?: string | null,"note"?: string | null,"org_id": string,"progress": number,"work_package_id": string
                  }
                  Update: {
                    "id"?: never,"logged_at"?: string,"logged_by"?: string | null,"note"?: string | null,"org_id"?: string,"progress"?: number,"work_package_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wp_progress_log_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wp_progress_log_work_package_id_fkey"
      columns: ["work_package_id"]
isOneToOne: false
      referencedRelation: "work_packages"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "booking_balances": {
                  Row: {
                    "amount_paid": number | null,"balance": number | null,"booking_id": string | null,"buyer_id": string | null,"org_id": string | null,"plot_id": string | null,"status": Database["public"]['Enums']["booking_status"] | null,"total_amount": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "bookings_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_plot_id_org_id_fkey"
      columns: ["plot_id","org_id"]
isOneToOne: false
      referencedRelation: "plots"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"contractor_material_usage": {
                  Row: {
                    "at_site": number | null,"category": string | null,"consumed": number | null,"contractor_id": string | null,"issued": number | null,"material_id": string | null,"name": string | null,"org_id": string | null,"project_id": string | null,"returned": number | null,"unit": string | null,"unit_cost": number | null,"wastage": number | null,"wastage_pct": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "stock_movements_contractor_id_fkey"
      columns: ["contractor_id"]
isOneToOne: false
      referencedRelation: "contractors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "material_stock"
      referencedColumns: ["material_id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "project_stats"
      referencedColumns: ["project_id","org_id"]
    },{
      foreignKeyName: "stock_movements_project_id_org_id_fkey"
      columns: ["project_id","org_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","org_id"]
    }
                  ]
                },"material_stock": {
                  Row: {
                    "at_site": number | null,"category": string | null,"consumed": number | null,"in_store": number | null,"issued": number | null,"material_id": string | null,"name": string | null,"opening": number | null,"org_id": string | null,"project_id": string | null,"received": number | null,"rejected": number | null,"reorder_level": number | null,"returned": number | null,"unit": string | null,"unit_cost": number | null,"wastage": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "materials_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"project_stats": {
                  Row: {
                    "amount_collected": number | null,"available": number | null,"booked": number | null,"held": number | null,"name": string | null,"org_id": string | null,"progress_percent": number | null,"project_id": string | null,"sold": number | null,"total_plots": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "projects_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_delivery":
{ Args: { "p_accepted": number,"p_delivery": string,"p_note"?: string }; Returns: {
              "accepted_qty": number | null,
"created_at": string,
"created_by": string | null,
"delivered_at": string,
"id": string,
"inspected_at": string | null,
"inspected_by": string | null,
"inspection_note": string | null,
"invoice_number": string | null,
"invoice_path": string | null,
"location": string | null,
"material_id": string,
"org_id": string,
"paid_at": string | null,
"payment_ref": string | null,
"photo_paths": (string)[],
"po_id": string | null,
"project_id": string,
"quantity": number,
"seq": number,
"status": Database["public"]['Enums']["delivery_status"],
"unit_cost": number | null,
"vehicle_number": string | null,
"vendor_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"acknowledge_letter":
{ Args: { "p_letter": string,"p_note"?: string }; Returns: {
              "ack_note": string | null,
"acknowledged_at": string | null,
"body": string,
"created_at": string,
"created_by": string | null,
"data": NonNullable<Json>,
"id": string,
"issued_at": string | null,
"issued_by": string | null,
"kind": string,
"org_id": string,
"project_id": string | null,
"recipient_id": string,
"recipient_type": string,
"seq": number,
"source": string,
"status": string,
"subject": string
            }
                          SetofOptions: {
        from: "*"
        to: "letters"
        isOneToOne: true
        isSetofReturn: false
      } },
"bill_number":
{ Args: { "p_created": string,"p_seq": number }; Returns: string
                           },
"cancel_my_leave":
{ Args: { "p_leave": string }; Returns: {
              "created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"decision_note": string | null,
"employee_id": string,
"from_date": string,
"id": string,
"kind": string,
"org_id": string,
"reason": string | null,
"status": string,
"to_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "leave_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_in":
{ Args: { "p_lat": number,"p_lng": number,"p_note"?: string,"p_selfie"?: string }; Returns: {
              "check_in_at": string,
"check_out_at": string | null,
"distance_m": number | null,
"employee_id": string,
"id": string,
"inside_geofence": boolean | null,
"lat": number | null,
"lng": number | null,
"org_id": string,
"project_id": string | null,
"selfie_path": string | null,
"work_date": string,
"work_note": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "attendance"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_out":
{ Args: { "p_note"?: string }; Returns: {
              "check_in_at": string,
"check_out_at": string | null,
"distance_m": number | null,
"employee_id": string,
"id": string,
"inside_geofence": boolean | null,
"lat": number | null,
"lng": number | null,
"org_id": string,
"project_id": string | null,
"selfie_path": string | null,
"work_date": string,
"work_note": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "attendance"
        isOneToOne: true
        isSetofReturn: false
      } },
"contractor_assign_task":
{ Args: { "p": Json }; Returns: {
              "contractor_id": string | null,
"created_at": string,
"created_by": string | null,
"details": string | null,
"done_at": string | null,
"done_note": string | null,
"due_date": string | null,
"employee_id": string | null,
"id": string,
"org_id": string,
"priority": string,
"project_id": string | null,
"status": string,
"title": string,
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "crew_tasks"
        isOneToOne: true
        isSetofReturn: false
      } },
"contractor_save_employee":
{ Args: { "p": Json }; Returns: {
              "active": boolean,
"contractor_id": string | null,
"created_at": string,
"daily_wage": number | null,
"employee_code": string,
"full_name": string,
"id": string,
"org_id": string,
"phone": string | null,
"project_id": string | null,
"role_title": string | null,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "employees"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_my_organization":
{ Args: { "p": Json }; Returns: {
              "address": string | null,
"created_at": string,
"email": string | null,
"gst_number": string | null,
"id": string,
"invite_code": string | null,
"is_demo": boolean,
"is_verified": boolean,
"name": string,
"payment_plan": NonNullable<Json>,
"phone": string | null,
"signatory_name": string | null,
"signatory_title": string | null,
"token_percent": number,
"website": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "organizations"
        isOneToOne: true
        isSetofReturn: false
      } },
"dearmor":
{ Args: { "": string }; Returns: string
                           },
"decide_access_request":
{ Args: { "p_approve": boolean,"p_contractor"?: string,"p_note"?: string,"p_request": string }; Returns: {
              "categories": (string)[],
"company_name": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"email": string | null,
"full_name": string,
"gst_number": string | null,
"id": string,
"message": string | null,
"note": string | null,
"org_id": string,
"phone": string | null,
"role": string,
"status": string,
"trade": string | null,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "access_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"decide_contractor_bill":
{ Args: { "p_bill": string,"p_note"?: string,"p_ref"?: string,"p_status": string }; Returns: {
              "contractor_id": string,
"created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_note": string | null,
"gross_amount": number,
"gst_pct": number,
"id": string,
"invoice_number": string | null,
"net_payable": number | null,
"note": string | null,
"org_id": string,
"paid_at": string | null,
"payment_ref": string | null,
"period_from": string | null,
"period_to": string | null,
"progress_claimed": number | null,
"project_id": string,
"retention_pct": number,
"seq": number,
"status": string,
"tds_pct": number,
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "contractor_bills"
        isOneToOne: true
        isSetofReturn: false
      } },
"decide_leave":
{ Args: { "p_approve": boolean,"p_leave": string,"p_note"?: string }; Returns: {
              "created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"decision_note": string | null,
"employee_id": string,
"from_date": string,
"id": string,
"kind": string,
"org_id": string,
"reason": string | null,
"status": string,
"to_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "leave_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"decide_material_request":
{ Args: { "p_approve": boolean,"p_request": string }; Returns: {
              "contractor_id": string,
"created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"id": string,
"location": string | null,
"material_id": string,
"needed_by": string | null,
"org_id": string,
"project_id": string,
"purpose": string | null,
"quantity": number,
"seq": number,
"status": Database["public"]['Enums']["request_status"],
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "material_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"flatify_text":
{ Args: { "t": string }; Returns: string
                           },
"fmt_money":
{ Args: { "n": number }; Returns: string
                           },
"gen_random_uuid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"gen_salt":
{ Args: { "": string }; Returns: string
                           },
"hold_plot":
{ Args: { "p_plot_id": string }; Returns: {
              "area_sqft": number,
"created_at": string,
"dimensions": string | null,
"facing": Database["public"]['Enums']["facing"] | null,
"floor": number | null,
"held_by": string | null,
"held_until": string | null,
"id": string,
"is_corner": boolean,
"kind": string,
"mirror": boolean,
"org_id": string,
"plot_number": string,
"price": number,
"project_id": string,
"shape_path": string | null,
"stack": number | null,
"status": Database["public"]['Enums']["plot_status"],
"svg_shape_id": string | null,
"tower_id": string | null,
"unit_type_id": string | null,
"view": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "plots"
        isOneToOne: true
        isSetofReturn: false
      } },
"in_my_crew":
{ Args: { "p_employee": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_org_manager":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_org_member":
{ Args: { "p_org": string }; Returns: boolean
                           },
"is_org_partner":
{ Args: { "p_org": string }; Returns: boolean
                           },
"issue_letter":
{ Args: { "p_letter": string }; Returns: {
              "ack_note": string | null,
"acknowledged_at": string | null,
"body": string,
"created_at": string,
"created_by": string | null,
"data": NonNullable<Json>,
"id": string,
"issued_at": string | null,
"issued_by": string | null,
"kind": string,
"org_id": string,
"project_id": string | null,
"recipient_id": string,
"recipient_type": string,
"seq": number,
"source": string,
"status": string,
"subject": string
            }
                          SetofOptions: {
        from: "*"
        to: "letters"
        isOneToOne: true
        isSetofReturn: false
      } },
"issue_material":
{ Args: { "p_request": string }; Returns: {
              "contractor_id": string,
"created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"id": string,
"location": string | null,
"material_id": string,
"needed_by": string | null,
"org_id": string,
"project_id": string,
"purpose": string | null,
"quantity": number,
"seq": number,
"status": Database["public"]['Enums']["request_status"],
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "material_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"letter_number":
{ Args: { "p_created": string,"p_seq": number }; Returns: string
                           },
"letter_visible":
{ Args: { "p_recipient": string,"p_type": string }; Returns: boolean
                           },
"log_activity":
{ Args: { "p_kind": string,"p_message": string,"p_org": string,"p_project": string }; Returns: undefined
                           },
"mark_crew_attendance":
{ Args: { "p_date": string,"p_employee": string,"p_note"?: string,"p_present": boolean }; Returns: string
                           },
"mark_delivery_paid":
{ Args: { "p_delivery": string,"p_ref": string }; Returns: {
              "accepted_qty": number | null,
"created_at": string,
"created_by": string | null,
"delivered_at": string,
"id": string,
"inspected_at": string | null,
"inspected_by": string | null,
"inspection_note": string | null,
"invoice_number": string | null,
"invoice_path": string | null,
"location": string | null,
"material_id": string,
"org_id": string,
"paid_at": string | null,
"payment_ref": string | null,
"photo_paths": (string)[],
"po_id": string | null,
"project_id": string,
"quantity": number,
"seq": number,
"status": Database["public"]['Enums']["delivery_status"],
"unit_cost": number | null,
"vehicle_number": string | null,
"vendor_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "deliveries"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_payment_paid":
{ Args: { "p_order_id": string,"p_payment_id": string }; Returns: {
              "buyer_id": string,
"confirmed_at": string | null,
"created_at": string,
"id": string,
"notes": string | null,
"org_id": string,
"plot_id": string,
"status": Database["public"]['Enums']["booking_status"],
"token_amount": number,
"total_amount": number
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"my_contractor_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_crew_contractor":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_employee_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_vendor_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify_project_buyers":
{ Args: { "p_body": string,"p_link": string,"p_project": string,"p_title": string }; Returns: undefined
                           },
"notify_user":
{ Args: { "p_body": string,"p_link": string,"p_title": string,"p_user": string }; Returns: undefined
                           },
"org_by_invite":
{ Args: { "p_code": string }; Returns: {
              "id": string,"name": string
            }[]
                           },
"pgp_armor_headers":
{ Args: { "": string }; Returns: Record<string, unknown>[]
                           },
"po_number":
{ Args: { "p_created": string,"p_seq": number }; Returns: string
                           },
"project_is_public":
{ Args: { "p_project": string }; Returns: boolean
                           },
"record_opening_stock":
{ Args: { "p_material": string,"p_note"?: string,"p_project": string,"p_qty": number }; Returns: undefined
                           },
"record_site_usage":
{ Args: { "p_consumed": number,"p_contractor": string,"p_material": string,"p_note"?: string,"p_project": string,"p_wastage": number }; Returns: undefined
                           },
"release_expired_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"request_leave":
{ Args: { "p_from": string,"p_kind": string,"p_reason"?: string,"p_to": string }; Returns: {
              "created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"decision_note": string | null,
"employee_id": string,
"from_date": string,
"id": string,
"kind": string,
"org_id": string,
"reason": string | null,
"status": string,
"to_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "leave_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"respond_to_quote":
{ Args: { "p_approve": boolean,"p_request": string }; Returns: {
              "booking_id": string,
"buyer_approved_at": string | null,
"buyer_id": string,
"contractor_id": string | null,
"created_at": string,
"deadline": string | null,
"id": string,
"org_id": string,
"quoted_cost": number | null,
"requirement": string,
"seq": number,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "modification_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"review_employee_profile":
{ Args: { "p_employee": string,"p_note"?: string,"p_status": string }; Returns: {
              "address": string | null,
"bank_ifsc": string | null,
"bank_last4": string | null,
"blood_group": string | null,
"city": string | null,
"date_of_birth": string | null,
"emergency_name": string | null,
"emergency_phone": string | null,
"emergency_relation": string | null,
"employee_id": string,
"experience_years": number | null,
"home_state": string | null,
"id_last4": string | null,
"id_type": string | null,
"languages": (string)[],
"org_id": string,
"photo_path": string | null,
"review_note": string | null,
"safety_trained": boolean,
"safety_training_date": string | null,
"skills": (string)[],
"status": string,
"submitted_at": string | null,
"trade": string | null,
"updated_at": string,
"upi_id": string | null,
"verified_at": string | null,
"verified_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "employee_profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"review_kyc":
{ Args: { "p_approve": boolean,"p_note"?: string,"p_user": string }; Returns: {
              "address": string | null,
"city": string | null,
"created_at": string,
"date_of_birth": string | null,
"email": string | null,
"full_name": string | null,
"id": string,
"id_last4": string | null,
"id_type": string | null,
"kyc_doc_path": string | null,
"kyc_note": string | null,
"kyc_status": string,
"kyc_submitted_at": string | null,
"kyc_verified_at": string | null,
"occupation": string | null,
"phone": string | null,
"pincode": string | null,
"preferred_language": string | null,
"role": Database["public"]['Enums']["app_role"]
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"save_my_company_profile":
{ Args: { "p": Json,"p_submit"?: boolean }; Returns: string
                           },
"save_my_employee_profile":
{ Args: { "p": Json,"p_submit"?: boolean }; Returns: {
              "address": string | null,
"bank_ifsc": string | null,
"bank_last4": string | null,
"blood_group": string | null,
"city": string | null,
"date_of_birth": string | null,
"emergency_name": string | null,
"emergency_phone": string | null,
"emergency_relation": string | null,
"employee_id": string,
"experience_years": number | null,
"home_state": string | null,
"id_last4": string | null,
"id_type": string | null,
"languages": (string)[],
"org_id": string,
"photo_path": string | null,
"review_note": string | null,
"safety_trained": boolean,
"safety_training_date": string | null,
"skills": (string)[],
"status": string,
"submitted_at": string | null,
"trade": string | null,
"updated_at": string,
"upi_id": string | null,
"verified_at": string | null,
"verified_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "employee_profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_docs":
{ Args: { "p_limit"?: number,"p_project": string,"p_query": string }; Returns: {
              "content": string,"document_id": string,"heading": string,"id": number,"rank": number,"title": string,"visibility": Database["public"]['Enums']["doc_visibility"]
            }[]
                           },
"seed_ai_demo":
{ Args: { "p_org": string }; Returns: string
                           },
"seed_flats_demo":
{ Args: { "p_org": string }; Returns: string
                           },
"seed_workspaces_demo":
{ Args: { "p_org": string }; Returns: string
                           },
"share_ai_insight":
{ Args: { "p_insight": string }; Returns: {
              "body": string | null,
"created_at": string,
"created_by": string | null,
"data": NonNullable<Json>,
"decided_at": string | null,
"decided_by": string | null,
"id": string,
"kind": string,
"org_id": string,
"project_id": string | null,
"scope": string,
"severity": string,
"shared_with_contractor": boolean,
"source": string,
"status": string,
"subject_id": string | null,
"suggestion": Json | null,
"title": string
            }
                          SetofOptions: {
        from: "*"
        to: "ai_insights"
        isOneToOne: true
        isSetofReturn: false
      } },
"start_booking":
{ Args: { "p_plot_id": string }; Returns: {
              "buyer_id": string,
"confirmed_at": string | null,
"created_at": string,
"id": string,
"notes": string | null,
"org_id": string,
"plot_id": string,
"status": Database["public"]['Enums']["booking_status"],
"token_amount": number,
"total_amount": number
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_contractor_bill":
{ Args: { "p": Json }; Returns: {
              "contractor_id": string,
"created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_note": string | null,
"gross_amount": number,
"gst_pct": number,
"id": string,
"invoice_number": string | null,
"net_payable": number | null,
"note": string | null,
"org_id": string,
"paid_at": string | null,
"payment_ref": string | null,
"period_from": string | null,
"period_to": string | null,
"progress_claimed": number | null,
"project_id": string,
"retention_pct": number,
"seq": number,
"status": string,
"tds_pct": number,
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "contractor_bills"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_enquiry":
{ Args: { "p_email"?: string,"p_message"?: string,"p_name": string,"p_phone": string,"p_plot"?: string,"p_project": string,"p_visit_at"?: string }; Returns: string
                           },
"submit_my_kyc":
{ Args: { "p_doc_path": string,"p_id_number": string,"p_id_type": string }; Returns: {
              "address": string | null,
"city": string | null,
"created_at": string,
"date_of_birth": string | null,
"email": string | null,
"full_name": string | null,
"id": string,
"id_last4": string | null,
"id_type": string | null,
"kyc_doc_path": string | null,
"kyc_note": string | null,
"kyc_status": string,
"kyc_submitted_at": string | null,
"kyc_verified_at": string | null,
"occupation": string | null,
"phone": string | null,
"pincode": string | null,
"preferred_language": string | null,
"role": Database["public"]['Enums']["app_role"]
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"tower_percent":
{ Args: { "p_stages": Json }; Returns: number
                           },
"track_plot_event":
{ Args: { "p_kind": string,"p_plot": string }; Returns: undefined
                           },
"update_crew_task":
{ Args: { "p_note"?: string,"p_status": string,"p_task": string }; Returns: {
              "contractor_id": string | null,
"created_at": string,
"created_by": string | null,
"details": string | null,
"done_at": string | null,
"done_note": string | null,
"due_date": string | null,
"employee_id": string | null,
"id": string,
"org_id": string,
"priority": string,
"project_id": string | null,
"status": string,
"title": string,
"work_package_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "crew_tasks"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_tower_progress":
{ Args: { "p_body"?: string,"p_slabs": number,"p_stages": Json,"p_title": string,"p_tower": string }; Returns: {
              "body": string | null,
"created_at": string,
"created_by": string | null,
"id": string,
"milestone_id": string | null,
"milestone_progress": number | null,
"org_id": string,
"photo_paths": (string)[],
"progress_percent": number | null,
"project_id": string,
"snapshot": Json | null,
"title": string,
"tower_id": string | null,
"tower_snapshot": Json | null
            }
                          SetofOptions: {
        from: "*"
        to: "construction_updates"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_work_progress":
{ Args: { "p_note"?: string,"p_package": string,"p_progress": number }; Returns: {
              "contract_value": number,
"contractor_id": string,
"due_date": string | null,
"id": string,
"milestone_id": string | null,
"org_id": string,
"planned_qty": number | null,
"progress": number,
"project_id": string,
"qty_unit": string | null,
"scope": string | null,
"start_date": string | null,
"status": string,
"title": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "work_packages"
        isOneToOne: true
        isSetofReturn: false
      } },
"vendor_dispatch_po":
{ Args: { "p_note"?: string,"p_po": string,"p_vehicle": string }; Returns: {
              "accepted_at": string | null,
"created_at": string,
"created_by": string | null,
"delivery_location": string | null,
"dispatched_at": string | null,
"gst_pct": number,
"id": string,
"items": NonNullable<Json>,
"material_request_id": string | null,
"org_id": string,
"project_id": string,
"promised_date": string | null,
"required_by": string | null,
"seq": number,
"status": string,
"subtotal": number,
"terms": string | null,
"total": number | null,
"updated_at": string,
"vehicle_number": string | null,
"vendor_id": string,
"vendor_note": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "purchase_orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"vendor_respond_po":
{ Args: { "p_accept": boolean,"p_note"?: string,"p_po": string,"p_promised"?: string }; Returns: {
              "accepted_at": string | null,
"created_at": string,
"created_by": string | null,
"delivery_location": string | null,
"dispatched_at": string | null,
"gst_pct": number,
"id": string,
"items": NonNullable<Json>,
"material_request_id": string | null,
"org_id": string,
"project_id": string,
"promised_date": string | null,
"required_by": string | null,
"seq": number,
"status": string,
"subtotal": number,
"terms": string | null,
"total": number | null,
"updated_at": string,
"vehicle_number": string | null,
"vendor_id": string,
"vendor_note": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "purchase_orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"verify_organization":
{ Args: { "p_org": string,"p_verified": boolean }; Returns: {
              "address": string | null,
"created_at": string,
"email": string | null,
"gst_number": string | null,
"id": string,
"invite_code": string | null,
"is_demo": boolean,
"is_verified": boolean,
"name": string,
"payment_plan": NonNullable<Json>,
"phone": string | null,
"signatory_name": string | null,
"signatory_title": string | null,
"token_percent": number,
"website": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "organizations"
        isOneToOne: true
        isSetofReturn: false
      } },
"wp_is_mine":
{ Args: { "p_wp": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "buyer"|"seller"|"admin"|"contractor"|"vendor"|"employee","booking_status": "pending_payment"|"confirmed"|"registered"|"handed_over"|"cancelled"|"refund_due","delivery_status": "pending_inspection"|"accepted"|"partially_accepted"|"rejected","doc_visibility": "public"|"buyer"|"internal","facing": "north"|"south"|"east"|"west"|"north_east"|"north_west"|"south_east"|"south_west","installment_status": "due"|"paid"|"overdue","lead_stage": "new"|"contacted"|"site_visit"|"negotiation"|"won"|"lost","org_role": "owner"|"manager"|"staff","payment_status": "created"|"paid"|"failed"|"refunded","plot_status": "available"|"held"|"booked"|"sold"|"blocked","project_status": "upcoming"|"ongoing"|"completed","request_status": "requested"|"approved"|"issued"|"rejected","stock_move": "opening"|"received"|"rejected"|"issued"|"consumed"|"wastage"|"returned","trade": "civil"|"roads"|"electrical"|"plumbing"|"landscaping"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["buyer", "seller", "admin", "contractor", "vendor", "employee"],"booking_status": ["pending_payment", "confirmed", "registered", "handed_over", "cancelled", "refund_due"],"delivery_status": ["pending_inspection", "accepted", "partially_accepted", "rejected"],"doc_visibility": ["public", "buyer", "internal"],"facing": ["north", "south", "east", "west", "north_east", "north_west", "south_east", "south_west"],"installment_status": ["due", "paid", "overdue"],"lead_stage": ["new", "contacted", "site_visit", "negotiation", "won", "lost"],"org_role": ["owner", "manager", "staff"],"payment_status": ["created", "paid", "failed", "refunded"],"plot_status": ["available", "held", "booked", "sold", "blocked"],"project_status": ["upcoming", "ongoing", "completed"],"request_status": ["requested", "approved", "issued", "rejected"],"stock_move": ["opening", "received", "rejected", "issued", "consumed", "wastage", "returned"],"trade": ["civil", "roads", "electrical", "plumbing", "landscaping", "other"]
          }
        }
} as const
