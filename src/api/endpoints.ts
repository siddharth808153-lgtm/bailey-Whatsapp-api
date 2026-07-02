export const AUTH = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
}

export const INSTANCES = {
  LIST: '/instances',
  CREATE: '/instances',
  DETAIL: (id: number) => `/instances/${id}`,
  CONNECT: (id: number) => `/instances/${id}/connect`,
  DISCONNECT: (id: number) => `/instances/${id}/disconnect`,
  LOGOUT: (id: number) => `/instances/${id}/logout`,
  DELETE: (id: number) => `/instances/${id}`,
}

export const CONTACTS = {
  LIST: '/contacts',
  CREATE: '/contacts',
  UPDATE: (id: number) => `/contacts/${id}`,
  DELETE: (id: number) => `/contacts/${id}`,
  DETAIL: (id: number) => `/contacts/${id}`,
  OPT_OUT: (id: number) => `/contacts/${id}/opt-out`,
  OPT_IN: (id: number) => `/contacts/${id}/opt-in`,
  BULK_DELETE: '/contacts/bulk-delete',
  BULK_OPT_OUT: '/contacts/bulk-opt-out',
  IMPORT: '/contacts/import',
  PREVIEW_CSV: '/contacts/preview-csv',
  EXPORT: '/contacts/export',
  CHECK_NUMBERS: '/contacts/check-numbers',
  SEND_MESSAGE: '/contacts/send-message',
}

export const CONTACT_LISTS = {
  LIST: '/lists',
  CREATE: '/lists',
  UPDATE: (id: number) => `/lists/${id}`,
  DELETE: (id: number) => `/lists/${id}`,
  DETAIL: (id: number) => `/lists/${id}`,
  ADD_CONTACTS: (id: number) => `/lists/${id}/contacts/add`,
  REMOVE_CONTACTS: (id: number) => `/lists/${id}/contacts/remove`,
  IMPORT: (id: number) => `/lists/${id}/import`,
}

export const TAGS = {
  LIST: '/tags',
  BULK_TAG: '/tags/bulk-tag',
}

export const CAMPAIGNS = {
  LIST: '/campaigns',
  CREATE: '/campaigns',
  DETAIL: (id: number) => `/campaigns/${id}`,
  DELETE: (id: number) => `/campaigns/${id}`,
  PAUSE: (id: number) => `/campaigns/${id}/pause`,
  RESUME: (id: number) => `/campaigns/${id}/resume`,
  CANCEL: (id: number) => `/campaigns/${id}/cancel`,
  REPORT: (id: number) => `/campaigns/${id}/report`,
  DUPLICATE: (id: number) => `/campaigns/${id}/duplicate`,
}

export const TEMPLATES = {
  LIST: '/templates',
  CREATE: '/templates',
  DETAIL: (id: number) => `/templates/${id}`,
  UPDATE: (id: number) => `/templates/${id}`,
  DELETE: (id: number) => `/templates/${id}`,
  USE: (id: number) => `/templates/${id}/use`,
}

export const CHATBOT = {
  FLOWS: '/chatbot/flows',
  FLOW_DETAIL: (id: number) => `/chatbot/flows/${id}`,
  FLOW_TOGGLE: (id: number) => `/chatbot/flows/${id}/toggle`,
  FLOW_CLEAR_CONVERSATIONS: (id: number) => `/chatbot/flows/${id}/clear-conversations`,
  FLOW_CONVERSATIONS: (id: number) => `/chatbot/flows/${id}/conversations`,
  RULES: (flowId: number) => `/chatbot/flows/${flowId}/rules`,
  RULE_DETAIL: (flowId: number, ruleId: number) => `/chatbot/flows/${flowId}/rules/${ruleId}`,
  RULES_REORDER: (flowId: number) => `/chatbot/flows/${flowId}/rules/reorder`,
}

export const DRIP = {
  SEQUENCES: '/drip/sequences',
  SEQUENCE_DETAIL: (id: number) => `/drip/sequences/${id}`,
  SEQUENCE_CREATE: '/drip/sequences',
  SEQUENCE_UPDATE: (id: number) => `/drip/sequences/${id}`,
  SEQUENCE_DELETE: (id: number) => `/drip/sequences/${id}`,
  SEQUENCE_DUPLICATE: (id: number) => `/drip/sequences/${id}/duplicate`,
  STEPS: (seqId: number) => `/drip/sequences/${seqId}/steps`,
  STEP_CREATE: (seqId: number) => `/drip/sequences/${seqId}/steps`,
  STEP_UPDATE: (seqId: number, id: number) => `/drip/sequences/${seqId}/steps/${id}`,
  STEP_DELETE: (seqId: number, id: number) => `/drip/sequences/${seqId}/steps/${id}`,
  STEPS_REORDER: (seqId: number) => `/drip/sequences/${seqId}/steps/reorder`,
  ENROLLMENTS: (seqId: number) => `/drip/sequences/${seqId}/enrollments`,
  ENROLL: (seqId: number) => `/drip/sequences/${seqId}/enroll`,
  ENROLL_LIST: (seqId: number) => `/drip/sequences/${seqId}/enroll-list`,
  BULK_ACTION: (seqId: number) => `/drip/sequences/${seqId}/bulk-action`,
}

export const WARMUP = {
  LIST: '/warmup',
  START: '/warmup/start',
  STOP: (id: number) => `/warmup/${id}/stop`,
  STATUS: (id: number) => `/warmup/${id}/status`,
  HISTORY: (id: number) => `/warmup/${id}/history`,
}

export const MEDIA = {
  LIST: '/media',
  UPLOAD: '/media',
  DELETE: (id: number) => `/media/${id}`,
}


