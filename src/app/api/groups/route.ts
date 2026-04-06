import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // First try to get from groups table
    const { data: groups, error: groupsError } = await supabaseServer
      .from('groups')
      .select('*')
      .order('name')
    
    if (!groupsError && groups) {
      // Get post counts for each group, excluding system posts
      const { data: postsWithGroups } = await supabaseServer
        .from('posts')
        .select('group_name')
        .not('group_name', 'is', null)
        .not('tag', 'eq', 'system')
        .not('title', 'like', '__GROUP_MARKER__%')
      
      const groupsWithCounts = groups.map(group => ({
        name: group.name,
        post_count: postsWithGroups?.filter(p => p.group_name === group.name).length ?? 0
      }))
      
      return NextResponse.json(groupsWithCounts)
    }
    
    // Fallback: get groups from posts table AND from system markers
    const { data: postsWithGroups } = await supabaseServer
      .from('posts')
      .select('group_name, title, tag')
      .or('group_name.not.is.null,tag.eq.system')
    
    // Get regular groups from posts
    const groupsFromPosts = Array.from(new Set(
      postsWithGroups?.map(p => p.group_name).filter(Boolean) ?? []
    ))
    
    // Get groups from system markers (but exclude the marker posts themselves)
    const groupsFromMarkers = Array.from(new Set(
      postsWithGroups
        ?.filter(p => p.tag === 'system' && p.title?.startsWith('__GROUP_MARKER__'))
        ?.map(p => p.title?.replace('__GROUP_MARKER__', '')) 
        ?? []
    ))
    
    // Combine and deduplicate
    const allGroupNames = Array.from(new Set([...groupsFromPosts, ...groupsFromMarkers]))
    
    // Count posts for each group, excluding system posts
    const allGroups = allGroupNames.map(name => ({
      name,
      post_count: postsWithGroups?.filter(p => p.group_name === name && p.tag !== 'system' && !p.title?.startsWith('__GROUP_MARKER__')).length ?? 0
    }))
    
    return NextResponse.json(allGroups)
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()
    
    // Try to insert into groups table first
    const { data: groupData, error: insertError } = await supabaseServer
      .from('groups')
      .insert({ name: trimmedName })
      .select()
      .single()
    
    if (!insertError && groupData) {
      return NextResponse.json({ 
        message: 'Group created successfully',
        name: trimmedName
      }, { status: 201 })
    }
    
    // If groups table doesn't exist, create a system marker post
    if (insertError?.message?.includes('relation') || 
        insertError?.message?.includes('Could not find the table') || 
        insertError?.code === 'PGRST116') {
      
      const { error: fallbackError } = await supabaseServer
        .from('posts')
        .insert({ 
          title: `__GROUP_MARKER__${trimmedName}`,
          content_path: null,
          tag: 'system'
        })
      
      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        message: 'Group created successfully',
        name: trimmedName
      }, { status: 201 })
    }
    
    // Handle duplicate group error
    if (insertError?.code === '23505') {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 })
    }
    
    // Fallback: check if group exists in posts table
    const { data: existingPosts } = await supabaseServer
      .from('posts')
      .select('group_name, title, tag')
      .or(`group_name.eq.${trimmedName},tag.eq.system,title.eq.__GROUP_MARKER__${trimmedName}`)
      .limit(1)

    if (existingPosts && existingPosts.length > 0) {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 })
    }

    return NextResponse.json({ 
      message: 'Group created successfully',
      name: trimmedName
    }, { status: 201 })

  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const groupName = url.searchParams.get('name')
    const { newName } = await request.json()

    if (!groupName) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return NextResponse.json({ error: 'New group name is required' }, { status: 400 })
    }

    const trimmedNewName = newName.trim()
    const decodedGroupName = decodeURIComponent(groupName)

    if (trimmedNewName === decodedGroupName) {
      return NextResponse.json({
        message: 'Group name unchanged',
        oldName: decodedGroupName,
        newName: trimmedNewName,
        renamedCounts: {
          groupsTable: 0,
          markerPosts: 0,
          contentPosts: 0,
        },
      })
    }

    // Check if new name already exists in groups table.
    const { data: existingGroup, error: existingGroupError } = await supabaseServer
      .from('groups')
      .select('name')
      .eq('name', trimmedNewName)
      .maybeSingle()

    if (!existingGroupError && existingGroup) {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 409 })
    }

    // Check if new name already exists in regular posts.
    const { data: existingPosts } = await supabaseServer
      .from('posts')
      .select('group_name')
      .eq('group_name', trimmedNewName)
      .limit(1)

    if (existingPosts && existingPosts.length > 0) {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 409 })
    }

    // Check if new name already exists as a fallback marker.
    const { data: existingMarker } = await supabaseServer
      .from('posts')
      .select('id')
      .eq('title', `__GROUP_MARKER__${trimmedNewName}`)
      .eq('tag', 'system')
      .limit(1)

    if (existingMarker && existingMarker.length > 0) {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 409 })
    }

    // Rename in groups table when present.
    const { data: renamedGroups, error: groupRenameError } = await supabaseServer
      .from('groups')
      .update({ name: trimmedNewName })
      .eq('name', decodedGroupName)
      .select('name')

    if (groupRenameError &&
      !groupRenameError.message?.includes('relation') &&
      !groupRenameError.message?.includes('Could not find the table') &&
      groupRenameError.code !== 'PGRST116'
    ) {
      console.error('Rename group table entry error:', groupRenameError)
      return NextResponse.json({ error: 'Failed to rename group' }, { status: 500 })
    }

    // Rename system marker in fallback model.
    const { data: renamedMarkers, error: markerRenameError } = await supabaseServer
      .from('posts')
      .update({ title: `__GROUP_MARKER__${trimmedNewName}` })
      .eq('title', `__GROUP_MARKER__${decodedGroupName}`)
      .eq('tag', 'system')
      .select('id')

    if (markerRenameError) {
      console.error('Rename marker post error:', markerRenameError)
      return NextResponse.json({ error: 'Failed to rename group' }, { status: 500 })
    }

    // Update all regular posts with this group name.
    const { data: renamedPosts, error: postsRenameError } = await supabaseServer
      .from('posts')
      .update({ group_name: trimmedNewName })
      .eq('group_name', decodedGroupName)
      .select('id')

    if (postsRenameError) {
      console.error('Rename group posts error:', postsRenameError)
      return NextResponse.json({ error: 'Failed to rename group' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Group renamed successfully',
      oldName: decodedGroupName,
      newName: trimmedNewName,
      renamedCounts: {
        groupsTable: renamedGroups?.length ?? 0,
        markerPosts: renamedMarkers?.length ?? 0,
        contentPosts: renamedPosts?.length ?? 0,
      },
    })

  } catch (error) {
    console.error('Rename group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
