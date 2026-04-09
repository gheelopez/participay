'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createResearchPostSchema, updateResearchPostSchema } from '@/lib/validations/research-post'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/error-handler'
import type { CreateResearchPostInput, UpdateResearchPostInput } from '@/lib/validations/research-post'

// Type for our response
type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// 1. FETCH ALL POSTS (Public - anyone can view)
export async function getAllResearchPosts(): Promise<ActionResponse<any[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('research_posts')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          school,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: handleError(error, { category: 'TRANSACTION', action: 'fetch_all_posts_failed' }),
      }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'fetch_all_posts_error' }),
    }
  }
}

// 2. FETCH POSTS BY USER (Get user's own posts)
export async function getUserResearchPosts(): Promise<ActionResponse<any[]>> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('research_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: handleError(error, { category: 'TRANSACTION', action: 'fetch_user_posts_failed' }),
      }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'fetch_user_posts_error' }),
    }
  }
}

// 3. FETCH SINGLE POST (Public)
export async function getResearchPostById(id: string): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('research_posts')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          school,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      return {
        success: false,
        error: handleError(error, { category: 'TRANSACTION', action: 'fetch_post_failed' }),
      }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'fetch_post_error' }),
    }
  }
}

// 4. CREATE POST (Authenticated users only)
export async function createResearchPost(input: CreateResearchPostInput): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in to create a post' }
    }

    // Validate input
    const validation = createResearchPostSchema.safeParse(input)
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.issues[0].message 
      }
    }

    // Insert post (RLS policy ensures user_id matches auth.uid())
    const { data, error } = await supabase
      .from('research_posts')
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('TRANSACTION', 'study_create_failed', { userId: user.id, details: { error: error.message } })
      return { success: false, error: 'Failed to create post' }
    }

    logger.info('TRANSACTION', 'study_created', { userId: user.id, details: { postId: data.id, title: data.title } })

    // Revalidate the home page and dashboard to show new post
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'study_create' }),
    }
  }
}

// 5. UPDATE POST (Owner only - RLS enforces this)
export async function updateResearchPost(
  id: string, 
  input: UpdateResearchPostInput
): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate input
    const validation = updateResearchPostSchema.safeParse(input)
    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.issues[0].message 
      }
    }

    // Update post (RLS policy ensures only owner can update)
    const { data, error } = await supabase
      .from('research_posts')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('TRANSACTION', 'study_edit_failed', { userId: user.id, details: { postId: id, error: error.message } })

      // Check if it's a permission error
      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to update this post' }
      }

      return { success: false, error: 'Failed to update post' }
    }

    logger.info('TRANSACTION', 'study_edited', { userId: user.id, details: { postId: id } })

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'study_edit' }),
    }
  }
}

// 6. DELETE POST (Owner only - RLS enforces this)
export async function deleteResearchPost(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Delete post (RLS policy ensures only owner can delete)
    const { error } = await supabase
      .from('research_posts')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('TRANSACTION', 'study_delete_failed', { userId: user.id, details: { postId: id, error: error.message } })

      // Check if it's a permission error
      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to delete this post' }
      }

      return { success: false, error: 'Failed to delete post' }
    }

    logger.info('TRANSACTION', 'study_deleted', { userId: user.id, details: { postId: id } })

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'study_delete' }),
    }
  }
}

// 7. TOGGLE POST STATUS (Owner only - open/closed)
export async function togglePostStatus(id: string, isOpen: boolean): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
    }

    // Update status (RLS policy ensures only owner can update)
    const { data, error } = await supabase
      .from('research_posts')
      .update({ is_open: isOpen })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('TRANSACTION', 'study_toggle_failed', { userId: user.id, details: { postId: id, error: error.message } })

      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to update this post' }
      }

      return { success: false, error: 'Failed to update post status' }
    }

    logger.info('TRANSACTION', 'study_toggled', { userId: user.id, details: { postId: id, isOpen } })

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, { category: 'TRANSACTION', action: 'study_toggle' }),
    }
  }
}