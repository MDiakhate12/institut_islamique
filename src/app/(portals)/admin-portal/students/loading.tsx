import { PageHeaderSkeleton } from '@/components/shared/Loader/PageHeaderSkeleton'
import { Shimmer } from '@/components/shared/Loader/Shimmer'
import { TableSkeleton } from '@/components/shared/Loader/TableSkeleton'

export default function StudentsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeaderSkeleton actions={2} />
      <div className="flex flex-wrap items-center gap-2">
        <Shimmer className="h-9 w-full sm:w-72" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <TableSkeleton columns={8} rows={8} />
      </div>
    </div>
  )
}
