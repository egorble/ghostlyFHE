import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { CreateInvoicePage } from './pages/CreateInvoicePage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { AuditCenterPage } from './pages/AuditCenterPage'
import { AuditVerifyPage } from './pages/AuditVerifyPage'
import SplashScreen from './components/logo/SplashScreen'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <SplashScreen show={showSplash} onComplete={() => {}} />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/create" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/audit" element={<AuditCenterPage />} />
            <Route path="/audit/verify" element={<AuditVerifyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}
