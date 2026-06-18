'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Bold, Italic, Strikethrough, List, ListOrdered, Link, Undo, Redo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export function RichTextEditor({ value, onChange, placeholder = 'Saisissez le contenu...', minHeight = '120px' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastValue = useRef(value)

  // Set initial HTML (only on mount)
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = useCallback((cmd: string, val?: string) => {
    ref.current?.focus()
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, val)
    const html = ref.current?.innerHTML ?? ''
    lastValue.current = html
    onChange(html)
  }, [onChange])

  const handleInput = useCallback(() => {
    const html = ref.current?.innerHTML ?? ''
    if (html !== lastValue.current) {
      lastValue.current = html
      onChange(html)
    }
  }, [onChange])

  const addLink = useCallback(() => {
    const url = window.prompt('URL du lien :')
    if (url) exec('createLink', url)
  }, [exec])

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        {[
          { icon: Bold,          cmd: 'bold',                title: 'Gras' },
          { icon: Italic,        cmd: 'italic',              title: 'Italique' },
          { icon: Strikethrough, cmd: 'strikeThrough',       title: 'Barré' },
        ].map(({ icon: Icon, cmd, title }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            onMouseDown={e => { e.preventDefault(); exec(cmd) }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-1" />

        <button type="button" title="Liste à puces" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Liste numérotée" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Lien" onMouseDown={e => { e.preventDefault(); addLink() }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Link className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button type="button" title="Annuler" onMouseDown={e => { e.preventDefault(); exec('undo') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Rétablir" onMouseDown={e => { e.preventDefault(); exec('redo') }}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
          <Redo className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editable area */}
      <div className="relative">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight }}
          className={cn(
            'px-3 py-2.5 text-sm focus:outline-none',
            '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
            '[&_a]:text-[#c2440f] [&_a]:underline',
            '[&_strong]:font-semibold',
          )}
        />
        {!value && (
          <p className="absolute top-2.5 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  )
}
