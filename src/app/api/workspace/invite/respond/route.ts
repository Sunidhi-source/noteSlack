import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId, action } = await req.json()

  if (!notificationId || !['accepted', 'declined'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Fetch the notification to get workspace_id
  const { data: notif, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', userId)
    .single()

  if (notifError || !notif) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  if (notif.status !== 'pending') {
    return NextResponse.json({ error: 'Invite already responded to' }, { status: 400 })
  }

  // Mark notification as read + update status
  await supabase
    .from('notifications')
    .update({ read: true, status: action })
    .eq('id', notificationId)

  // If accepted, add to workspace_members
  if (action === 'accepted') {
    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: notif.workspace_id,
      user_id: userId,
      role: 'member',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, action })
}