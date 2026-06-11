import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { fileToCompressedDataURL } from '@/lib/image'
import { cn } from '@/lib/utils'

interface Props {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  className?: string
  aspect?: 'square' | 'photo'
}

export function PhotoPicker({ value, onChange, className, aspect = 'photo' }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file?: File) => {
    if (!file) return
    setLoading(true)
    try {
      const dataUrl = await fileToCompressedDataURL(file)
      onChange(dataUrl)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  if (value) {
    return (
      <div className={cn('relative overflow-hidden rounded-2xl border border-border', className)}>
        <img src={value} alt="" className={cn('w-full object-cover', aspect === 'square' ? 'aspect-square' : 'aspect-[4/3]')} />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
          aria-label="Remove photo"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={loading}
        className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground tap-scale"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        Take photo
      </button>
      <button
        type="button"
        onClick={() => uploadRef.current?.click()}
        disabled={loading}
        className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-secondary/40 text-sm text-muted-foreground tap-scale"
      >
        <ImagePlus className="size-5" />
        Upload
      </button>
    </div>
  )
}
