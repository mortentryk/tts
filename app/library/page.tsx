import type { Metadata } from 'next';
import LibraryPageClient from './page.client';

export const metadata: Metadata = {
  title: 'Mit bibliotek',
  description: 'Se dine købte eller tilgængelige historier og abonnementer.',
  alternates: {
    canonical: '/library',
  },
  openGraph: {
    title: 'Mit bibliotek',
    description: 'Se dine købte eller tilgængelige historier og abonnementer.',
    url: '/library',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mit bibliotek',
    description: 'Se dine købte eller tilgængelige historier og abonnementer.',
  },
};

export default function LibraryPage() {
  return <LibraryPageClient />;
}

