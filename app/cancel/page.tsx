import type { Metadata } from 'next'
import CancelPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Betaling annulleret',
  description: 'Din betaling blev annulleret. Start forfra når du er klar.',
  alternates: {
    canonical: '/cancel',
  },
  openGraph: {
    title: 'Betaling annulleret',
    description: 'Din betaling blev annulleret. Start forfra når du er klar.',
    url: '/cancel',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Betaling annulleret',
    description: 'Din betaling blev annulleret. Start forfra når du er klar.',
  },
}

export default function CancelPage() {
  return <CancelPageClient />
}
