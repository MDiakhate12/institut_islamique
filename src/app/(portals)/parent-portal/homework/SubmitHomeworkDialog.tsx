'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Pause, RotateCcw, Send, CheckCircle2, CalendarDays, User, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitHomeworkRecordingAction } from '@/modules/homework/homework.actions'
import { toast } from 'sonner'

type State = 'idle' | 'recording' | 'preview' | 'uploading' | 'success'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  homeworkId: string
  studentId: string
  studentName: string
  surahName: string | null
  surahArabic: string | null
  isFullSurah: boolean
  fromVerse: number | null
  toVerse: number | null
  assignedDate: string
  onSubmitted: () => void
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full bg-[#c2440f] transition-all',
            active ? 'animate-pulse' : 'opacity-30'
          )}
          style={{
            height: active
              ? `${20 + Math.sin((i / 3) + Date.now() / 200) * 20 + Math.random() * 20}%`
              : '20%',
            animationDelay: `${i * 50}ms`,
            animationDuration: `${400 + i * 60}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function SubmitHomeworkDialog({
  open, onOpenChange, homeworkId, studentId, studentName,
  surahName, surahArabic, isFullSurah, fromVerse, toVerse,
  assignedDate, onSubmitted,
}: Props) {
  const [state, setState]       = useState<State>('idle')
  const [elapsed, setElapsed]   = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [playTime, setPlayTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveActive, setWave]   = useState(false)

  const mediaRecorder  = useRef<MediaRecorder | null>(null)
  const chunks         = useRef<Blob[]>([])
  const mimeTypeRef    = useRef<string>('audio/webm')
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  function resetState() {
    stopTimer()
    mediaRecorder.current?.stop()
    mediaRecorder.current = null
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setState('idle')
    setElapsed(0)
    setPlaying(false)
    setPlayTime(0)
    setDuration(0)
    setWave(false)
    chunks.current = []
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      mimeTypeRef.current = mimeType
      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorder.current = mr
      chunks.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks.current, { type: mimeTypeRef.current })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('preview')
        setWave(false)
      }
      mr.start(100)
      setState('recording')
      setElapsed(0)
      setWave(true)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch {
      toast.error('Impossible d\'accéder au microphone')
    }
  }, [])

  function stopRecording() {
    stopTimer()
    mediaRecorder.current?.stop()
  }

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    if (playing) { audio.pause() } else { audio.play() }
  }

  async function handleSubmit() {
    if (!audioUrl) return
    setState('uploading')
    try {
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

      const result = await submitHomeworkRecordingAction(homeworkId, studentId, {
        base64,
        mimeType: mimeTypeRef.current,
        durationSeconds: duration > 0 ? Math.round(duration) : elapsed > 0 ? elapsed : null,
      })

      if (!result.success) {
        toast.error(result.error)
        setState('preview')
        return
      }

      setState('success')
      onSubmitted()
    } catch {
      toast.error('Erreur lors de l\'envoi')
      setState('preview')
    }
  }

  const versesLabel = surahName
    ? isFullSurah
      ? `${surahName}${surahArabic ? ` - ${surahArabic}` : ''} (Sourate complète)`
      : `${surahName}${surahArabic ? ` - ${surahArabic}` : ''} (V. ${fromVerse}-${toVerse})`
    : null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && state !== 'uploading') onOpenChange(false) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-[#c2440f]" />
            Soumettre le devoir
          </DialogTitle>
        </DialogHeader>

        {/* Homework info */}
        <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1.5 text-sm">
          {versesLabel && (
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-[#c2440f] shrink-0 mt-0.5" />
              <span className="text-foreground font-medium">{versesLabel}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{studentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#c2440f] shrink-0" />
            <span className="text-[#c2440f] font-medium">
              {new Date(assignedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* State: idle */}
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-[#c2440f]/10 p-6">
              <Mic className="h-10 w-10 text-[#c2440f]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Enregistrer votre récitation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Appuyez sur le bouton ci-dessous pour commencer l&apos;enregistrement
              </p>
            </div>
            <Button
              onClick={startRecording}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-2"
            >
              <Mic className="h-4 w-4" />
              Commencer l&apos;enregistrement
            </Button>
          </div>
        )}

        {/* State: recording */}
        {state === 'recording' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600">Enregistrement en cours</span>
              <span className="text-sm font-mono text-muted-foreground">{formatDuration(elapsed)}</span>
            </div>
            <WaveformBars active={waveActive} />
            <Button
              onClick={stopRecording}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
            >
              <Square className="h-4 w-4 fill-current" />
              Arrêter l&apos;enregistrement
            </Button>
          </div>
        )}

        {/* State: preview */}
        {state === 'preview' && audioUrl && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm font-medium text-foreground">Écoutez votre enregistrement</p>

            {/* Hidden audio element */}
            <audio
              ref={el => {
                audioRef.current = el
                if (el && audioUrl) {
                  el.src = audioUrl
                  el.onplay = () => setPlaying(true)
                  el.onpause = () => setPlaying(false)
                  el.ontimeupdate = () => setPlayTime(el.currentTime)
                  el.onloadedmetadata = () => setDuration(el.duration)
                  el.onended = () => { setPlaying(false); setPlayTime(0) }
                }
              }}
            />

            {/* Progress bar */}
            <div className="w-full space-y-1">
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute h-full rounded-full bg-[#c2440f] transition-all"
                  style={{ width: duration > 0 ? `${(playTime / duration) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatDuration(playTime)}</span>
                <span>{formatDuration(elapsed)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={togglePlayback} className="gap-2">
                {playing
                  ? <><Pause className="h-4 w-4" /> Pause</>
                  : <><Play className="h-4 w-4" /> Écouter</>
                }
              </Button>
              <Button variant="outline" onClick={resetState} className="gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-2"
            >
              <Send className="h-4 w-4" />
              Envoyer au professeur
            </Button>
          </div>
        )}

        {/* State: uploading */}
        {state === 'uploading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c2440f]/20 border-t-[#c2440f]" />
            <p className="text-sm text-muted-foreground">Envoi en cours…</p>
          </div>
        )}

        {/* State: success */}
        {state === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-green-50 p-5">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Devoir soumis !</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre enregistrement a été envoyé avec succès au professeur.
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
