import { useCallback, useEffect, useState } from 'react'
import { getAllPhotos, putPhoto, deletePhoto } from '@/lib/photoDB'
import { uid } from '@/lib/id'
import { nowISO } from '@/lib/date'
import type { ProgressPhoto } from '@/types'

/** Progress photos, backed by IndexedDB (loaded into memory on mount). */
export function useProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setPhotos(await getAllPhotos())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    photos,
    loading,
    add: async (data: Omit<ProgressPhoto, 'id' | 'createdAt'>) => {
      const photo: ProgressPhoto = { ...data, id: uid(), createdAt: nowISO() }
      await putPhoto(photo)
      await reload()
      return photo
    },
    remove: async (id: string) => {
      await deletePhoto(id)
      await reload()
    },
  }
}
