import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { supabaseServer } from '@/lib/supabase-server'
import fs from 'fs'
import path from 'path'
import os from 'os'

// OAuth client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.YT_CLIENT_ID,
  process.env.YT_CLIENT_SECRET,
  'http://localhost:3000/api/auth/callback/google'
)

oauth2Client.setCredentials({
  refresh_token: process.env.YT_REFRESH_TOKEN,
})

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client,
})
export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const video = formData.get('video')
    const markdown = formData.get('markdown')
    const title = formData.get('title') as string

    if (!(video instanceof File) || !(markdown instanceof File) || !title) {
      return NextResponse.json(
        { error: 'Missing video, markdown, or title' },
        { status: 400 }
      )
    }

    // ✅ Upload video to YouTube
    const videoBuffer = Buffer.from(await video.arrayBuffer())
    const videoStream = Readable.from(videoBuffer)

    const youtubeRes = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: 'Uploaded via Video CMS',
        },
        status: {
          privacyStatus: 'unlisted',
        },
      },
      media: {
        body: videoStream,
      },
    })

    const videoId = youtubeRes.data.id
    if (!videoId) {
      throw new Error('YouTube upload failed')
    }

    // ✅ Upload markdown to Supabase Storage
    const markdownPath = `posts/${crypto.randomUUID()}.md`
    const markdownBuffer = Buffer.from(await markdown.arrayBuffer())

    const { error: storageError } = await supabaseServer.storage
      .from('markdown-files')
      .upload(markdownPath, markdownBuffer, {
        contentType: 'text/markdown',
      })

    if (storageError) {
      throw storageError
    }

    // ✅ Insert DB record
    const { error: dbError } = await supabaseServer
      .from('posts')
      .insert({
        title,
        content_path: markdownPath,
        youtube_video_id: videoId,
      })

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      success: true,
      videoId,
      content_path: markdownPath,
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}