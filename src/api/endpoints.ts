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
