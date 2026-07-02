import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import axios from 'axios'

// Configure Axios defaults
axios.defaults.baseURL = '/api'

// Request Interceptor to attach Sanctum Token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('wasp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Response Interceptor to handle unauthorized access
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirect loops if we are already on login
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('wasp_token')
        localStorage.removeItem('wasp_user')
        localStorage.removeItem('wasp_admin_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
