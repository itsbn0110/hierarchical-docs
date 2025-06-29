import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8086',
  withCredentials: true,
});

// TODO: Thêm interceptor để tự động refresh token khi hết hạn
// api.interceptors.response.use(...)

export default api;
