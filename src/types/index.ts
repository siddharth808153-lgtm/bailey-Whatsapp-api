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

export interface ChatbotFlow {
  id: number
  user_id: number
  instance_id?: number
  name: string
  is_active: boolean
  trigger_type: 'keyword' | 'any_message' | 'first_message'
  business_hours_only: boolean
  business_hours_start?: string
  business_hours_end?: string
  away_message?: string
  use_ai: boolean
  ai_provider?: 'openai' | 'gemini' | 'anthropic'
  ai_system_prompt?: string
  agent_id?: number
  ai_agent?: AiAgent
  whatsapp_instance?: WhatsappInstance
  chatbot_rules?: ChatbotRule[]
  chatbot_rules_count?: number
  active_conversations_count?: number
  recent_conversations?: ChatbotConversation[]
  created_at: string
  updated_at?: string
}

export interface ChatbotRule {
  id: number
  flow_id: number
  trigger_keyword?: string
  match_type: 'exact' | 'contains' | 'starts_with' | 'regex'
  is_default: boolean
  response_type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'flow_redirect'
  response_body?: string
  response_media_url?: string
  next_flow_id?: number
  simulate_typing: boolean
  typing_delay_seconds: number
  priority: number
  created_at?: string
}

export interface ChatbotConversation {
  id: number
  instance_id: number
  contact_phone: string
  flow_id: number
  current_rule_id?: number
  state: { history?: { role: string; content: string }[] }
  last_message_at?: string
  is_active: boolean
  chatbot_flow?: ChatbotFlow
  created_at?: string
}

export interface DripSequence {
  id: number
  name: string
  description?: string
  status: 'active' | 'paused' | 'archived'
  instance_id: number
  whatsapp_instance?: WhatsappInstance
  drip_steps?: DripStep[]
  steps_count?: number
  active_enrollments_count?: number
  completed_enrollments_count?: number
  created_at: string
}

export interface DripStep {
  id: number
  sequence_id: number
  step_number: number
  name?: string
  message_type: 'text' | 'image' | 'video' | 'document'
  message_body: string
  media_url?: string
  wait_days: number
  wait_hours: number
  send_time?: string
}

export interface DripEnrollment {
  id: number
  sequence_id: number
  contact_id: number
  instance_id: number
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'unsubscribed'
  enrolled_at: string
  next_message_at?: string
  completed_at?: string
  contact?: Contact
  current_step_details?: DripStep
  days_in_sequence?: number
}

export interface WarmupStatus {
  id: number
  name: string
  phone_number?: string
  is_warmed: boolean
  warmup_started_at?: string
  warmup_completed_at?: string
  warmup_day: number
  today_target: number
  today_sent: number
  warmup_progress: number
  can_start_warmup: boolean
  status: WhatsappInstance['status']
}

export interface WarmupDay {
  day: number
  target: number
  sent: number
  completed: boolean
  active: boolean
}

export interface MediaFile {
  id: number
  user_id: number
  name: string
  path: string
  url: string
  mime_type: string
  size: number
  created_at: string
}

export interface AiAgent {
  id: number
  user_id: number
  name: string
  system_prompt?: string
  temperature: number
  max_tokens: number
  is_active: boolean
  knowledge_docs_count?: number
  conversations_count?: number
  chatbot_flows_count?: number
  knowledge_docs?: AiKnowledgeDoc[]
  created_at: string
  updated_at?: string
}

export interface AiKnowledgeDoc {
  id: number
  name: string
  mime_type?: string
  size: number
  content_preview?: string
  created_at: string
}

export interface AiConversation {
  id: number
  contact_phone?: string
  message_count?: number
  last_message?: string
  last_message_role?: string
  messages?: { role: string; content: string; timestamp?: string }[]
  updated_at: string
  created_at: string
}

export interface AiConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | null
  has_key: boolean
  masked_key: string | null
}
