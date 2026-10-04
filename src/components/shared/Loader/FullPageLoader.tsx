import { Loader } from './Loader'

/** Loader plein écran — entrée dans un portail (layout + session en cours de chargement). */
export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f9f3]">
      <Loader size="lg" label={label} />
    </div>
  )
}
