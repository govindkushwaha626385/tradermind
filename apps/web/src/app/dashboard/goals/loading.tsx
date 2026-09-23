import { SkeletonCard, SkeletonStatRow } from '@/components/ui/SkeletonCard';

export default function GoalsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <SkeletonStatRow count={3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-48" />)}
      </div>
    </div>
  );
}
