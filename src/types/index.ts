export interface Contact {
  id: number
  name: string
  phone: string
  email?: string
  custom1?: string
  custom2?: string
  custom3?: string
  tags: string[]
  is_opted_out: boolean
  is_invalid: boolean
  opted_out_at?: string
  last_messaged_at?: string
  lists?: ContactList[]
  created_at: string
}

export interface ContactList {
  id: number
  name: string
  description?: string
  contact_count: number
  created_at: string
}

export interface Tag {
  tag: string
  count: number
}

export interface ImportResult {
  imported: number
  skipped_duplicates: number
  skipped_invalid: number
  total_rows: number
  errors: { row: number; reason: string }[]
}

export interface CsvPreview {
  headers: string[]
  preview_rows: string[][]
  total_rows: number
  detected_columns: number
}

export interface User {
  id: number
  name: string
  email: string
  role: 'super_admin' | 'reseller' | 'user'
  plan_id?: number
  is_active: boolean
  created_at: string
}

export interface WhatsappInstance {
  id: number
  name: string
  phone_number?: string
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'banned' | 'logged_out'
  session_id: string
  webhook_url?: string
  is_active: boolean
  is_warmed: boolean
  daily_limit: number
  sent_today: number
  sent_this_month: number
  queue_size?: number
  connected_at?: string
  disconnected_at?: string
}

export interface Campaign {
  id: number
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  message_type: 'text' | 'image' | 'video' | 'document' | 'audio'
  message_body: string
  media_url?: string
  media_filename?: string
  footer?: string
  buttons?: { text: string }[]
  total_contacts: number
  sent_count: number
  delivered_count: number
  failed_count: number
  min_delay_seconds: number
  max_delay_seconds: number
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  whatsapp_instance?: WhatsappInstance
  contact_list?: ContactList
  created_at: string
}

export interface CampaignMessage {
  id: number
  campaign_id: number
  contact_id: number
  phone: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped'
  error_message?: string
  sent_at?: string
  delivered_at?: string
  contact?: Contact
}

export interface MessageTemplate {
  id: number
  name: string
  category: 'promotional' | 'transactional' | 'greeting' | 'follow_up' | 'other'
  message_type: 'text' | 'image' | 'video' | 'document' | 'audio'
  body: string
  media_url?: string
  media_filename?: string
  footer?: string
  buttons?: { text: string }[]
  created_at: string
}

export interface CampaignReport {
  campaign: Campaign
  summary: {
    total: number
    sent: number
    delivered: number
    failed: number
    skipped: number
    delivery_rate: number
    failure_rate: number
    duration_minutes: number
  }
  messages: CampaignMessage[]
  hourly_breakdown: { hour: string; sent: number; failed: number }[]
}
