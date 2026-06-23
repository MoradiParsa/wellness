import { useMemo, useState } from 'react'
import { Plus, Images, X, Trash2, ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { TabPage } from '@/components/layout/TabPage'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PhotoPicker } from '@/components/shared/PhotoPicker'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { useProgressPhotos } from '@/hooks/useProgressPhotos'
import { useSettings } from '@/hooks/useSettings'
import { useWeight } from '@/hooks/useWeight'
import { formatWeight } from '@/lib/format'
import { todayKey, formatMonthDay, formatPretty, daysAgo } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { ProgressPhoto } from '@/types'

type View = 'timeline' | 'compare'
type Pose = ProgressPhoto['pose']
const POSES: { value: Pose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
  { value: 'custom', label: 'Custom' },
]

export function ProgressPhotos() {
  const { photos, loading, add, remove } = useProgressPhotos()
  const { settings } = useSettings()
  const { latest } = useWeight()

  const [view, setView] = useState<View>('timeline')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pose, setPose] = useState<Pose>('front')
  const [capture, setCapture] = useState<string | undefined>()
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)

  // Compare controls
  const [comparePose, setComparePose] = useState<Pose>('front')
  const [range, setRange] = useState<'30' | '90' | 'custom'>('30')
  const [customDate, setCustomDate] = useState('')

  const save = async () => {
    if (!capture) return
    await add({
      date: todayKey(),
      pose,
      dataUrl: capture,
      weightKg: latest?.weight,
      bodyFat: latest?.bodyFat,
      muscle: latest?.muscle,
      water: latest?.water,
      calories: settings.calorieTarget,
      phase: settings.phase,
    })
    toast.success('Progress photo saved')
    setCapture(undefined)
    setSheetOpen(false)
  }

  const byDate = useMemo(() => {
    const map = new Map<string, ProgressPhoto[]>()
    for (const p of photos) {
      const arr = map.get(p.date) ?? []
      arr.push(p)
      map.set(p.date, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [photos])

  // Compare: closest photo to N days ago vs most recent, for the chosen pose.
  const compare = useMemo(() => {
    const ofPose = photos.filter((p) => p.pose === comparePose)
    if (ofPose.length === 0) return null
    const now = [...ofPose].sort((a, b) => b.date.localeCompare(a.date))[0]
    const targetAgo = range === 'custom' ? (customDate ? daysAgo(customDate) : 30) : Number(range)
    let then = ofPose[0]
    let bestDiff = Infinity
    for (const p of ofPose) {
      const diff = Math.abs(daysAgo(p.date) - targetAgo)
      if (diff < bestDiff) {
        bestDiff = diff
        then = p
      }
    }
    return { then, now }
  }, [photos, comparePose, range, customDate])

  const openViewer = (photo: ProgressPhoto) => setViewerIdx(photos.findIndex((p) => p.id === photo.id))

  if (loading) {
    return (
      <TabPage title="Progress Photos">
        <p className="px-1 text-sm text-muted-foreground">Loading photos…</p>
      </TabPage>
    )
  }

  return (
    <TabPage
      title="Progress Photos"
      right={
        <Button size="iconSm" variant="secondary" onClick={() => setSheetOpen(true)}>
          <Plus />
        </Button>
      }
    >
      {photos.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Track your body visually"
          description="Add front, side, back, or custom photos. Each one snapshots your weight, body fat, phase, and calories so you can see real change over weeks."
          action={
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" /> Add first photo
            </Button>
          }
        />
      ) : (
        <>
          <SegmentedControl
            className="mb-4"
            layoutId="photos-view"
            value={view}
            onChange={setView}
            options={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'compare', label: 'Compare' },
            ]}
          />

          {view === 'timeline' && (
            <div className="space-y-5">
              {byDate.map(([date, list]) => (
                <div key={date}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold">{formatPretty(date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {list[0].weightKg != null ? formatWeight(list[0].weightKg, settings) : ''}
                      {list[0].phase ? ` · ${list[0].phase}` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openViewer(p)}
                        className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/70 bg-secondary"
                      >
                        <img src={p.dataUrl} alt={p.pose} loading="lazy" className="size-full object-cover" />
                        <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium capitalize text-white">
                          {p.pose}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'compare' && (
            <div className="space-y-4">
              <SegmentedControl
                size="sm"
                layoutId="compare-pose"
                value={comparePose}
                onChange={setComparePose}
                options={POSES}
              />
              <SegmentedControl
                size="sm"
                layoutId="compare-range"
                value={range}
                onChange={setRange}
                options={[
                  { value: '30', label: '30 days' },
                  { value: '90', label: '90 days' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
              {range === 'custom' && (
                <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              )}

              {compare ? (
                <div className="grid grid-cols-2 gap-2">
                  <ComparePane photo={compare.then} settings={settings} onOpen={() => openViewer(compare.then)} caption="Then" />
                  <ComparePane photo={compare.now} settings={settings} onOpen={() => openViewer(compare.now)} caption="Now" />
                </div>
              ) : (
                <p className="px-1 text-sm text-muted-foreground">No {comparePose} photos yet — add a couple over time to compare.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Capture sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add progress photo</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <SegmentedControl size="sm" layoutId="capture-pose" value={pose} onChange={setPose} options={POSES} />
            <PhotoPicker value={capture} onChange={setCapture} />
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3 text-sm text-muted-foreground">
              Snapshot saved with this photo:{' '}
              <span className="text-foreground">
                {latest ? formatWeight(latest.weight, settings) : 'no weigh-in'}
                {latest?.bodyFat != null ? ` · ${latest.bodyFat}% bf` : ''} · {settings.phase} · {settings.calorieTarget} kcal
              </span>
            </div>
            <Button size="lg" className="w-full" disabled={!capture} onClick={save}>
              Save photo
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {viewerIdx != null && photos[viewerIdx] && (
        <PhotoViewer
          photos={photos}
          index={viewerIdx}
          settings={settings}
          onIndex={setViewerIdx}
          onClose={() => setViewerIdx(null)}
          onDelete={async (id) => {
            await remove(id)
            setViewerIdx(null)
            toast('Photo deleted')
          }}
        />
      )}
    </TabPage>
  )
}

function ComparePane({
  photo,
  settings,
  caption,
  onOpen,
}: {
  photo: ProgressPhoto
  settings: ReturnType<typeof useSettings>['settings']
  caption: string
  onOpen: () => void
}) {
  return (
    <div>
      <button onClick={onOpen} className="block aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/70 bg-secondary">
        <img src={photo.dataUrl} alt={caption} loading="lazy" className="size-full object-cover" />
      </button>
      <p className="mt-1 px-0.5 text-xs font-medium">{caption} · {formatMonthDay(photo.date)}</p>
      <p className="px-0.5 text-[11px] text-muted-foreground">
        {photo.weightKg != null ? formatWeight(photo.weightKg, settings) : '—'}
        {photo.bodyFat != null ? ` · ${photo.bodyFat}%` : ''}
      </p>
    </div>
  )
}

function PhotoViewer({
  photos,
  index,
  settings,
  onIndex,
  onClose,
  onDelete,
}: {
  photos: ProgressPhoto[]
  index: number
  settings: ReturnType<typeof useSettings>['settings']
  onIndex: (i: number) => void
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [zoom, setZoom] = useState(false)
  const [startX, setStartX] = useState<number | null>(null)
  const photo = photos[index]
  const go = (dir: -1 | 1) => {
    const next = index + dir
    if (next >= 0 && next < photos.length) {
      setZoom(false)
      onIndex(next)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95">
      <div className="safe-top flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-white/10">
          <X className="size-5" />
        </button>
        <span className="text-sm font-medium">
          {formatPretty(photo.date)} · <span className="capitalize">{photo.pose}</span>
        </span>
        <button onClick={() => onDelete(photo.id)} className="flex size-9 items-center justify-center rounded-full bg-white/10 text-destructive">
          <Trash2 className="size-5" />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX == null) return
          const dx = e.changedTouches[0].clientX - startX
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
          setStartX(null)
        }}
      >
        <img
          src={photo.dataUrl}
          alt={photo.pose}
          onDoubleClick={() => setZoom((z) => !z)}
          className={cn('max-h-full max-w-full object-contain transition-transform duration-200', zoom && 'scale-[1.8]')}
        />
        {index > 0 && (
          <button onClick={() => go(-1)} className="absolute left-2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronLeft className="size-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button onClick={() => go(1)} className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white">
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      <div className="safe-bottom flex items-center justify-center gap-4 px-5 py-4 text-center text-xs text-white/80">
        <span>{photo.weightKg != null ? formatWeight(photo.weightKg, settings) : '—'}</span>
        {photo.bodyFat != null && <span>{photo.bodyFat}% bf</span>}
        {photo.phase && <span className="capitalize">{photo.phase}</span>}
        {photo.calories != null && <span>{photo.calories} kcal</span>}
        <span className="flex items-center gap-1"><Images className="size-3.5" /> {index + 1}/{photos.length}</span>
      </div>
    </div>
  )
}
