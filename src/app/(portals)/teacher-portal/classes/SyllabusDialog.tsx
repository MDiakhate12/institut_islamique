'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  className: string
  curriculum: string | null
}

export default function SyllabusDialog({ open, onClose, className, curriculum }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 bg-[#7a4f30] -mx-6 -mt-6 px-6 py-4 rounded-t-lg mb-2">
            <BookOpen className="h-5 w-5 text-white shrink-0" />
            <DialogTitle className="text-white text-base font-semibold">
              {className}
            </DialogTitle>
          </div>
        </DialogHeader>

        {curriculum ? (
          <div
            className="prose prose-sm max-w-none text-[#c2440f] [&_h1]:text-[#c2440f] [&_h2]:text-[#c2440f] [&_h3]:text-[#c2440f] [&_h4]:text-[#c2440f] [&_strong]:text-[#c2440f] [&_a]:text-[#c2440f] [&_li]:text-[#c2440f] [&_p]:text-[#c2440f]"
            dangerouslySetInnerHTML={{ __html: curriculum }}
          />
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucun programme défini pour cette classe.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
