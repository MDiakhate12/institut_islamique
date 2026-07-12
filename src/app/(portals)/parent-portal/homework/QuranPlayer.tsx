'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, RefreshCw, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURAHS } from '@/modules/homework/surahs.data'

// Sorted by surah number (1→114) for global ayah offset calculation
const SURAHS_BY_NUMBER = [...SURAHS].sort((a, b) => a.number - b.number)

function getGlobalAyah(surahNumber: number, ayah: number): number {
  let offset = 0
  for (const s of SURAHS_BY_NUMBER) {
    if (s.number === surahNumber) break
    offset += s.verses
  }
  return offset + ayah
}

const RECITERS = [
  { id: 'ar.husarymujawwad',    arabic: 'الشيخ الحصري (المعلم)',         label: 'Sheikh Al-Husary (Teacher)' },
  { id: 'ar.minshawi',          arabic: 'الشيخ المنشاوي',                label: 'Sheikh Al-Minshawy' },
  { id: 'ar.muhammadayyoub',    arabic: 'الشيخ محمد أيوب',              label: 'Sheikh Muhammad Ayyoub' },
  { id: 'ar.abdulsamad',        arabic: 'الشيخ عبد الباسط عبد الصمد',   label: 'Sheikh Abdulbasit Abdulsamad' },
  { id: 'ar.aymansowaid',       arabic: 'الشيخ أيمن سويد',              label: 'Sheikh Ayman Sowaid' },
  { id: 'ar.mahermuaiqly',      arabic: 'الشيخ ماهر المعيقلي',          label: 'Sheikh Maher Al Muaiqly' },
]

const REPEAT_COUNT = 3

interface Props {
  surahNumber: number
  surahName: string
  surahArabic: string
  fromVerse: number
  toVerse: number
}

export function QuranPlayer({ surahNumber, surahName, surahArabic, fromVerse, toVerse }: Props) {
  const [reciterId, setReciterId]   = useState(RECITERS[0].id)
  const [currentAyah, setAyah]      = useState(fromVerse)
  const [repeatCycle, setRepeat]    = useState(1)
  const [isPlaying, setPlaying]     = useState(false)
  const [progress, setProgress]     = useState(0)
  const [duration, setDuration]     = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted]           = useState(false)
  const [showReciterMenu, setMenu]  = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const totalAyahs = toVerse - fromVerse + 1

  const audioUrl = useCallback((ayah: number) => {
    const global = getGlobalAyah(surahNumber, ayah)
    return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${global}.mp3`
  }, [surahNumber, reciterId])

  const loadAyah = useCallback((ayah: number, autoPlay = true) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = audioUrl(ayah)
    audio.load()
    if (autoPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      setPlaying(false)
    }
    setAyah(ayah)
    setRepeat(1)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }, [audioUrl])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      setDuration(prev => prev || audio.duration || 0)
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    })
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('ended', () => {
      setRepeat(prev => {
        if (prev < REPEAT_COUNT) {
          audio.currentTime = 0
          audio.play()
          return prev + 1
        }
        // move to next ayah
        setAyah(cur => {
          const next = cur + 1
          if (next > toVerse) {
            setPlaying(false)
            return fromVerse
          }
          loadAyah(next, true)
          return next
        })
        return 1
      })
    })
    audio.addEventListener('play', () => setPlaying(true))
    audio.addEventListener('pause', () => setPlaying(false))

    return () => { audio.pause(); audio.src = '' }
  }, [fromVerse, toVerse, loadAyah])

  useEffect(() => {
    loadAyah(fromVerse, false)
  }, [fromVerse, reciterId, loadAyah])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause() } else { audio.play() }
  }

  function handlePrev() {
    if (currentAyah > fromVerse) loadAyah(currentAyah - 1, isPlaying)
    else { const a = audioRef.current; if (a) { a.currentTime = 0; if (isPlaying) a.play() } }
  }

  function handleNext() {
    if (currentAyah < toVerse) loadAyah(currentAyah + 1, isPlaying)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const t = parseFloat(e.target.value) * duration
    audio.currentTime = t
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !muted
    setMuted(m => !m)
  }

  const reciter = RECITERS.find(r => r.id === reciterId)!
  const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 mt-1 mb-2">
      {/* Surah info + reciter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7a4f30] text-white text-xs font-bold">
            {surahNumber}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#7a4f30] leading-tight truncate">{surahArabic}</p>
            <p className="text-xs text-muted-foreground leading-tight">{surahName}</p>
          </div>
        </div>

        {/* Reciter selector */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu(m => !m)}
            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-xs text-[#7a4f30] hover:bg-orange-50 transition-colors max-w-[180px]"
          >
            <span className="truncate text-right font-medium">{reciter.arabic}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>
          {showReciterMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
              {RECITERS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setReciterId(r.id); setMenu(false) }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors',
                    r.id === reciterId ? 'text-[#c2440f] font-medium' : 'text-foreground'
                  )}
                >
                  <div className="text-right min-w-0">
                    <p className="font-medium truncate">{r.arabic}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.label}</p>
                  </div>
                  {r.id === reciterId && <Check className="h-3.5 w-3.5 shrink-0 text-[#c2440f]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ayah info */}
      <div className="mt-2 flex justify-center">
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs text-[#c2440f] font-medium">
          Ayah {currentAyah} · Ayah {currentAyah - fromVerse + 1} sur {totalAyahs}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-7 text-right">{fmtTime(currentTime)}</span>
        <input
          type="range"
          min={0} max={1} step={0.001}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #c2440f ${progress * 100}%, #e5e7eb ${progress * 100}%)`
          }}
        />
        <span className="text-[10px] text-muted-foreground w-7">{fmtTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center justify-center gap-4">
        <button type="button" onClick={toggleMute} className="text-muted-foreground hover:text-[#7a4f30] transition-colors">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={handlePrev} className="text-muted-foreground hover:text-[#7a4f30] transition-colors">
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7a4f30] text-white shadow-md hover:bg-[#5c3820] transition-colors"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentAyah >= toVerse}
          className="text-muted-foreground hover:text-[#7a4f30] transition-colors disabled:opacity-30"
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4 text-[#c2440f]" />
          <span className="text-xs font-bold text-[#c2440f]">{REPEAT_COUNT}×</span>
        </div>
      </div>

      {/* Repeat info */}
      <div className="mt-2 flex justify-center gap-2">
        <span className="rounded-full bg-white border border-orange-200 px-2.5 py-0.5 text-[10px] text-muted-foreground">
          Répétition de chaque ayah {REPEAT_COUNT} fois
        </span>
        <span className="rounded-full bg-white border border-orange-200 px-2.5 py-0.5 text-[10px] text-[#c2440f] font-medium">
          {repeatCycle} sur {REPEAT_COUNT}
        </span>
      </div>
    </div>
  )
}
