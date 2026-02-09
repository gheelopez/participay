'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createResearchPostSchema, updateResearchPostSchema } from '@/lib/validations/research-post'
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
      console.error('Error fetching posts:', error)
      return { success: false, error: 'Failed to fetch research posts' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
      console.error('Error fetching user posts:', error)
      return { success: false, error: 'Failed to fetch your posts' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
      console.error('Error fetching post:', error)
      return { success: false, error: 'Post not found' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
        error: validation.error.errors[0].message 
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
      console.error('Error creating post:', error)
      return { success: false, error: 'Failed to create post' }
    }

    // Revalidate the home page and dashboard to show new post
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
        error: validation.error.errors[0].message 
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
      console.error('Error updating post:', error)
      
      // Check if it's a permission error
      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to update this post' }
      }
      
      return { success: false, error: 'Failed to update post' }
    }

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
      console.error('Error deleting post:', error)
      
      // Check if it's a permission error
      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to delete this post' }
      }
      
      return { success: false, error: 'Failed to delete post' }
    }

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
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
      console.error('Error toggling status:', error)
      
      if (error.code === 'PGRST116') {
        return { success: false, error: 'You do not have permission to update this post' }
      }
      
      return { success: false, error: 'Failed to update post status' }
    }

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/dashboard')

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}