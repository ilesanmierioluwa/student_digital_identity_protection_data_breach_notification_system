const axios = require('axios');
const logger = require('../utils/logger');

const brevoApi = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'api-key': process.env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

brevoApi.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error('Brevo API error', {
      status: err.response?.status,
      message: err.response?.data?.message || err.message,
    });
    return Promise.reject(err);
  }
);

module.exports = brevoApi;
