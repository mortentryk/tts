import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy - TTS Story Platform',
  description: 'Refund Policy for our interactive TTS story platform',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        
        <div className="space-y-6 text-gray-300">
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Digital Content Policy</h2>
            <p>
              Due to the digital nature of our interactive stories, our general policy is no refunds 
              once a purchase is completed. This is because you receive immediate access to the content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">When Refunds May Apply</h2>
            <p className="mb-4">Refunds may be considered in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Technical Issues:</strong> If you are unable to access purchased content due to technical problems</li>
              <li><strong>Duplicate Purchases:</strong> Accidental duplicate purchases of the same story</li>
              <li><strong>Unauthorized Charges:</strong> If you notice unauthorized charges on your account</li>
              <li><strong>Content Not as Described:</strong> If the content materially differs from what was advertised</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Subscription Refunds</h2>
            <p>
              For subscription plans, you can cancel at any time and you will retain access until the 
              end of your current billing period. No partial refunds are provided for unused subscription time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">How to Request a Refund</h2>
            <p className="mb-4">To request a refund:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Contact our support team through our designated channels</li>
              <li>Provide your email address and the story ID you purchased</li>
              <li>Explain the reason for your refund request</li>
              <li>Wait for our response (typically within 5 business days)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Processing Time</h2>
            <p>
              If your refund request is approved, refunds will be processed within 7-10 business days 
              to the original payment method used for the purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Currency</h2>
            <p>
              All prices are displayed in USD. Refunds will be issued in the same currency and amount 
              as the original transaction.
            </p>
          </section>

          <section className="bg-yellow-900/30 rounded-lg p-6 border border-yellow-600">
            <h2 className="text-2xl font-semibold mb-4 text-white">Questions?</h2>
            <p>
              If you have questions about our refund policy or believe you have a case for a refund, 
              please don&apos;t hesitate to contact our support team. We&apos;re here to help!
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

