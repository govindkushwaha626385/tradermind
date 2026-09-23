// ──────────────────────────────────────────────
// TradeMind — Terms of Service Page
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import { APP_NAME } from '@trademind/shared';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms and conditions for using ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: September 22, 2026</p>

      <div className="prose prose-sm dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using {APP_NAME}, you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
          <p className="text-muted-foreground">
            {APP_NAME} provides an automated trading journal platform that syncs trade data from
            supported brokers, calculates performance metrics, and offers behavioral analytics.
            The platform is a tool for record-keeping and analysis — it does not provide financial
            advice, recommendations, or trading signals.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Provide accurate account information during registration.</li>
            <li>Maintain the confidentiality of your login credentials.</li>
            <li>Use the platform in compliance with all applicable laws and regulations.</li>
            <li>Not attempt to circumvent usage limits, security measures, or access controls.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Subscription &amp; Billing</h2>
          <p className="text-muted-foreground">
            Paid plans are billed monthly or annually as selected during checkout. Payments are
            processed securely by Razorpay. You may cancel your subscription at any time — access
            continues until the end of the current billing period. Refunds are handled on a
            case-by-case basis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            {APP_NAME} is provided &quot;as is&quot; without warranties of any kind. We are not
            responsible for trading losses, data inaccuracies from broker APIs, or service
            interruptions. In no event shall our liability exceed the amount you paid for the
            service in the preceding 12 months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
          <p className="text-muted-foreground">
            For questions about these terms, please visit our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
