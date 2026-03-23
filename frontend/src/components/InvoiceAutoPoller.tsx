import { useEffect } from 'react'
import { startPolling, stopPolling } from '../services/PollingService'

export default function InvoiceAutoPoller() {
  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [])
  return null
}
