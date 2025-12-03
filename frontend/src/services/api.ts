import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Your Python Backend URL
});

export default api;