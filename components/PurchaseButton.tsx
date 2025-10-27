'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PurchaseButtonProps {
  story: {
    id: string;
    title: string;
    slug: string;
    price: number;
    is_free: boolean;
    cover_image_url?: string;
    description?: string;
  };
  hasAccess: boolean;
  userEmail: string | null;
}

export default function PurchaseButton({ story, hasAccess, userEmail }: PurchaseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (hasAccess) {
      // User has access, navigate to story
      router.push(`/story/${story.slug || story.id}`);
      return;
    }

    // Story is locked, initiate purchase
    if (!userEmail) {
      // Prompt for email before purchasing
      const email = prompt('Please enter your email to purchase this story:');
      if (!email) {
        return;
      }
      
      if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
      }

      // Store email in localStorage
      localStorage.setItem('user_data', JSON.stringify({ email }));
    }

    // Navigate to purchase page
    router.push(`/purchase/${story.id}`);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        w-full p-4 rounded-lg font-semibold transition-all duration-300
        ${
          hasAccess
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : story.is_free
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? (
        'Loading...'
      ) : hasAccess ? (
        '▶️ Play Story'
      ) : story.is_free ? (
        '▶️ Play Free'
      ) : (
        `🔒 Buy for $${Number(story.price).toFixed(2)}`
      )}
    </button>
  );
}

