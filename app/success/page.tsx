import type { Metadata } from 'next'
import SuccessPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Køb gennemført',
  description: 'Tak for dit køb. Vi bekræfter din betaling og giver adgang.',
  alternates: {
    canonical: '/success',
  },
  openGraph: {
    title: 'Køb gennemført',
    description: 'Tak for dit køb. Vi bekræfter din betaling og giver adgang.',
    url: '/success',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Køb gennemført',
    description: 'Tak for dit køb. Vi bekræfter din betaling og giver adgang.',
  },
}

export default function SuccessPage() {
  return <SuccessPageClient />
}
