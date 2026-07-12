'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  RefreshCw, ChevronDown, ChevronUp, Check, Music2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURAHS } from '@/modules/homework/surahs.data'

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
  { id: 'ar.husarymujawwad',  arabic: 'الشيخ الحصري (المعلم)',         label: 'Sheikh Al-Husary (Teacher)' },
  { id: 'ar.minshawi',        arabic: 'الشيخ المنشاوي',                label: 'Sheikh Al-Minshawy' },
  { id: 'ar.muhammadayyoub',  arabic: 'الشيخ محمد أيوب',              label: 'Sheikh Muhammad Ayyoub' },
  { id: 'ar.abdulsamad',      arabic: 'الشيخ عبد الباسط عبد الصمد',   label: 'Sheikh Abdulbasit Abdulsamad' },
  { id: 'ar.aymansowaid',     arabic: 'الشيخ أيمن سويد',              label: 'Sheikh Ayman Sowaid' },
  { id: 'ar.mahermuaiqly',    arabic: 'الشيخ ماهر المعيقلي',          label: 'Sheikh Maher Al Muaiqly' },
]

export default function QuranAudioClient() {
  // Surah selection
  const [selectedNumber, setSelectedNumber] = useState(114)
  const [isFullSurah, setIsFullSurah]       = useState(true)
  const [fromVerse, setFromVerse]           = useState(1)
  const [toVerse, setToVerse]               = useState(6)
  const selectedSurah = SURAHS.find(s => s.number === selectedNumber)!

  function handleSurahChange(num: number) {
    const s = SURAHS.find(s => s.number === num)!
    setSelectedNumber(num)
    setFromVerse(1)
    setToVerse(s.verses)
    setIsFullSurah(true)
  }

  function handleFullSurahToggle() {
    if (!isFullSurah) {
      setFromVerse(1)
      setToVerse(selectedSurah.verses)
    }
    setIsFullSurah(v => !v)
  }

  // Audio player state
  const [reciterId, setReciterId]     = useState(RECITERS[0].id)
  const [currentAyah, setCurrentAyah] = useState(fromVerse)
  const [repeatMax, setRepeatMax]     = useState(3)
  const [repeatCycle, setRepeatCycle] = useState(1)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [duration, setDuration]       = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted]             = useState(false)
  const [showReciterMenu, setShowReciterMenu] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Refs for event handler (avoid stale closures + no nested state updaters)
  const repeatMaxRef      = useRef(repeatMax)
  const repeatCycleRef    = useRef(repeatCycle)
  const currentAyahRef    = useRef(currentAyah)
  const toVerseRef        = useRef(toVerse)
  const fromVerseRef      = useRef(fromVerse)
  const selectedNumberRef = useRef(selectedNumber)
  const isPlayingRef      = useRef(isPlaying)
  useEffect(() => { repeatMaxRef.current = repeatMax },           [repeatMax])
  useEffect(() => { repeatCycleRef.current = repeatCycle },       [repeatCycle])
  useEffect(() => { currentAyahRef.current = currentAyah },       [currentAyah])
  useEffect(() => { toVerseRef.current = toVerse },               [toVerse])
  useEffect(() => { fromVerseRef.current = fromVerse },           [fromVerse])
  useEffect(() => { selectedNumberRef.current = selectedNumber }, [selectedNumber])
  useEffect(() => { isPlayingRef.current = isPlaying },           [isPlaying])

  const buildUrl = useCallback((surahNum: number, ayah: number) => {
    const global = getGlobalAyah(surahNum, ayah)
    return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${global}.mp3`
  }, [reciterId])

  const loadAyah = useCallback((surahNum: number, ayah: number, autoPlay: boolean) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = buildUrl(surahNum, ayah)
    audio.load()
    if (autoPlay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    } else {
      setIsPlaying(false)
    }
    setCurrentAyah(ayah)
    setRepeatCycle(1)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }, [buildUrl])

  // Create audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    })
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('play',  () => setIsPlaying(true))
    audio.addEventListener('pause', () => setIsPlaying(false))

    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Attach ended listener (with latest refs)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function onEnded() {
      const cycle    = repeatCycleRef.current
      const maxRep   = repeatMaxRef.current

      if (cycle < maxRep) {
        // Repeat current ayah
        repeatCycleRef.current = cycle + 1
        setRepeatCycle(cycle + 1)
        audio!.currentTime = 0
        audio!.play()
        return
      }

      // Move to next ayah
      const next = currentAyahRef.current + 1
      repeatCycleRef.current = 1
      setRepeatCycle(1)

      if (next > toVerseRef.current) {
        setIsPlaying(false)
        currentAyahRef.current = fromVerseRef.current
        setCurrentAyah(fromVerseRef.current)
        return
      }

      currentAyahRef.current = next
      loadAyah(selectedNumberRef.current, next, true)
    }

    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [loadAyah])

  // Reset when selection changes
  useEffect(() => {
    loadAyah(selectedNumber, fromVerse, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNumber, fromVerse, toVerse, reciterId])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
  }

  function handlePrev() {
    const audio = audioRef.current
    if (currentAyah > fromVerse) {
      loadAyah(selectedNumber, currentAyah - 1, isPlaying)
    } else if (audio) {
      audio.currentTime = 0
      if (isPlaying) audio.play()
    }
  }

  function handleNext() {
    if (currentAyah < toVerse) loadAyah(selectedNumber, currentAyah + 1, isPlaying)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = parseFloat(e.target.value) * duration
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !muted
    setMuted(m => !m)
  }

  const reciter   = RECITERS.find(r => r.id === reciterId)!
  const fmtTime   = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
  const totalAyahs = toVerse - fromVerse + 1
  const ayahNums  = Array.from({ length: selectedSurah.verses }, (_, i) => i + 1)
  const rangeNums = Array.from({ length: totalAyahs }, (_, i) => fromVerse + i)

  return (
    <div className="flex flex-col bg-[#fdf6f0] min-h-screen">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-[#7a4f30]/10 rounded-xl p-2.5">
            <Music2 className="h-6 w-6 text-[#c2440f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#c2440f]">Audio Coran</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Écoutez de belles récitations coraniques. Sélectionnez une sourate et choisissez votre récitant préféré.
            </p>
          </div>
        </div>

        <p className="text-right text-lg text-[#7a4f30]" dir="rtl">استمع إلى القرآن الكريم</p>

        {/* Surah selector card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-[#7a4f30] text-base">☰</span>
            Sélectionner une Sourate
          </p>

          {/* Surah select */}
          <select
            value={selectedNumber}
            onChange={e => handleSurahChange(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 cursor-pointer"
          >
            {SURAHS.map(s => (
              <option key={s.number} value={s.number}>
                {s.number} {s.arabic} - {s.name}
              </option>
            ))}
          </select>

          {/* Full surah toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sourate complète</p>
              <p className="text-xs text-muted-foreground">(Tous les {selectedSurah.verses} versets)</p>
            </div>
            <button
              onClick={handleFullSurahToggle}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                isFullSurah ? 'bg-[#c2440f]' : 'bg-gray-200'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                isFullSurah ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>

          {/* Verse range selectors (when not full surah) */}
          {!isFullSurah && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">De l&apos;Ayah</label>
                <select
                  value={fromVerse}
                  onChange={e => {
                    const v = Number(e.target.value)
                    setFromVerse(v)
                    if (v > toVerse) setToVerse(v)
                  }}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20"
                >
                  {ayahNums.map(n => (
                    <option key={n} value={n}>Ayah {n}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">À l&apos;Ayah</label>
                <select
                  value={toVerse}
                  onChange={e => setToVerse(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20"
                >
                  {ayahNums.filter(n => n >= fromVerse).map(n => (
                    <option key={n} value={n}>Ayah {n}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Audio player card */}
        <div className="rounded-2xl border border-orange-100 shadow-sm">
          <div className="bg-gradient-to-b from-orange-50/80 to-orange-50/30 rounded-2xl px-5 py-5 space-y-4">

            {/* Surah info + reciter selector */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-[#c2440f] text-white text-xs font-bold">
                  {selectedNumber}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#7a4f30] leading-tight" dir="rtl">{selectedSurah.arabic}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{selectedSurah.name}</p>
                </div>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={() => setShowReciterMenu(m => !m)}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-2 text-xs text-[#7a4f30] hover:bg-orange-50 transition-colors"
                >
                  <div className="text-right min-w-0 max-w-[160px]">
                    <p className="font-medium truncate text-xs" dir="rtl">{reciter.arabic}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{reciter.label}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
                {showReciterMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-border bg-white shadow-xl overflow-hidden">
                    {RECITERS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setReciterId(r.id); setShowReciterMenu(false) }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                          r.id === reciterId ? 'bg-orange-50 text-[#c2440f]' : 'hover:bg-orange-50/60 text-foreground'
                        )}
                      >
                        <div className="flex-1 text-right min-w-0" dir="rtl">
                          <p className="font-medium text-xs truncate">{r.arabic}</p>
                          <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{r.label}</p>
                        </div>
                        {r.id === reciterId && <Check className="h-3.5 w-3.5 shrink-0 text-[#c2440f]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ayah indicator chip */}
            <div className="flex justify-center">
              <span className="rounded-full bg-white/80 border border-orange-200 px-3 py-0.5 text-xs text-[#c2440f] font-medium">
                Ayah {currentAyah} · Ayah {currentAyah - fromVerse + 1} sur {fromVerse}-{toVerse}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{fmtTime(currentTime)}</span>
              <input
                type="range" min={0} max={1} step={0.001}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer accent-[#c2440f]"
                style={{
                  background: `linear-gradient(to right, #c2440f ${progress * 100}%, #e5e7eb ${progress * 100}%)`,
                }}
              />
              <span className="text-[10px] text-muted-foreground w-8 tabular-nums">{fmtTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5">
              <button onClick={toggleMute} className="text-muted-foreground hover:text-[#7a4f30] transition-colors">
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button onClick={handlePrev} className="text-muted-foreground hover:text-[#7a4f30] transition-colors">
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c2440f] text-white shadow-md hover:bg-[#a33a0d] transition-colors"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
              </button>
              <button
                onClick={handleNext}
                disabled={currentAyah >= toVerse}
                className="text-muted-foreground hover:text-[#7a4f30] transition-colors disabled:opacity-30"
              >
                <SkipForward className="h-5 w-5" />
              </button>

              {/* Repeat control */}
              <div className="flex flex-col items-center gap-0">
                <button
                  onClick={() => setRepeatMax(r => Math.min(r + 1, 10))}
                  className="text-[#c2440f] hover:text-[#a33a0d] transition-colors p-0.5"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4 text-[#c2440f]" />
                  <span className="text-xs font-bold text-[#c2440f]">{repeatMax}×</span>
                </div>
                <button
                  onClick={() => setRepeatMax(r => Math.max(r - 1, 1))}
                  className="text-[#c2440f] hover:text-[#a33a0d] transition-colors p-0.5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Repeat info chips */}
            <div className="flex justify-center gap-2">
              <span className="rounded-full bg-white/80 border border-orange-200 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                Répétition de chaque ayah {repeatMax} fois
              </span>
              <span className="rounded-full bg-white/80 border border-orange-200 px-2.5 py-0.5 text-[10px] text-[#c2440f] font-medium">
                {repeatCycle} sur {repeatMax}
              </span>
            </div>

            {/* Numbered ayah buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {rangeNums.map(n => (
                <button
                  key={n}
                  onClick={() => loadAyah(selectedNumber, n, isPlaying)}
                  className={cn(
                    'h-8 w-8 rounded-full text-sm font-medium transition-all',
                    n === currentAyah
                      ? 'bg-[#c2440f] text-white shadow-sm'
                      : 'bg-white border border-orange-200 text-foreground hover:bg-orange-50 hover:border-orange-300'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
