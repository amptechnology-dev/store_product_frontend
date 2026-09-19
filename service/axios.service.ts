import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true
})

axiosInstance.interceptors.request.use(
  async function (config) {
    const token =
      localStorage.getItem("login-token") ||
      sessionStorage.getItem("login-token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  function (err) {
    return Promise.reject(err);
  }
);


export default axiosInstance