// ──────────────────────────────────────────────
// TradeMind — Public Certificate Verification Page (/verify/:certificateId)
// 100% SEO-optimized, zero login required, open-graph & JSON-LD schema
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifyCertificate } from '@/lib/server/services/certificate-verification.service';
import { CertificateVerificationView } from '@/components/verify/CertificateVerificationView';
import { ShieldAlert, Search, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ certificateId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { certificateId } = await params;
  const certificate = await verifyCertificate(certificateId);

  if (!certificate) {
    return {
      title: 'Certificate Verification Not Found',
      description: 'The requested prop firm certificate identifier or verification hash could not be validated.',
      robots: { index: false, follow: true },
    };
  }

  const formattedSize = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: certificate.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(certificate.accountSize);

  const isTrade = certificate.phase.toLowerCase().includes('trade') || certificate.phase.toLowerCase().includes('execution');

  const title = isTrade
    ? `Verified Trade: ${certificate.accountName} | Net P&L: ${certificate.curSymbol}${certificate.profitEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })} — TradeMind`
    : `Verified: ${certificate.firmName} ${formattedSize} (${certificate.phase}) — ${certificate.maskedTraderName}`;

  const description = isTrade
    ? `Cryptographically authenticated trade execution for ${certificate.accountName}. Net Realized P&L: ${certificate.curSymbol}${certificate.profitEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${certificate.profitTargetPct}% ROI) · Consistency Score: ${certificate.consistencyScore}/100 · SHA-256 Hash: ${certificate.verificationHash}`
    : `Cryptographically authenticated Prop Firm Credential for ${certificate.firmName} ${formattedSize}. Consistency Score: ${certificate.consistencyScore}/100 · Drawdown: ${certificate.actualDrawdownPct}% (Compliant) · 100% Rule Adherence.`;

  return {
    title,
    description,
    keywords: [
      'verified trade execution',
      'cryptographic trading journal proof',
      'verified P&L card',
      'prop firm verification',
      'FTMO certificate verification',
      'Topstep combine pass verification',
      'FundedNext certificate',
      'Apex Trader Funding pass verification',
      'funded trader credentials',
      'trader consistency score',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://trademind.app/verify/${certificate.certificateId}`,
      siteName: 'TradeMind Institutional Verification',
      images: [
        {
          url: 'https://trademind.app/images/og-certificate-badge.png',
          width: 1200,
          height: 630,
          alt: `TradeMind Verified Credential — ${certificate.firmName} ${formattedSize}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@TradeMind',
    },
  };
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { certificateId } = await params;
  const certificate = await verifyCertificate(certificateId);

  if (!certificate) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center space-y-5 border border-rose-500/30 bg-rose-500/5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">
              Invalid or Unregistered Certificate
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We could not find an authentic prop firm evaluation matching identifier{' '}
              <strong className="text-rose-400 font-mono">"{certificateId}"</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/verify"
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Search Certificate Directory</span>
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to TradeMind Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: `${certificate.firmName} ${certificate.accountSize} ${certificate.phase} Credential`,
    description: certificate.evaluatorNotes,
    credentialCategory: 'Proprietary Trading Evaluation',
    recognizedBy: {
      '@type': 'Organization',
      name: certificate.issuer,
      url: 'https://trademind.app',
    },
    validIn: {
      '@type': 'AdministrativeArea',
      name: 'Global',
    },
    dateCreated: certificate.issuedAt,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CertificateVerificationView certificate={certificate} />
    </>
  );
}
