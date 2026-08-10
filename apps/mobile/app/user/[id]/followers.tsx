import { useLocalSearchParams } from 'expo-router'
import { FollowList } from '@/components/FollowList'
import { paramAsString } from '@/lib/routeParams'

export default function FollowersScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>()
  const userId = paramAsString(params.id)
  if (!userId) return null
  return <FollowList userId={userId} mode="followers" />
}
