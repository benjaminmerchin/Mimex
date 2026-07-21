import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { DashboardPage } from './pages/dashboard.tsx'
import { LoginPage } from './pages/login.tsx'
import { RecordPage } from './pages/record.tsx'
import { BillingPage } from './pages/billing.tsx'
import { TeachPage } from './pages/teach.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/teach" element={<TeachPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
