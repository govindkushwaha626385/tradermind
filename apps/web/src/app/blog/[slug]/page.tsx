// ──────────────────────────────────────────────
// TradeMind — Dynamic Technical Blog Article Reader
// Pre-rendered for optimal Google SEO indexing, social previews,
// and actionable trader conversions.
// ──────────────────────────────────────────────

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clock,
  ArrowLeft,
  Share2,
  Sparkles,
  CheckCircle2,
  Tag,
  ArrowRight,
  BookOpen,
  Calculator,
  Shield,
  Activity,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BLOG_POSTS, type BlogPost } from '@/lib/blog-data';
import { ArticleShareActions } from '@/components/blog/ArticleShareActions';
import { InlineRiskCalculatorWidget } from '@/components/blog/InlineRiskCalculatorWidget';
import { ArticleReadingProgressBar } from '@/components/blog/ArticleReadingProgressBar';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Footer } from '@/components/landing/Footer';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Article Not Found — TradeMind' };

  return {
    title: `${post.seoTitle} | TradeMind`,
    description: post.description,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      url: `https://trademind.app/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `https://trademind.app/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  // Structured Data Schema for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author.name,
      jobTitle: post.author.role,
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    publisher: {
      '@type': 'Organization',
      name: 'TradeMind',
      url: 'https://trademind.app',
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      {/* Viewport Top Reading Progress Bar */}
      <ArticleReadingProgressBar />
      <LandingNavbar />

      {/* Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Articles</span>
          </Link>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground border border-border">
            {post.category}
          </span>
        </div>

        {/* Title Header */}
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display text-foreground leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {post.description}
          </p>

          {/* Author and Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/50 text-xs">
            <div className="flex items-center gap-3">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
              <div>
                <div className="font-bold text-foreground">{post.author.name}</div>
                <div className="text-[11px] text-muted-foreground">{post.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </span>
              <span>·</span>
              <span>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span>·</span>
              <ArticleShareActions title={post.title} slug={post.slug} />
            </div>
          </div>
        </header>

        {/* Key Takeaways Box */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" />
            <span>Key Executive Takeaways</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-foreground">
            {post.keyTakeaways.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Article Body */}
        <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-hr:border-border/50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </article>

        {/* Embedded Interactive Risk & R:R Calculator */}
        <InlineRiskCalculatorWidget />

        {/* Tags & Bottom Share Bar */}
        <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-2">
              <Tag className="w-3.5 h-3.5" />
              Tags:
            </span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-lg bg-muted/40 text-muted-foreground font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>

          <ArticleShareActions title={post.title} slug={post.slug} />
        </div>

        {/* Interactive In-Article Tool Banner */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase">
              <Calculator className="w-4 h-4" />
              <span>Interactive Edge Tool</span>
            </div>
            <h4 className="text-lg font-bold text-foreground">
              Calculate Your Exact Risk in Seconds
            </h4>
            <p className="text-xs text-muted-foreground">
              Never blow an account again. Compute precise lot sizes, stop losses, and multi-currency pip values.
            </p>
          </div>

          <Link
            href="/calculators"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
          >
            <span>Launch Free Calculators</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related Articles */}
        <div className="space-y-4 pt-6">
          <h3 className="text-lg font-bold text-foreground">Related Research</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="p-5 rounded-2xl border border-border/80 bg-card hover:bg-accent/40 transition-colors space-y-2 group block"
              >
                <div className="text-[11px] font-mono text-primary font-semibold">
                  {rel.category} · {rel.readTime}
                </div>
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {rel.title}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {rel.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
