import { useCollection } from '@/data/store'
import { verifiedFoodsStore } from '@/data/collections'

/** The user's verified foods ("My Foods") — barcode/label-scanned or confirmed. */
export function useVerifiedFoods() {
  const foods = useCollection(verifiedFoodsStore)
  return {
    verifiedFoods: [...foods].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    remove: (id: string) => verifiedFoodsStore.remove(id),
  }
}
