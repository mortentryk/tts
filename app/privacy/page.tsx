import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - TTS Story Platform',
  description: 'Privacy Policy for our interactive TTS story platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Information We Collect</h2>
            <p className="mb-2">We collect the following information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Email Address:</strong> Collected during purchase for order confirmation and account management</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe - we never store your payment details</li>
              <li><strong>Usage Data:</strong> Stories accessed, purchase history, and navigation patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Process your purchases and subscriptions</li>
              <li>Provide access to purchased content</li>
              <li>Send order confirmations and important updates</li>
              <li>Improve our service based on usage patterns</li>
              <li>Respond to support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Third-Party Services</h2>
            <p>
              We use the following third-party services that may collect information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Stripe:</strong> Payment processing (view Stripe&apos;s privacy policy)</li>
              <li><strong>Supabase:</strong> Database and authentication (view Supabase&apos;s privacy policy)</li>
              <li><strong>Vercel:</strong> Hosting and analytics (view Vercel&apos;s privacy policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. 
              All payment information is encrypted and processed by Stripe in compliance with PCI DSS standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Your Rights (GDPR)</h2>
            <p className="mb-2">Under GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Cookies</h2>
            <p>
              We use cookies to maintain your session and remember your preferences. These are essential for 
              the platform to function properly. You can disable cookies in your browser, but this may affect 
              platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Children&apos;s Privacy</h2>
            <p>
              Our platform may be suitable for children, but we recommend parental supervision during use. 
              We do not knowingly collect personal information from children under 13 without parental consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in the United States and other countries where 
              our service providers operate. We ensure appropriate safeguards are in place.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Contact</h2>
            <p>
              For privacy-related inquiries or to exercise your rights, please contact us through our 
              support channels with &quot;Privacy Inquiry&quot; in the subject line.
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

