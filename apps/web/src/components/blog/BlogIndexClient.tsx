// ──────────────────────────────────────────────
// TradeMind — Interactive Blog Index Client Component
// Provides instant zero-latency search, category pill filtering,
// and responsive grid animations for institutional research articles.
// ──────────────────────────────────────────────

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  Activity,
  Layers,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlogPost } from '@/lib/blog-data';

interface BlogIndexClientProps {
  posts: BlogPost[];
}

const CATEGORIES = [
  'All',
  'SMC & Price Action',
  'Psychology & Discipline',
  'Risk & Math',
  'F&O Derivatives',
  'Multi-Market Strategy',
] as const;

export function BlogIndexClient({ posts }: BlogIndexClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'All' || post.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  const featured = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  return (
    <div className="space-y-10">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guides, strategies, SMC, FTMO, Greeks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background/80 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-border/60 bg-card/40 space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No Articles Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or selecting "All" categories to view all research guides.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="px-4 py-1.5 rounded-xl border border-border/60 bg-muted text-xs font-semibold text-foreground hover:bg-accent"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Featured Article Hero (when on "All" or if matches) */}
          {featured && (
            <div className="relative group rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-background overflow-hidden p-6 sm:p-10 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                      {featured.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featured.readTime}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(featured.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <Link href={`/blog/${featured.slug}`} className="block group-hover:text-primary transition-colors">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-foreground group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                  </Link>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {featured.description}
                  </p>

                  {/* Key Takeaways Chips */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {featured.keyTakeaways.slice(0, 2).map((takeaway, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-3 py-1 rounded-xl bg-accent/40 border border-border/50 text-foreground font-medium"
                      >
                        ✓ {takeaway}
                      </div>
                    ))}
                  </div>

                  {/* Author & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-3">
                      <img
                        src={featured.author.avatar}
                        alt={featured.author.name}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                      <div>
                        <div className="text-xs font-bold text-foreground">{featured.author.name}</div>
                        <div className="text-[11px] text-muted-foreground">{featured.author.role}</div>
                      </div>
                    </div>

                    <Link
                      href={`/blog/${featured.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm group-hover:translate-x-1"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Decorative Visual Badge */}
                <div className="lg:col-span-4 hidden lg:flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/5 border border-indigo-500/20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-bold text-foreground">{featured.category}</div>
                  <p className="text-xs text-muted-foreground">
                    Institutional quantitative mechanics and behavioral trading edge.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-primary font-bold">
                    {featured.tags.slice(0, 3).join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regular Articles Grid */}
          {regularPosts.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">
                  {selectedCategory === 'All' ? 'All Guides & Research' : `${selectedCategory} Guides`}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {regularPosts.length} Articles
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                {regularPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="group rounded-2xl border border-border/80 bg-card/60 hover:bg-card hover:border-primary/40 transition-all duration-300 p-6 flex flex-col justify-between space-y-4 hover:shadow-card-hover"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-accent text-accent-foreground border border-border/60">
                          {post.category}
                        </span>
                        <span className="text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </span>
                      </div>

                      <Link href={`/blog/${post.slug}`}>
                        <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {post.title}
                        </h4>
                      </Link>

                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-7 h-7 rounded-full object-cover border border-border"
                        />
                        <span className="text-xs font-medium text-foreground">{post.author.name}</span>
                      </div>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Read</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
