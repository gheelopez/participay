import { z } from 'zod'

// Schema for creating a new research post
export const createResearchPostSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long'),
    description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description is too long'),
    registration_link: z.url('Must be a valid URL'),
    compensation_type: z.enum(['food', 'money', 'both', 'none'], {
      error: 'Invalid compensation type'
    }),
    compensation_details: z.string().max(500, 'Compensation details are too long').optional().nullable(),
    compensation_amount: z.number().int('Must be a whole number').min(0, 'Amount cannot be negative').optional().nullable(),
    participants_needed: z.number().int('Must be a whole number').min(1, 'At least 1 participant is required'),
  })
  .superRefine((data, ctx) => {
    const requiresAmount =
      data.compensation_type === 'money' || data.compensation_type === 'both'
    if (requiresAmount && (data.compensation_amount == null || data.compensation_amount <= 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['compensation_amount'],
        message: 'Amount must be greater than 0',
      })
    }
  })

// Schema for updating a research post
export const updateResearchPostSchema = z
  .object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(20).max(2000).optional(),
    registration_link: z.url().optional(),
    compensation_type: z.enum(['food', 'money', 'both', 'none']).optional(),
    compensation_details: z.string().max(500).optional().nullable(),
    compensation_amount: z.number().int().min(0).optional().nullable(),
    participants_needed: z.number().int().min(1).optional(),
    is_open: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const requiresAmount =
      data.compensation_type === 'money' || data.compensation_type === 'both'
    if (requiresAmount && (data.compensation_amount == null || data.compensation_amount <= 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['compensation_amount'],
        message: 'Amount must be greater than 0',
      })
    }
  })

export type CreateResearchPostInput = z.infer<typeof createResearchPostSchema>
export type UpdateResearchPostInput = z.infer<typeof updateResearchPostSchema>