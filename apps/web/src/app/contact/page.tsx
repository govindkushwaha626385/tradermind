// ──────────────────────────────────────────────
// TradeMind — Contact Page
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import { APP_NAME } from '@trademind/shared';

import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with the ${APP_NAME} team for support, feature requests, or billing inquiries.`,
};

export default function ContactPage() {
  return (
    <main className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-10">
        Have a question, suggestion, or need help? We&apos;d love to hear from you.
      </p>

      <ContactForm />

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="font-semibold mb-3">Other Ways to Reach Us</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Email: <a href="mailto:support@trademind.app" className="text-primary hover:underline">support@trademind.app</a></p>
          <p>Response time: Within 24 hours on business days.</p>
        </div>
      </div>
    </main>
  );
}
