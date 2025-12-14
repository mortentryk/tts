import type { Metadata } from 'next'
import PurchasePageClient from './page.client'

export async function generateMetadata(
  { params }: { params: Promise<{ storyId: string }> }
): Promise<Metadata> {
  const { storyId } = await params;
  const canonicalPath = storyId ? `/purchase/${encodeURIComponent(storyId)}` : '/purchase'

  return {
    title: 'Køb historie',
    description: 'Gennemfør køb af din udvalgte historie.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Køb historie',
      description: 'Gennemfør køb af din udvalgte historie.',
      url: canonicalPath,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Køb historie',
      description: 'Gennemfør køb af din udvalgte historie.',
    },
  }
}

export default function PurchasePage() {
  return <PurchasePageClient />
}
