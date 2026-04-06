import { NextResponse } from 'next/server'
import { uploadVideoToR2 } from '@/lib/r2-utils'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const video = formData.get('video')

    if (!video || !(video instanceof File)) {
      return NextResponse.json({ error: 'Missing video file' }, { status: 400 })
    }

    const videoBuffer = Buffer.from(await video.arrayBuffer())

    // Upload to R2
    const uploadResult = await uploadVideoToR2(
      videoBuffer,
      video.name,
      video.type || 'video/mp4'
    )

    if (!uploadResult.success || !uploadResult.key || !uploadResult.url) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload video to R2' },
        { status: 500 }
      )
    }

    // Return the R2 key and URL
    return NextResponse.json({
      success: true,
      videoId: uploadResult.key, // Keep videoId for backward compatibility with frontend
      videoUrl: uploadResult.url,
      key: uploadResult.key,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
