'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Users, User, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHomeworkStudents } from '@/modules/homework/homework.hooks'
import { cn } from '@/lib/utils'
import type { HomeworkItem } from '@/modules/homework/homework.types'

type Props = {
  open: boolean
  onClose: () => void
  homework: HomeworkItem | null
}

export default function GradeDialog({ open, onClose, homework }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const { data: students = [] } = useHomeworkStudents(homework?.classId ?? '')

  const selectedStudent = students.find(s => s.studentId === selectedStudentId)

  const surahLabel = homework?.surahName
    ? `${homework.surahName} - ${homework.surahArabic ?? ''}`
    : homework?.title ?? ''

  function handleClose() {
    setSelectedStudentId(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        showCloseButton={false}
        className="w-[800px] max-w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          <div className="bg-blue-100 rounded-full p-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Submissions: {surahLabel}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body — split panel */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left — student list */}
          <div className="w-72 border-r border-gray-100 flex flex-col bg-gray-50 flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                STUDENTS ({students.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {students.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Aucun élève</p>
                </div>
              ) : (
                students.map(student => (
                  <button
                    key={student.studentId}
                    onClick={() => setSelectedStudentId(student.studentId)}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white border-b border-gray-100 transition-colors',
                      selectedStudentId === student.studentId && 'bg-white border-l-2 border-l-blue-500',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <span className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded',
                        student.status === 'submitted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700',
                      )}>
                        {student.status === 'submitted' ? 'SOUMIS' : 'EN ATTENTE'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right — submission details */}
          <div className="flex-1 flex items-center justify-center p-8">
            {selectedStudent ? (
              selectedStudent.status === 'submitted' ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-700 font-medium">Enregistrement soumis</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">No recording submitted</p>
                  <p className="text-sm text-gray-400">
                    Student must submit a recording for Quran homework.
                  </p>
                </div>
              )
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-sm text-gray-400">
                  Sélectionnez un élève pour voir sa soumission
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
