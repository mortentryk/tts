import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CapacitorInitializer from './components/CapacitorInitializer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Interaktive Eventyr',
  description: 'Magiske historier med stemme-fortælling, interaktive valg og fantastiske visuelle effekter',
  manifest: '/manifest.json',
  themeColor: '#1a1a2e',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Eventyr',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body className={inter.className}>
        <CapacitorInitializer />
        {children}
      </body>
    </html>
  )
}
