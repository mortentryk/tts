'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EmailCaptureDialog from './EmailCaptureDialog';
import { setUserEmail } from '@/lib/purchaseVerification';

interface PurchaseButtonProps {
  story: {
    id: string;
    title: string;
    slug: string;
    price?: number;
    is_free?: boolean;
    cover_image_url?: string;
    description?: string;
  };
  hasAccess: boolean;
  userEmail: string | null;
}

export default function PurchaseButton({ story, hasAccess, userEmail }: PurchaseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const handleClick = async () => {
    if (hasAccess) {
      // User has access, navigate to story
      router.push(`/story/${story.slug || story.id}`);
      return;
    }

    // Story is locked, initiate purchase
    if (!userEmail) {
      // Show email dialog before purchasing
      setShowEmailDialog(true);
      return;
    }

    // Navigate to purchase page
    router.push(`/purchase/${story.id}`);
  };

  const handleEmailConfirm = (email: string) => {
    setUserEmail(email);
    setShowEmailDialog(false);
    // Navigate to purchase page after email is set
    router.push(`/purchase/${story.id}`);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`
          w-full p-4 rounded-lg font-semibold transition-all duration-300
          ${
            hasAccess
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : story.is_free ?? false
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {loading ? (
          'Indlæser...'
        ) : hasAccess ? (
          '▶️ Spil Historie'
        ) : (story.is_free ?? false) ? (
          '▶️ Spil Gratis'
        ) : (
          `🔒 Køb for ${Number(story.price ?? 0).toFixed(0)} kr.`
        )}
      </button>

      <EmailCaptureDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onConfirm={handleEmailConfirm}
        title="Køb Historie"
        message="Indtast din email-adresse for at købe denne historie:"
        loading={loading}
      />
    </>
  );
}

