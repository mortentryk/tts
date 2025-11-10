'use client';

import { useState, useEffect, useRef } from 'react';
import { setUserEmail } from '@/lib/purchaseVerification';

interface EmailCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string) => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function EmailCaptureDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Indtast din email',
  message = 'Indtast din email-adresse for at fortsætte:',
  loading = false,
}: EmailCaptureDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email er påkrævet');
      return;
    }

    if (!validateEmail(email)) {
      setError('Indtast venligst en gyldig email-adresse');
      return;
    }

    // Store email
    setUserEmail(email);
    onConfirm(email);
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border-2 border-white/20 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
        <p className="text-gray-300 mb-4">{message}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="din@email.dk"
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Indlæser...' : 'Fortsæt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

