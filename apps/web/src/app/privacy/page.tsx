// ──────────────────────────────────────────────
// TradeMind — Privacy Policy Page
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import { APP_NAME } from '@trademind/shared';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${APP_NAME} collects, uses, and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: September 22, 2026</p>

      <div className="prose prose-sm dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Data We Collect</h2>
          <p className="text-muted-foreground">
            {APP_NAME} collects only the data necessary to provide automated trading journal services:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Account data</strong> — email address, display name, and encrypted password (handled by Supabase Auth).</li>
            <li><strong>Broker credentials</strong> — API keys and tokens are encrypted at rest using AES-256-GCM and stored securely. We never share them with third parties.</li>
            <li><strong>Trading data</strong> — executed trades, portfolio holdings, and account balances synced from your connected brokers.</li>
            <li><strong>Journal data</strong> — your trade notes, emotion tags, screenshots, and behavioral reflections.</li>
            <li><strong>Usage data</strong> — page views, feature interactions, and error reports for platform improvement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Data</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>To sync and display your trading activity from connected brokers.</li>
            <li>To generate behavioral insights and performance analytics.</li>
            <li>To send periodic summaries and alerts you have opted into.</li>
            <li>To improve platform functionality, performance, and security.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Data Security</h2>
          <p className="text-muted-foreground">
            We implement industry-standard security measures including AES-256-GCM encryption for sensitive data,
            Supabase Auth with JWT-based session management, Row-Level Security (RLS) policies ensuring tenant
            isolation, and automated daily cleanup of stale data. All connections use TLS 1.3 encryption in transit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
          <p className="text-muted-foreground">
            Your data is retained for as long as your account is active. You may request deletion of your account
            and all associated data at any time by contacting support. Broker sync logs older than 90 days and
            execution payloads older than 30 days are automatically purged.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
          <p className="text-muted-foreground">
            We use Supabase (database &amp; auth), Razorpay (payment processing), Resend (email delivery),
            and Yahoo Finance (free market data for MFE/MAE calculations). Each service has its own privacy
            policy governing data handling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
          <p className="text-muted-foreground">
            For privacy-related inquiries, please visit our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
