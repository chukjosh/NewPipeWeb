/**
 * AddToPlaylistModal.tsx
 *
 * Modal dialog for adding a video to an existing playlist or creating
 * a new one on the fly. Opens when the user clicks the playlist button
 * on the Watch page.
 *
 * Props:
 *   videoId, title, uploader, thumbnailUrl, duration — video metadata
 *   onClose — called when the modal should be dismissed
 */

import { useState } from 'react'
import { X, Plus, Check, ListVideo } from 'lucide-react'
import {
  usePlaylists,
  useAddVideoToPlaylist,
  useCreatePlaylist,
} from '../../hooks'

interface AddToPlaylistModalProps {
  videoId: string
  title: string
  uploader: string
  thumbnailUrl: string
  duration: number
  onClose: () => void
}

export default function AddToPlaylistModal({
  videoId, title, uploader, thumbnailUrl, duration, onClose
}: AddToPlaylistModalProps) {
  const { data: playlists, isLoading } = usePlaylists()
  const addVideo    = useAddVideoToPlaylist()
  const createPl    = useCreatePlaylist()

  // Track which playlists this video was just added to (for checkmark UI)
  const [addedTo, setAddedTo] = useState<Set<number>>(new Set())

  // New playlist creation form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName]         = useState('')

  /** Add the current video to an existing playlist */
  const handleAddTo = async (playlistId: number) => {
    await addVideo.mutateAsync({
      playlistId,
      data: { videoId, title, uploader, thumbnailUrl, duration },
    })
    // Show a checkmark temporarily
    setAddedTo(prev => new Set([...prev, playlistId]))
  }

  /** Create a new playlist then immediately add the video to it */
  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return
    const { id } = await createPl.mutateAsync({ name: newName.trim() })
    await handleAddTo(id)
    setNewName('')
    setShowNewForm(false)
  }

  return (
    // Backdrop — clicking outside closes the modal
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal panel — stop click from bubbling to backdrop */}
      <div
        className="bg-neutral-900 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="font-semibold">Save to playlist</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Playlist list */}
        <div className="p-2 max-h-72 overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-neutral-400 text-center py-4">Loading playlists...</p>
          )}

          {!isLoading && playlists?.length === 0 && !showNewForm && (
            <p className="text-sm text-neutral-400 text-center py-4">
              No playlists yet. Create one below.
            </p>
          )}

          {/* Render each playlist as a toggleable row */}
          {playlists?.map(pl => {
            const wasAdded = addedTo.has(pl.id)
            return (
              <button
                key={pl.id}
                onClick={() => !wasAdded && handleAddTo(pl.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           hover:bg-neutral-800 transition-colors text-left"
                disabled={wasAdded}
              >
                {/* Thumbnail or placeholder */}
                <div className="w-10 h-8 bg-neutral-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {pl.thumbnailUrl
                    ? <img src={pl.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : <ListVideo size={16} className="text-neutral-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-xs text-neutral-400">{pl.videoCount} videos</p>
                </div>
                {/* Checkmark when added */}
                {wasAdded && <Check size={16} className="text-green-500 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* New playlist form */}
        <div className="p-4 border-t border-neutral-800">
          {showNewForm ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
                placeholder="Playlist name"
                className="input text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleCreateAndAdd} className="btn-primary flex-1 text-sm">
                  Create & add
                </button>
                <button onClick={() => setShowNewForm(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center gap-2 text-sm text-neutral-300
                         hover:text-white transition-colors py-1"
            >
              <Plus size={16} className="text-red-500" />
              New playlist
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
