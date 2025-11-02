'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export default function CapacitorInitializer() {
  useEffect(() => {
    // Only initialize on native platforms (not web)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    async function initializeCapacitor() {
      try {
        // Initialize Status Bar
        if (Capacitor.isPluginAvailable('StatusBar')) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
        }

        // Hide splash screen when app is ready
        if (Capacitor.isPluginAvailable('SplashScreen')) {
          await SplashScreen.hide();
        }

        // Handle keyboard visibility
        if (Capacitor.isPluginAvailable('Keyboard')) {
          Keyboard.setAccessoryBarVisible({ isVisible: true });
          
          Keyboard.addListener('keyboardWillShow', (info) => {
            console.log('Keyboard will show:', info);
          });

          Keyboard.addListener('keyboardWillHide', () => {
            console.log('Keyboard will hide');
          });
        }

        // Handle app state changes
        if (Capacitor.isPluginAvailable('App')) {
          App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state changed. Is active?', isActive);
          });

          App.addListener('appUrlOpen', (data) => {
            console.log('App opened with URL:', data.url);
          });
        }

        console.log('✅ Capacitor plugins initialized');
      } catch (error) {
        console.error('❌ Error initializing Capacitor plugins:', error);
      }
    }

    initializeCapacitor();
  }, []);

  // This component doesn't render anything
  return null;
}
