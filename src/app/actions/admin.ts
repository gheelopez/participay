'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/error-handler'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// Helper: verify the caller is an admin
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { supabase: null, user: null, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as any)?.role !== 'admin') {
    return { supabase: null, user: null, error: 'Unauthorized: admin access required' }
  }

  return { supabase, user, error: null }
}

// Lightweight check: is the current user still an admin?
export async function checkAdminStatus(): Promise<{ isAdmin: boolean }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { isAdmin: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { isAdmin: (profile as any)?.role === 'admin' }
}

// 1. GET ALL USERS — with post count
export async function getAllUsers(): Promise<ActionResponse<any[]>> {
  try {
    const { supabase, user, error } = await requireAdmin()
    if (error || !supabase || !user) {
      return { success: false, error: error || 'Unauthorized' }
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      logger.error('ADMIN', 'fetch_users_failed', { userId: user.id, details: { error: profilesError.message } })
      return { success: false, error: 'Failed to fetch users' }
    }

    // Fetch post counts per user
    const { data: posts, error: postsError } = await supabase
      .from('research_posts')
      .select('user_id')

    if (postsError) {
      logger.error('ADMIN', 'fetch_post_counts_failed', { userId: user.id, details: { error: postsError.message } })
      return { success: false, error: 'Failed to fetch post counts' }
    }

    // Count posts per user
    const postCounts: Record<string, number> = {}
    for (const post of (posts || [])) {
      postCounts[post.user_id] = (postCounts[post.user_id] || 0) + 1
    }

    // Merge
    const usersWithCounts = (profiles || []).map((p: any) => ({
      ...p,
      post_count: postCounts[p.id] || 0,
    }))

    return { success: true, data: usersWithCounts }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'ADMIN', action: 'fetch_users' }),
    }
  }
}

// 2. DELETE ANY POST — regardless of owner
export async function deleteAnyPost(postId: string): Promise<ActionResponse> {
  try {
    const { supabase, user, error } = await requireAdmin()
    if (error || !supabase || !user) {
      return { success: false, error: error || 'Unauthorized' }
    }

    // Fetch post info for logging
    const { data: post } = await supabase
      .from('research_posts')
      .select('title, user_id')
      .eq('id', postId)
      .single()

    const { error: deleteError } = await supabase
      .from('research_posts')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      logger.error('ADMIN', 'delete_post_failed', {
        userId: user.id,
        details: { postId, error: deleteError.message },
      })
      return { success: false, error: 'Failed to delete post' }
    }

    logger.info('ADMIN', 'post_deleted', {
      userId: user.id,
      details: { postId, postTitle: post?.title, postOwnerId: post?.user_id },
    })

    revalidatePath('/admin')
    revalidatePath('/')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'ADMIN', action: 'delete_post' }),
    }
  }
}

// 3. SET USER ROLE — promote or demote (with last-admin protection)
export async function setUserRole(
  targetUserId: string,
  role: 'user' | 'admin'
): Promise<ActionResponse> {
  try {
    const { supabase, user, error } = await requireAdmin()
    if (error || !supabase || !user) {
      return { success: false, error: error || 'Unauthorized' }
    }

    // Prevent last admin from demoting themselves
    if (role === 'user' && targetUserId === user.id) {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if ((admins || []).length <= 1) {
        logger.warn('ADMIN', 'last_admin_demotion_blocked', { userId: user.id })
        return { success: false, error: 'Cannot demote the last admin account' }
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select('id, role')
      .single()

    if (updateError || !updatedProfile) {
      logger.error('ADMIN', 'set_role_failed', {
        userId: user.id,
        details: { targetUserId, role, error: updateError?.message || 'No rows updated — check RLS policies' },
      })
      return { success: false, error: 'Failed to update user role. Ensure your Supabase RLS policies allow admins to update profiles.' }
    }

    logger.info('ADMIN', 'role_changed', {
      userId: user.id,
      details: { targetUserId, newRole: role },
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'ADMIN', action: 'set_role' }),
    }
  }
}

// 4. SET BAN STATUS — ban or unban
export async function setBanStatus(
  targetUserId: string,
  isBanned: boolean
): Promise<ActionResponse> {
  try {
    const { supabase, user, error } = await requireAdmin()
    if (error || !supabase || !user) {
      return { success: false, error: error || 'Unauthorized' }
    }

    // Prevent admin from banning themselves
    if (targetUserId === user.id) {
      return { success: false, error: 'Cannot change your own ban status' }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select('id, is_banned')
      .single()

    if (updateError || !updatedProfile) {
      logger.error('ADMIN', 'set_ban_failed', {
        userId: user.id,
        details: { targetUserId, isBanned, error: updateError?.message || 'No rows updated — check RLS policies' },
      })
      return { success: false, error: 'Failed to update ban status. Ensure your Supabase RLS policies allow admins to update profiles.' }
    }

    logger.info('ADMIN', isBanned ? 'user_banned' : 'user_unbanned', {
      userId: user.id,
      details: { targetUserId },
    })

    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'ADMIN', action: 'set_ban' }),
    }
  }
}

// 5. GET ALL POSTS — with owner info
export async function getAllPostsAdmin(): Promise<ActionResponse<any[]>> {
  try {
    const { supabase, user, error } = await requireAdmin()
    if (error || !supabase || !user) {
      return { success: false, error: error || 'Unauthorized' }
    }

    const { data, error: fetchError } = await supabase
      .from('research_posts')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error('ADMIN', 'fetch_posts_failed', { userId: user.id, details: { error: fetchError.message } })
      return { success: false, error: 'Failed to fetch posts' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'ADMIN', action: 'fetch_posts' }),
    }
  }
}
