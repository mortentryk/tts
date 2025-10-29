import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - TTS Story Platform',
  description: 'Terms of Service for our interactive TTS story platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this platform, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
            <p>
              We provide an interactive story platform with text-to-speech narration, voice commands, and multimedia content. 
              Stories are available for purchase individually or through a subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. User Accounts</h2>
            <p>
              You may access our service as a guest with email-only authentication. You are responsible for maintaining 
              the security of your email address and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Purchases and Subscriptions</h2>
            <p>
              <strong>One-Time Purchases:</strong> Individual stories can be purchased for a one-time fee. Once purchased, 
              you will have lifetime access to that story.
            </p>
            <p>
              <strong>Subscriptions:</strong> Subscriptions provide access to all stories during the active subscription period. 
              Subscriptions are billed monthly and can be cancelled at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Refunds</h2>
            <p>
              Due to the digital nature of our content, refunds are generally not provided. However, if you experience 
              technical issues that prevent you from accessing purchased content, please contact our support team.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Intellectual Property</h2>
            <p>
              All content, including stories, images, and audio, is protected by copyright and other intellectual property laws. 
              You may not reproduce, distribute, or create derivative works without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Limitation of Liability</h2>
            <p>
              We strive to provide a reliable service but do not guarantee uninterrupted access. We are not liable for any 
              damages resulting from the use or inability to use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Contact</h2>
            <p>
              For questions about these terms, please contact us through our support channels.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

