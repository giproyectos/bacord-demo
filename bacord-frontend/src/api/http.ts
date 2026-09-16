// Demo mode — this http client is a stub. All API calls are intercepted by mock files.
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
})

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
