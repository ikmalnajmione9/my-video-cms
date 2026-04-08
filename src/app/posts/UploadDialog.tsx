"use client"

import { FormEvent, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase-client'
import { getR2VideoUrl } from '@/lib/r2-utils'
import { getEmailLocalPart } from '@/lib/author-utils'
import { readResponseBody } from '@/lib/response-utils'

type Post = { 
  id: string | number; 
  title: string; 
  content_path?: string; 
  tag?: string; 
  author?: string;
  group_name?: string;
}

type PostWithContent = Post & { content_path: string; tag?: string; author?: string; group_name?: string }

interface UploadDialogProps {
  isOpen?: boolean
  onClose?: () => void
  initialTitle?: string
  initialMarkdown?: string
  initialTag?: string
  initialAuthor?: string
  initialGroupName?: string | null
  groupOptions?: string[]
  postId?: string | number
  onSaved?: () => void
}

interface UploadedVideo {
  fileName: string
  videoId?: string | null
  file?: File
  localUrl?: string
  source?: 'uploaded' | 'existing'
}

interface UploadVideoResponse {
  videoId?: string
  error?: string
}

// Legacy function: now returns empty array since we don't parse old YouTube links
function extractVideoLinksFromMarkdown(markdown: string): UploadedVideo[] {
  return []
}

function parseStoredPostContent(content: string) {
  const raw = content || ''
  // Match R2 video keys like "videos/1234567890-filename.mp4"
  const videoIdMatch = raw.match(/<!--\s*VIDEO_ID:([\s\S]*?)\s*-->/i)
  const videoTitleMatch = raw.match(/<!--\s*VIDEO_TITLE:([\s\S]*?)\s*-->/i)
  const markerVideoId = videoIdMatch?.[1]?.trim() ?? null
  const markerVideoTitle = (videoTitleMatch?.[1] || 'Uploaded Video').trim()

  const selectedVideo = markerVideoId
    ? {
        fileName: markerVideoTitle || 'Uploaded Video',
        videoId: markerVideoId,
        source: 'existing' as const,
      }
    : null

  const descriptionWithoutMarkers = raw
    .replace(/\n?<!--\s*VIDEO_ID:[\s\S]*?-->/gi, '')
    .replace(/\n?<!--\s*VIDEO_TITLE:[\s\S]*?-->/gi, '')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()

  return {
    description: descriptionWithoutMarkers,
    video: selectedVideo,
  }
}

// Add line breaks to long continuous text without spaces
function sanitizeDescriptionText(text: string, maxLineLength: number = 80): string {
  const lines = text.split('\n')
  return lines.map(line => {
    // If line is shorter than max, keep it as is
    if (line.length <= maxLineLength) {
      return line
    }
    
    // Check if line has spaces
    if (line.includes(' ')) {
      return line
    }
    
    // For long continuous text without spaces, insert line breaks
    const parts: string[] = []
    for (let i = 0; i < line.length; i += maxLineLength) {
      parts.push(line.substring(i, i + maxLineLength))
    }
    return parts.join('\n')
  }).join('\n')
}

function buildStoredPostContent(description: string, video: UploadedVideo | null) {
  const cleanDescription = (description || '').trim()
  const sanitizedDescription = sanitizeDescriptionText(cleanDescription)
  
  if (!video) return sanitizedDescription

  const safeTitle = (video.fileName || 'Uploaded Video').replace(/-->/g, '').trim() || 'Uploaded Video'
  const markers = `<!-- VIDEO_ID:${video.videoId} -->\n<!-- VIDEO_TITLE:${safeTitle} -->`
  return sanitizedDescription ? `${sanitizedDescription}\n\n${markers}` : markers
}

export default function UploadDialog({
  isOpen: isOpenProp,
  onClose,
  initialTitle = '',
  initialMarkdown = '',
  initialTag = 'new',
  initialAuthor = '',
  initialGroupName = null,
  groupOptions = [],
  postId,
  onSaved,
}: UploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const initialParsed = parseStoredPostContent(initialMarkdown)
  const [descriptionText, setDescriptionText] = useState(initialParsed.description)
  const [tag, setTag] = useState(initialTag || 'new')
  const [author, setAuthor] = useState(initialAuthor)
  const [selectedGroupName, setSelectedGroupName] = useState(initialGroupName || '')
  const [sessionAuthor, setSessionAuthor] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [currentUploadingFile, setCurrentUploadingFile] = useState('')
  const [hasPreviewedUploadedVideo, setHasPreviewedUploadedVideo] = useState(false)
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  const [removedExistingVideo, setRemovedExistingVideo] = useState(false)
  const normalizedGroupOptions = useMemo(
    () => Array.from(new Set((groupOptions || []).map(name => name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [groupOptions]
  )

  // Fetch session author name once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = getEmailLocalPart(session.user.email)
        setSessionAuthor(name)
        // For new posts, always use the logged-in user's name
        if (!postId) setAuthor(name)
      }
    })
  }, [])

  useEffect(() => {
    if (typeof isOpenProp !== 'undefined') {
      setIsOpen(isOpenProp)
    }
  }, [isOpenProp])

  useEffect(() => {
    const parsed = parseStoredPostContent(initialMarkdown)
    setTitle(initialTitle)
    setDescriptionText(parsed.description)
    setTag(initialTag || 'new')
    // For edits, keep the stored author. For new posts, always use session author.
    setAuthor(postId ? (initialAuthor || sessionAuthor) : sessionAuthor)
    setSelectedGroupName(initialGroupName || '')

    // In edit mode, preload existing video metadata.
    if (postId) {
      setUploadedVideos(parsed.video ? [parsed.video] : [])
      setHasPreviewedUploadedVideo(!parsed.video)
      setRemovedExistingVideo(false)
    } else {
      setUploadedVideos([])
      setHasPreviewedUploadedVideo(false)
      setRemovedExistingVideo(false)
    }
  }, [initialTitle, initialMarkdown, initialTag, initialAuthor, initialGroupName, postId, sessionAuthor])

  const resetForm = () => {
    setTitle('')
    setDescriptionText('')
    setTag('new')
    setStatus('idle')
    setMessage('')
    setUploadedVideos([])
    setIsUploadingVideo(false)
    setCurrentUploadingFile('')
    setHasPreviewedUploadedVideo(false)
    setAuthor(sessionAuthor)
    setSelectedGroupName(initialGroupName || '')
    setPreviewVideoId(null)
    setAttemptedSubmit(false)
  }

  const closeDialog = () => {
    setIsOpen(false)
    resetForm()
    onClose?.()
  }

  const isFormValid = useMemo(() => {
      const hasSessionUploadedVideos = uploadedVideos.some((video) => video.source === 'uploaded')
    return title.trim().length > 0 && (!hasSessionUploadedVideos || hasPreviewedUploadedVideo)
  }, [title, uploadedVideos, hasPreviewedUploadedVideo])

  const removeUploadedVideo = (idKey: string | null) => {
    const removedVideo = uploadedVideos.find(v => (v.videoId ?? v.localUrl) === idKey)
    const updatedVideos = uploadedVideos.filter(v => (v.videoId ?? v.localUrl) !== idKey)
    setUploadedVideos(updatedVideos)

    if (removedVideo?.source === 'existing') {
      setRemovedExistingVideo(true)
    }

    if (previewVideoId === idKey) {
      setPreviewVideoId(null)
    }

    if (updatedVideos.length === 0) {
      setHasPreviewedUploadedVideo(false)
    }
  }

  const uploadVideoFiles = async (videoFiles: File[]) => {
    if (videoFiles.length === 0) return

    if (uploadedVideos.length > 0) {
      setStatus('error')
      setMessage('Only one video is allowed per post. Remove the current video before uploading a new one.')
      return
    }

    if (videoFiles.length > 1) {
      setStatus('error')
      setMessage('Please upload only one video file.')
      return
    }

    const [file] = videoFiles
    if (!file) return

    // Keep the file locally and show an MP4 preview. Upload to R2 when the user publishes.
    try {
      const localUrl = URL.createObjectURL(file)
      setUploadedVideos([
        { fileName: file.name, videoId: null, file, localUrl, source: 'uploaded' },
      ])
      setRemovedExistingVideo(false)
      setStatus('idle')
      setMessage('Video ready for preview. It will upload to R2 when you publish.')
      setHasPreviewedUploadedVideo(true)
      setPreviewVideoId(localUrl)
    } catch (error: any) {
      setStatus('error')
      setMessage(error?.message || 'Failed to prepare video preview')
    } finally {
      setIsUploadingVideo(false)
      setCurrentUploadingFile('')
    }
  }

  const onDropVideoInZone = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const files = Array.from(event.dataTransfer.files || [])
    const videoFile = files.find((file) => file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4'))
    if (!videoFile) {
      setStatus('error')
      setMessage('Video upload box accepts MP4 files only.')
      return
    }

    await uploadVideoFiles([videoFile])
  }

  const onPickVideoFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const videoFile = files.find((file) => file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4'))
    if (!videoFile) return
    await uploadVideoFiles([videoFile])
    event.target.value = ''
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (!title.trim()) {
      setMessage('Please fill in all required fields.')
      setStatus('error')
      return
    }

    // No need for YouTube validation anymore

    const hasSessionUploadedVideos = uploadedVideos.some((video) => video.source === 'uploaded')
    if (hasSessionUploadedVideos && !hasPreviewedUploadedVideo) {
      setMessage('Please preview the selected video before publishing.')
      setStatus('error')
      return
    }

    let selectedVideo: UploadedVideo | null = uploadedVideos[0] ?? null

    // In edit mode, preserve existing embedded video markers even when the dialog
    // was opened with a storage path-only content value.
    if (postId && !selectedVideo && !removedExistingVideo) {
      const safePostId = String(postId ?? '').trim()
      if (safePostId && safePostId !== 'undefined' && safePostId !== 'null') {
        try {
          const existingContentRes = await fetch(`/api/posts/${encodeURIComponent(safePostId)}/content`)
          if (existingContentRes.ok) {
            const existingContent = await existingContentRes.text()
            const parsedExisting = parseStoredPostContent(existingContent)
            selectedVideo = parsedExisting.video ?? null
          }
        } catch {
          // Ignore fallback errors and proceed with current form state.
        }
      }
    }

    // If there are selected local files that haven't been uploaded to R2 yet,
    // perform the upload now before saving the post so we can store the R2 key.
    const pendingUploads = uploadedVideos.filter((v) => v.source === 'uploaded' && !v.videoId && v.file)
    if (pendingUploads.length > 0) {
      // Use a local copy to avoid relying on state immediately after set
      let updatedList = [...uploadedVideos]
      for (const pending of pendingUploads) {
        try {
          setIsUploadingVideo(true)
          setCurrentUploadingFile(pending.fileName)
          setMessage(`Uploading ${pending.fileName} to R2 storage...`)

          const videoForm = new FormData()
          videoForm.append('video', pending.file as File)

          const res = await fetch('/api/upload-video', { method: 'POST', body: videoForm })
          const body = await readResponseBody<UploadVideoResponse>(res)
          if (!res.ok) throw new Error(body?.error || 'Upload failed')

          const videoId = body?.videoId // This is now the R2 key like "videos/timestamp-filename.mp4"
          updatedList = updatedList.map((p) => (p === pending ? { ...p, videoId } : p))
          setUploadedVideos(updatedList)
          setMessage('Video uploaded to R2 storage successfully.')
        } catch (err: any) {
          setStatus('error')
          setMessage(err?.message || 'Video upload failed')
          setIsUploadingVideo(false)
          return
        } finally {
          setIsUploadingVideo(false)
          setCurrentUploadingFile('')
        }
      }
      // Refresh selectedVideo after uploads
      selectedVideo = updatedList[0] ?? null
    }

    const storedContent = buildStoredPostContent(descriptionText, selectedVideo)
    const groupNameValue = selectedGroupName.trim()

    try {
      setStatus('loading')
      setMessage(postId ? 'Saving changes...' : 'Uploading...')

      if (postId) {
        const safePostId = String(postId ?? '').trim()
        if (!safePostId || safePostId === 'undefined' || safePostId === 'null') {
          throw new Error('Invalid post id for update')
        }

          const res = await fetch(`/api/posts/${encodeURIComponent(safePostId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title: title.trim(), 
              markdown: storedContent,
              tag: tag.trim() || 'new',
              author: author.trim(),
              group_name: groupNameValue || null,
            }),
          })
        const body = await readResponseBody<{ error?: string }>(res)
        if (!res.ok) throw new Error(body?.error || 'Update failed')
      } else {
        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('markdown', storedContent)
        formData.append('tag', tag.trim() || 'new')
        formData.append('author', author.trim())
        formData.append('group_name', groupNameValue)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const body = await readResponseBody<{ error?: string }>(res)
        if (!res.ok) throw new Error(body?.error || 'Upload failed')
      }

      setStatus('success')
      setMessage(postId ? 'Video updated successfully!' : 'Uploaded successfully!')
      onSaved?.()
      closeDialog()
    } catch (error: any) {
      setStatus('error')
      setMessage(error?.message || 'Save failed')
    }
  }

  return (
    <>
      {(isOpen || isOpenProp) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
          <div className="custom-scrollbar w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl glass-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-blue-300">
                {postId ? 'Edit Video' : 'Upload New Video'}
              </h3>
              <button
                onClick={closeDialog}
                className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm text-slate-700">Title <span className="text-red-500">*</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`mt-1 w-full rounded border ${attemptedSubmit && !title.trim() ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'} px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 transition-colors`}
                  placeholder="Video title"
                />
                {attemptedSubmit && !title.trim() && <p className="text-xs text-red-400 mt-1.5 font-medium">Title is required.</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-700">Status Tag</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="new">New</option>
                    <option value="in-review">In Review</option>
                    <option value="tested">Tested</option>
                    <option value="released">Released</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700">Group</label>
                  <select
                    value={selectedGroupName}
                    onChange={(e) => setSelectedGroupName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="">Ungrouped</option>
                    {normalizedGroupOptions.map((groupName) => (
                      <option key={groupName} value={groupName}>
                        {groupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                onDrop={onDropVideoInZone}
                onDragOver={(e) => e.preventDefault()}
                className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3"
              >
                <label className="block text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 17l8-5-8-5v10z" />
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                    </svg>
                    Video Upload Box (MP4 only)
                  </span>
                </label>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">Upload one MP4 video for this guide.</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition-colors">
                    <span>Choose file</span>
                    <input type="file" accept="video/mp4,video/*" onChange={onPickVideoFiles} className="hidden" />
                  </label>
                </div>


              </div>

              {(isUploadingVideo || uploadedVideos.length > 0) && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">Video Upload Session</p>

                  {isUploadingVideo && (
                    <div className="mt-2 rounded border border-blue-500/40 bg-blue-950/30 px-3 py-2 text-xs text-blue-200">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-300" />{' '}
                      Uploading to R2 storage: {currentUploadingFile || 'Preparing files...'}
                    </div>
                  )}

                  {uploadedVideos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Selected video</p>
                      
                      <ul className="mt-1 space-y-2 text-xs text-slate-700">
                        {uploadedVideos.map((video) => (
                          <li key={`${video.videoId || video.localUrl}-${video.fileName}`} className="flex flex-col gap-2 rounded-lg bg-white p-3 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 truncate max-w-[240px]">{video.fileName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const idKey = video.videoId ?? video.localUrl ?? null
                                    setPreviewVideoId(previewVideoId === idKey ? null : idKey)
                                    setHasPreviewedUploadedVideo(true)
                                  }}
                                  className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                                >
                                  {previewVideoId === ((video.videoId ?? video.localUrl) || null) ? 'Hide Preview' : 'Preview Player'}
                                </button>
                                  {videoToDelete === ((video.videoId ?? video.localUrl) || null) ? (
                                  <div className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1">
                                    <span className="text-[10px] font-medium text-red-300">Delete?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        removeUploadedVideo((video.videoId ?? video.localUrl) || null)
                                        setVideoToDelete(null)
                                      }}
                                      className="rounded bg-red-500/40 hover:bg-red-500/60 transition-colors px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVideoToDelete(null)}
                                      className="rounded bg-slate-200 hover:bg-slate-300 transition-colors px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setVideoToDelete((video.videoId ?? video.localUrl) || null)}
                                    className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                    title="Remove video"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {previewVideoId === ((video.videoId ?? video.localUrl) || null) && (
                              <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-inner">
                                <video className="h-full w-full object-cover" controls src={video.localUrl ?? (video.videoId ? `${getR2VideoUrl(video.videoId)}` : '')} />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>

                      {!hasPreviewedUploadedVideo && (
                        <p className="mt-2 text-xs text-amber-600">
                          Please preview the selected video.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 8h10M7 12h10M7 16h6" />
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                    </svg>
                    Description (optional)
                  </span>
                </label>
                <textarea
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  onBlur={() => setDescriptionText(sanitizeDescriptionText(descriptionText))}
                  rows={3}
                  placeholder="Write a concise guide description for internal users (optional)..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  )}
                  {status === 'loading' ? 'Processing...' : postId ? 'Save Changes' : 'Publish Video'}
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="w-full h-11 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all bg-slate-100 rounded-xl border border-slate-200 hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>

            {message && (
              <p className={`mt-3 text-sm ${status === 'success' ? 'text-green-700' : status === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
        }
        
        /* WebKit scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 10px;
          border: 1px solid transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
        }
      `}</style>
    </>
  )
}
