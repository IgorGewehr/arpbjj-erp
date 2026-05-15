import { SkeletonList } from '@/components/ui/skeletons';

export default function NoticiasLoading() {
  return (
    <div className="p-4 sm:p-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-8 w-40 mb-2" />
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-5 w-60" />
        </div>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-9 w-32 hidden sm:block" />
      </div>

      {/* Filter chips row */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[80, 80, 100, 80].map((w, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-8"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* News list */}
      <SkeletonList count={6} itemHeight={120} gap={16} />
    </div>
  );
}
