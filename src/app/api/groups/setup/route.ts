import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST() {
  try {
    // Create groups table using SQL
    const { error } = await supabaseServer.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
      `
    })

    if (error) {
      console.error('Setup error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Migrate existing groups from posts
    await supabaseServer.rpc('exec', {
      sql: `
        INSERT INTO groups (name)
        SELECT DISTINCT group_name 
        FROM posts 
        WHERE group_name IS NOT NULL AND group_name != ''
        ON CONFLICT (name) DO NOTHING;
      `
    })

    return NextResponse.json({ message: 'Groups table created successfully' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
