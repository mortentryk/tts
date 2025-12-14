import type { Metadata } from 'next';
import HomePageClient from './page.client';

export const metadata: Metadata = {
  title: 'Magiske lydhistorier for børn',
  description: 'Interaktive, oplæste historier med valg for børn og familier.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Magiske lydhistorier for børn',
    description: 'Interaktive, oplæste historier med valg for børn og familier.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Magiske lydhistorier for børn',
    description: 'Interaktive, oplæste historier med valg for børn og familier.',
  },
};

export default function Home() {
  return <HomePageClient />;
}
