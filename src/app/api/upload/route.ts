import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { supabaseServer } from '@/lib/supabase-server'

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

function extractYouTubeVideoId(url: string) {
  if (!url) return null

  const regex = /(?:https?:\/\/)?(?:www\.)?(?:(?:youtube\.com\/watch\?v=)|(?:youtube\.com\/embed\/)|(?:youtu\.be\/))([A-Za-z0-9_-]{11})/i
  const match = url.match(regex)
  return match?.[1] ?? null
}

function extractYouTubeVideoIdFromMarkdown(markdown: string) {
  if (!markdown) return null

  const urlMatch = markdown.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([A-Za-z0-9_-]{11})/i)
  return urlMatch?.[1] ?? null
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const markdown = formData.get('markdown') ?? formData.get('description')
    const title = (formData.get('title') as string) || ''
    const tag = ((formData.get('tag') as string) || 'new').trim() || 'new'
    const author = ((formData.get('author') as string) || 'Ikmal Najmi').trim() || 'Ikmal Najmi'
    const group_name = (formData.get('group_name') as string) || ''

    let markdownText = ''

    if (markdown instanceof File) {
      markdownText = await markdown.text()
    } else if (typeof markdown === 'string') {
      markdownText = markdown
    } else if (markdown === null) {
      markdownText = ''
    } else {
      return NextResponse.json({ error: 'Invalid description content' }, { status: 400 })
    }

    markdownText = markdownText.trim()

    if (!title.trim()) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    let dbError: any = null
    
    // First attempt: try with all columns
    const insertWithAll = await supabaseServer
      .from('posts')
      .insert({
        title: title.trim(),
        content_path: markdownText,
        tag,
        author,
        group_name: group_name || null,
      })

    if (insertWithAll.error) {
      const isMissingGroupColumn =
        typeof insertWithAll.error.message === 'string' &&
        insertWithAll.error.message.toLowerCase().includes('column') &&
        insertWithAll.error.message.toLowerCase().includes('group_name')

      if (isMissingGroupColumn) {
        // Fallback: Try without group_name
        const insertWithOthers = await supabaseServer
          .from('posts')
          .insert({
            title: title.trim(),
            content_path: markdownText,
            tag,
            author,
          })
        
        if (insertWithOthers.error) {
          const isMissingAuthorOrTag =
            typeof insertWithOthers.error.message === 'string' &&
            insertWithOthers.error.message.toLowerCase().includes('column')
          
          if (isMissingAuthorOrTag) {
            // Fallback 1: try without author
            const insertWithoutAuthor = await supabaseServer
              .from('posts')
              .insert({
                title: title.trim(),
                content_path: markdownText,
                tag,
              })
            
            if (insertWithoutAuthor.error && insertWithoutAuthor.error.message.toLowerCase().includes('tag')) {
              // Fallback 2: try without tag as well
              const insertBasic = await supabaseServer
                .from('posts')
                .insert({
                  title: title.trim(),
                  content_path: markdownText,
                })
              dbError = insertBasic.error
            } else {
              dbError = insertWithoutAuthor.error
            }
          } else {
            dbError = insertWithOthers.error
          }
        }
      } else {
        dbError = insertWithAll.error
      }
    }

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      success: true,
      content_path: markdownText,
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}