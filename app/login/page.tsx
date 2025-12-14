import type { Metadata } from 'next';
import LoginPageClient from './page.client';

export const metadata: Metadata = {
  title: 'Log ind på Storific Stories',
  description: 'Log ind eller opret konto for at lytte til dine interaktive historier.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Log ind på Storific Stories',
    description: 'Log ind eller opret konto for at lytte til dine interaktive historier.',
    url: '/login',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Log ind på Storific Stories',
    description: 'Log ind eller opret konto for at lytte til dine interaktive historier.',
  },
};

export default function LoginPage() {
  return (
    <LoginPageClient />
  );
}
