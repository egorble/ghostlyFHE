import { useParams } from 'react-router-dom'
import { InvoiceDetail } from '../components/invoice/InvoiceDetail.tsx'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <p className="text-muted-foreground text-center py-10">Invalid invoice ID</p>
  }

  return (
    <div className="space-y-3">
      <InvoiceDetail invoiceId={id} />
    </div>
  )
}
