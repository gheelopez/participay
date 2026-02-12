import { z } from 'zod'

// Schema for creating a new research post
export const createResearchPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description is too long'),
  registration_link: z.url('Must be a valid URL'),
  compensation_type: z.enum(['food', 'money', 'both', 'none'], {
    error: 'Invalid compensation type'
  }),
  compensation_details: z.string().max(500, 'Compensation details are too long').optional().nullable(),
})

// Schema for updating a research post
export const updateResearchPostSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(2000).optional(),
  registration_link: z.url().optional(),
  compensation_type: z.enum(['food', 'money', 'both', 'none']).optional(),
  compensation_details: z.string().max(500).optional().nullable(),
  is_open: z.boolean().optional(),
})

export type CreateResearchPostInput = z.infer<typeof createResearchPostSchema>
export type UpdateResearchPostInput = z.infer<typeof updateResearchPostSchema>