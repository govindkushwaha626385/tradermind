'use client';

import { useState } from 'react';
import { Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from '@/components/Toast';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Simulate API support ticket ingestion
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
      toast.success('Thank you! Your message has been sent to our support team.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      toast.error('Failed to send message. Please try again or email support@trademind.app');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-1">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Message Received</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We&apos;ve received your inquiry and our engineering support desk will review it. You can expect a response within 24 business hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-border hover:bg-accent transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
          Topic / Subject
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="">Select a topic</option>
          <option value="support">Technical Support</option>
          <option value="billing">Billing &amp; Subscription</option>
          <option value="feedback">Feedback &amp; Suggestions</option>
          <option value="security">Security Concern</option>
          <option value="brokers">Broker Integration Question</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1.5">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us how we can help..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
          required
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
      >
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}
