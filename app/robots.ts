import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = (SITE_URL || 'https://storific.app').replace(/\/+$/, '')

  return {
    rules: {
      userAgent: '*',
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
