'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudentHomework } from '@/modules/students/students.hooks'
import { Loader2, Star } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  studentName: string
}

export function StudentHomeworkModal({ open, onOpenChange, studentId, studentName }: Props) {
  const { data, isLoading } = useStudentHomework(studentId, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle>Devoirs de {studentName}</DialogTitle>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !data?.length ? (
          <p className="text-center text-gray-500 py-8 text-sm">Aucun devoir enregistré</p>
        ) : (
          <div className="space-y-2">
            {data.map(hw => (
              <div key={hw.id} className="border rounded-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold bg-[#7a4f30] text-white px-2 py-0.5 rounded">
                      {hw.classCode || hw.className}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(hw.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{hw.title}</p>
                  {hw.surahName && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {hw.surahName}
                      {hw.surahArabic && <span className="mr-1 font-arabic"> — {hw.surahArabic}</span>}
                    </p>
                  )}
                </div>
                {hw.starsCount !== null && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < hw.starsCount! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
