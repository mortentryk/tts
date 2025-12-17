import dynamic from 'next/dynamic';

const FeedPageClient = dynamic(() => import('./page.client'), { ssr: false });

export const metadata = {
  title: 'Reels',
};

export default function FeedPage() {
  return <FeedPageClient />;
}
