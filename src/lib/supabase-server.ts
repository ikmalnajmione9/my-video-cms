import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create client with empty strings if env vars aren't set
// Errors will occur at runtime when trying to use the client without proper env vars
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey)
