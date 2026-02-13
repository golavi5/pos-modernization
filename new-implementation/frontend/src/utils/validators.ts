import { z } from 'zod';

/**
 * Common field schemas
 */
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const confirmPasswordSchema = z.string().min(1, 'Please confirm your password');

export const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');

export const phoneSchema = z.string().optional().or(z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'));

/**
 * Auth Schemas
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    name: nameSchema,
    companyName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Utility Schemas
 */
export const dateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * Validate form data
 */
export async function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _root: 'Validation failed' } };
  }
}

/**
 * Create a custom validator
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => validateFormData(schema, data);
}

/**
 * Combine schemas
 */
export function combineSchemas<T extends Record<string, z.ZodTypeAny>>(schemas: T): z.ZodObject<T> {
  return z.object(schemas);
}
