// src/app/api/workspace/invite/route.ts
import { clerkClient } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, workspace_id: workspaceId, role } = await req.json()

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  const clerk = await clerkClient()
  const users = await clerk.users.getUserList({ emailAddress: [email] })

  if (!users.data.length) {
    return NextResponse.json(
      { error: 'No user found with that email. They need to sign up first.' },
      { status: 404 }
    )
  }

  const clerkUser = users.data[0]

  const supabase = createServerSupabaseClient()

  // Upsert user in case webhook missed them
  await supabase.from('users').upsert({
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0].emailAddress,
    full_name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
    avatar_url: clerkUser.imageUrl,
  }, { onConflict: 'id' })

  // Add to workspace
  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: clerkUser.id,
    role: role ?? 'member',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ✅ Fetch workspace name for the notification message
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  // ✅ Insert notification for the invited user
  await supabase.from('notifications').insert({
    user_id: clerkUser.id,
    workspace_id: workspaceId,
    type: 'workspace_invite',
    message: `You've been added to workspace "${workspace?.name ?? 'a workspace'}"`,
    read: false,
  })

  return NextResponse.json({ success: true })
}