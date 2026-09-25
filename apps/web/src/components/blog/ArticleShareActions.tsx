// ──────────────────────────────────────────────
// TradeMind — Article Social Share Actions Component
// 1-click share to X (Twitter), LinkedIn, and Native Clipboard copy.
// ──────────────────────────────────────────────

'use client';

import { useState } from 'react';
import { Twitter, Linkedin, Copy, Check, Share2 } from 'lucide-react';
import { toast } from '@/components/Toast';

interface ArticleShareActionsProps {
  title: string;
  slug: string;
}

export function ArticleShareActions({ title, slug }: ArticleShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const getArticleUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/blog/${slug}`;
    }
    return `https://trademind.app/blog/${slug}`;
  };

  const handleShareTwitter = () => {
    const url = getArticleUrl();
    const text = encodeURIComponent(`"${title}" by @TradeMindHQ\n\n${url}\n\n#Trading #SMC #RiskManagement`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareLinkedin = () => {
    const url = getArticleUrl();
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const handleCopyLink = () => {
    const url = getArticleUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Article link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-mono text-muted-foreground mr-1 hidden sm:inline">
        Share:
      </span>
      <button
        type="button"
        onClick={handleShareTwitter}
        className="p-1.5 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-sky-400 transition-colors"
        title="Share on X / Twitter"
      >
        <Twitter className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleShareLinkedin}
        className="p-1.5 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-blue-500 transition-colors"
        title="Share on LinkedIn"
      >
        <Linkedin className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="p-1.5 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Copy article link"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
