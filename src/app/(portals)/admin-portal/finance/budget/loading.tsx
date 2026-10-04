import { PageHeaderSkeleton } from '@/components/shared/Loader/PageHeaderSkeleton'
import { Shimmer } from '@/components/shared/Loader/Shimmer'
import { TableSkeleton } from '@/components/shared/Loader/TableSkeleton'

export default function BudgetLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeaderSkeleton actions={0} />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-24 flex-1 min-w-[180px] rounded-xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-9 flex-1 min-w-[160px]" />
        ))}
      </div>
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Shimmer className="h-9 flex-1 min-w-[200px]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <TableSkeleton columns={7} rows={6} />
      </div>
    </div>
  )
}
