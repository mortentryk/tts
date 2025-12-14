import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SITE_URL } from '@/lib/env'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#e94560',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL || 'https://storific.app'),
  title: {
    default: 'Storific Stories',
    template: '%s | Storific Stories',
  },
  description: 'Interaktive historier med stemme-fortælling til børn',
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Storific Stories',
    description: 'Interaktive historier med stemme-fortælling til børn',
    url: '/',
    siteName: 'Storific Stories',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Storific Stories',
    description: 'Interaktive historier med stemme-fortælling til børn',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Storific',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
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
        {children}
        <Analytics />
      </body>
    </html>
  )
}
