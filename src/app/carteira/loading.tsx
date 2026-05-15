import { SkeletonStats, SkeletonCard } from '@/components/ui/skeletons';

export default function CarteiraLoading() {
  return (
    <div className="p-4 sm:p-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-8 w-40 mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-5 w-64" />
      </div>

      {/* Stats */}
      <div className="mb-6">
        <SkeletonStats count={4} />
      </div>

      {/* Wallet balance card */}
      <div className="mb-6">
        <SkeletonCard height={180} />
      </div>

      {/* Recent transactions header */}
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-6 w-48 mb-3" />

      {/* Transactions list */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-16"
          />
        ))}
      </div>
    </div>
  );
}
