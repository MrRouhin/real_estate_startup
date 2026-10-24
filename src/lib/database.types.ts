
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_log": {
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
                    "body": string | null,"created_at": string,"created_by": string | null,"id": string,"milestone_id": string | null,"milestone_progress": number | null,"org_id": string,"photo_paths": (string)[],"progress_percent": number | null,"project_id": string,"snapshot": Json | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"milestone_id"?: string | null,"milestone_progress"?: number | null,"org_id": string,"photo_paths"?: (string)[],"progress_percent"?: number | null,"project_id": string,"snapshot"?: Json | null,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"milestone_id"?: string | null,"milestone_progress"?: number | null,"org_id"?: string,"photo_paths"?: (string)[],"progress_percent"?: number | null,"project_id"?: string,"snapshot"?: Json | null,"title"?: string
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
    }
                  ]
                },"contractors": {
                  Row: {
                    "address": string | null,"company_name": string,"contact_person": string | null,"contract_type": string,"created_at": string,"email": string | null,"gst_number": string | null,"id": string,"org_id": string,"phone": string | null,"rating": number | null,"status": string,"trade": Database["public"]['Enums']["trade"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"company_name": string,"contact_person"?: string | null,"contract_type"?: string,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id": string,"phone"?: string | null,"rating"?: number | null,"status"?: string,"trade"?: Database["public"]['Enums']["trade"],"user_id"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"company_name"?: string,"contact_person"?: string | null,"contract_type"?: string,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id"?: string,"phone"?: string | null,"rating"?: number | null,"status"?: string,"trade"?: Database["public"]['Enums']["trade"],"user_id"?: string | null
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
                },"deliveries": {
                  Row: {
                    "accepted_qty": number | null,"created_at": string,"created_by": string | null,"delivered_at": string,"id": string,"inspected_at": string | null,"inspected_by": string | null,"inspection_note": string | null,"invoice_number": string | null,"invoice_path": string | null,"location": string | null,"material_id": string,"org_id": string,"photo_paths": (string)[],"project_id": string,"quantity": number,"seq": number,"status": Database["public"]['Enums']["delivery_status"],"unit_cost": number | null,"vehicle_number": string | null,"vendor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_qty"?: number | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_note"?: string | null,"invoice_number"?: string | null,"invoice_path"?: string | null,"location"?: string | null,"material_id": string,"org_id": string,"photo_paths"?: (string)[],"project_id": string,"quantity": number,"seq"?: never,"status"?: Database["public"]['Enums']["delivery_status"],"unit_cost"?: number | null,"vehicle_number"?: string | null,"vendor_id": string
                  }
                  Update: {
                    "accepted_qty"?: number | null,"created_at"?: string,"created_by"?: string | null,"delivered_at"?: string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_note"?: string | null,"invoice_number"?: string | null,"invoice_path"?: string | null,"location"?: string | null,"material_id"?: string,"org_id"?: string,"photo_paths"?: (string)[],"project_id"?: string,"quantity"?: number,"seq"?: never,"status"?: Database["public"]['Enums']["delivery_status"],"unit_cost"?: number | null,"vehicle_number"?: string | null,"vendor_id"?: string
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
                },"market_factors": {
                  Row: {
                    "expected_year": number | null,"id": string,"impact_pct": number,"kind": string,"label": string,"org_id": string,"project_id": string,"sort_order": number,"source": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expected_year"?: number | null,"id"?: string,"impact_pct"?: number,"kind"?: string,"label": string,"org_id": string,"project_id": string,"sort_order"?: number,"source"?: string | null,"status"?: string
                  }
                  Update: {
                    "expected_year"?: number | null,"id"?: string,"impact_pct"?: number,"kind"?: string,"label"?: string,"org_id"?: string,"project_id"?: string,"sort_order"?: number,"source"?: string | null,"status"?: string
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
                    "created_at": string,"email": string | null,"gst_number": string | null,"id": string,"is_verified": boolean,"name": string,"payment_plan": NonNullable<Json>,"phone": string | null,"token_percent": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"is_verified"?: boolean,"name": string,"payment_plan"?: NonNullable<Json>,"phone"?: string | null,"token_percent"?: number
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"is_verified"?: boolean,"name"?: string,"payment_plan"?: NonNullable<Json>,"phone"?: string | null,"token_percent"?: number
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
                    "area_sqft": number,"created_at": string,"dimensions": string | null,"facing": Database["public"]['Enums']["facing"] | null,"held_by": string | null,"held_until": string | null,"id": string,"is_corner": boolean,"org_id": string,"plot_number": string,"price": number,"project_id": string,"shape_path": string | null,"status": Database["public"]['Enums']["plot_status"],"svg_shape_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_sqft": number,"created_at"?: string,"dimensions"?: string | null,"facing"?: Database["public"]['Enums']["facing"] | null,"held_by"?: string | null,"held_until"?: string | null,"id"?: string,"is_corner"?: boolean,"org_id": string,"plot_number": string,"price": number,"project_id": string,"shape_path"?: string | null,"status"?: Database["public"]['Enums']["plot_status"],"svg_shape_id"?: string | null
                  }
                  Update: {
                    "area_sqft"?: number,"created_at"?: string,"dimensions"?: string | null,"facing"?: Database["public"]['Enums']["facing"] | null,"held_by"?: string | null,"held_until"?: string | null,"id"?: string,"is_corner"?: boolean,"org_id"?: string,"plot_number"?: string,"price"?: number,"project_id"?: string,"shape_path"?: string | null,"status"?: Database["public"]['Enums']["plot_status"],"svg_shape_id"?: string | null
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
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"kyc_status": string,"phone": string | null,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"kyc_status"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"kyc_status"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "address": string | null,"ai_summary": Json | null,"city": string | null,"cover_image_path": string | null,"created_at": string,"description": string | null,"geofence_m": number,"id": string,"is_published": boolean,"layout": Json | null,"layout_svg_path": string | null,"layout_viewbox": string | null,"name": string,"org_id": string,"progress_percent": number,"rera_number": string | null,"site_lat": number | null,"site_lng": number | null,"slug": string,"status": Database["public"]['Enums']["project_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"ai_summary"?: Json | null,"city"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"geofence_m"?: number,"id"?: string,"is_published"?: boolean,"layout"?: Json | null,"layout_svg_path"?: string | null,"layout_viewbox"?: string | null,"name": string,"org_id": string,"progress_percent"?: number,"rera_number"?: string | null,"site_lat"?: number | null,"site_lng"?: number | null,"slug": string,"status"?: Database["public"]['Enums']["project_status"]
                  }
                  Update: {
                    "address"?: string | null,"ai_summary"?: Json | null,"city"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"geofence_m"?: number,"id"?: string,"is_published"?: boolean,"layout"?: Json | null,"layout_svg_path"?: string | null,"layout_viewbox"?: string | null,"name"?: string,"org_id"?: string,"progress_percent"?: number,"rera_number"?: string | null,"site_lat"?: number | null,"site_lng"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["project_status"]
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
                },"vendors": {
                  Row: {
                    "address": string | null,"categories": (string)[],"company_name": string,"contact_person": string | null,"created_at": string,"email": string | null,"gst_number": string | null,"id": string,"org_id": string,"phone": string | null,"rating": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"categories"?: (string)[],"company_name": string,"contact_person"?: string | null,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id": string,"phone"?: string | null,"rating"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"categories"?: (string)[],"company_name"?: string,"contact_person"?: string | null,"created_at"?: string,"email"?: string | null,"gst_number"?: string | null,"id"?: string,"org_id"?: string,"phone"?: string | null,"rating"?: number | null,"user_id"?: string | null
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
"photo_paths": (string)[],
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
"dearmor":
{ Args: { "": string }; Returns: string
                           },
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
"held_by": string | null,
"held_until": string | null,
"id": string,
"is_corner": boolean,
"org_id": string,
"plot_number": string,
"price": number,
"project_id": string,
"shape_path": string | null,
"status": Database["public"]['Enums']["plot_status"],
"svg_shape_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "plots"
        isOneToOne: true
        isSetofReturn: false
      } },
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
"log_activity":
{ Args: { "p_kind": string,"p_message": string,"p_org": string,"p_project": string }; Returns: undefined
                           },
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
"pgp_armor_headers":
{ Args: { "": string }; Returns: Record<string, unknown>[]
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
"search_docs":
{ Args: { "p_limit"?: number,"p_project": string,"p_query": string }; Returns: {
              "content": string,"document_id": string,"heading": string,"id": number,"rank": number,"title": string,"visibility": Database["public"]['Enums']["doc_visibility"]
            }[]
                           },
"seed_ai_demo":
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
"submit_enquiry":
{ Args: { "p_email"?: string,"p_message"?: string,"p_name": string,"p_phone": string,"p_plot"?: string,"p_project": string,"p_visit_at"?: string }; Returns: string
                           },
"track_plot_event":
{ Args: { "p_kind": string,"p_plot": string }; Returns: undefined
                           },
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
