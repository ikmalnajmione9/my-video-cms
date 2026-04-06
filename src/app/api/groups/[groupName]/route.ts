import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const groupName = pathSegments[pathSegments.length - 1]

    if (!groupName || groupName === 'groups') {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const decodedGroupName = decodeURIComponent(groupName)
    
    // Try to delete from groups table first
    const { error: deleteError } = await supabaseServer
      .from('groups')
      .delete()
      .eq('name', decodedGroupName)
    
    if (!deleteError) {
      // Also remove group from all posts that have this group
      await supabaseServer
        .from('posts')
        .update({ group_name: null })
        .eq('group_name', decodedGroupName)
      
      // Also delete the system marker post if it exists
      await supabaseServer
        .from('posts')
        .delete()
        .eq('title', `__GROUP_MARKER__${decodedGroupName}`)
        .eq('tag', 'system')
      
      return NextResponse.json({ 
        message: 'Group deleted successfully'
      })
    }
    
    // If groups table doesn't exist, just remove group from posts
    if (deleteError?.message?.includes('relation') || 
        deleteError?.message?.includes('Could not find the table') || 
        deleteError?.code === 'PGRST116') {
      
      const { error } = await supabaseServer
        .from('posts')
        .update({ group_name: null })
        .eq('group_name', decodedGroupName)

      if (error) {
        console.error('Delete group error:', error)
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
      }

      // Also delete the system marker post if it exists
      await supabaseServer
        .from('posts')
        .delete()
        .eq('title', `__GROUP_MARKER__${decodedGroupName}`)
        .eq('tag', 'system')

      return NextResponse.json({ 
        message: 'Group deleted successfully'
      })
    }
    
    // Fallback: just remove group from posts
    const { error } = await supabaseServer
      .from('posts')
      .update({ group_name: null })
      .eq('group_name', decodedGroupName)

    if (error) {
      console.error('Delete group error:', error)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    // Also delete the system marker post if it exists
    await supabaseServer
      .from('posts')
      .delete()
      .eq('title', `__GROUP_MARKER__${decodedGroupName}`)
      .eq('tag', 'system')

    return NextResponse.json({ 
      message: 'Group deleted successfully'
    })

  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
