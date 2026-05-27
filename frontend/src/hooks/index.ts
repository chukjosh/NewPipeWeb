import { storageSettingsApi } from '../api/client'

export function useStorageSettings() {
  return useQuery({
    queryKey: ['storageSettings'],
    queryFn: storageSettingsApi.get,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateStorageSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: storageSettingsApi.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storageSettings'] }),
  })
}


// ─────────────────────────────────────────────
// YouTube hooks
// ─────────────────────────────────────────────

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => extractorApi.search(query),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  })
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => youtubeApi.getVideo(id),
    enabled: !!id,
  })
}

export function useStream(id: string) {
  return useQuery({
    queryKey: ['stream', id],
    queryFn: () => id.startsWith('http') ? extractorApi.getStream(id) : extractorApi.getStreamById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // stream URLs last ~10 mins
  })
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: () => extractorApi.getChannelById(id),
    enabled: !!id,
  })
}

export function useTrending() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: extractorApi.getTrending,
    staleTime: 1000 * 60 * 15,
  })
}

export function useComments(videoId: string) {
  return useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => extractorApi.getComments(videoId.startsWith('http') ? videoId : `https://www.youtube.com/watch?v=${videoId}`),
    enabled: !!videoId,
  })
}

// ─────────────────────────────────────────────
// History hooks
// ─────────────────────────────────────────────

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: historyApi.getAll,
  })
}

export function useAddToHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: historyApi.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

export function useDeleteHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => historyApi.deleteOne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

export function useClearHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: historyApi.clearAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

// ─────────────────────────────────────────────
// Watchlist hooks
// ─────────────────────────────────────────────

export function useWatchlist() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
  })
}

export function useAddToWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: watchlistApi.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => watchlistApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  })
}

// ─────────────────────────────────────────────
// Playlist hooks
// ─────────────────────────────────────────────

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: playlistApi.getAll,
  })
}

export function usePlaylist(id: number) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistApi.getById(id),
    enabled: !!id,
  })
}

export function useCreatePlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: playlistApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlists'] }),
  })
}

export function useDeletePlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => playlistApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playlists'] }),
  })
}

export function useAddVideoToPlaylist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ playlistId, data }: {
      playlistId: number
      data: { videoId: string; title: string; uploader: string; thumbnailUrl: string; duration: number }
    }) => playlistApi.addVideo(playlistId, data),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['playlist', variables.playlistId] }),
  })
}

// ─────────────────────────────────────────────
// Subscription hooks
// ─────────────────────────────────────────────

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionApi.getAll,
  })
}

export function useSubscribe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subscriptionApi.subscribe,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}

export function useUnsubscribe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => subscriptionApi.unsubscribe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}

// ─────────────────────────────────────────────
// Feed hooks
// ─────────────────────────────────────────────

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: feedApi.getFeed,
    staleTime: 1000 * 60 * 10,
  })
}

// ─────────────────────────────────────────────
// Download hooks
// ─────────────────────────────────────────────

export function useDownloads() {
  return useQuery({
    queryKey: ['downloads'],
    queryFn: downloadApi.getAll,
    refetchInterval: (query) => {
      // Poll every 2 seconds if any downloads are in progress
      const hasActive = query.state.data?.some(
        (d) => d.status === 'DOWNLOADING' || d.status === 'PENDING'
      )
      return hasActive ? 2000 : false
    },
  })
}

export function useStartDownload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: downloadApi.start,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['downloads'] }),
  })
}

export function useDeleteDownload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => downloadApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['downloads'] }),
  })
}
