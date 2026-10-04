import { PageHeaderSkeleton } from '@/components/shared/Loader/PageHeaderSkeleton'
import { Shimmer } from '@/components/shared/Loader/Shimmer'
import { TableSkeleton } from '@/components/shared/Loader/TableSkeleton'

export default function RegistrationsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center gap-2">
        <Shimmer className="h-9 w-full sm:w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-9 w-36" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-6 w-24 rounded-full" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <TableSkeleton columns={10} rows={8} />
      </div>
    </div>
  )
}
