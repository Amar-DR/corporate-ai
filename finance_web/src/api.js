import axios from 'axios'

const api = axios.create({
  baseURL: 'http://100.110.240.44:8001/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export const sendChat = (message) => api.post('/chat', { message })
export const getTransactions = (params) => api.get('/transactions/', { params })
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)
export const getSummary = (month) => api.get('/summary', { params: { month } })
export const getToday = () => api.get('/summary/today')
export const getHealthScore = (month) => api.get('/health-score', { params: { month } })
export const getPortfolioPrices = () => api.get('/portfolio/prices')
export const getCryptoPortfolio = () => api.get('/portfolio/crypto')
export const importExcel = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/import/excel', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default api
