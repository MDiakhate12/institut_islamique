/**
 * PATTERN DE RÉFÉRENCE — Server Action
 * Copier ce pattern pour chaque nouvelle action.
 * Ne jamais s'en écarter sans mettre à jour CLAUDE.md.
 */

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { studentsService } from './students.service'
import type { ActionResult } from '@/lib/result'
import type { StudentType } from './students.types'

// 1. Schéma de validation en entrée
const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female']),
  parentEmail: z.string().email('Email invalide').optional(),
})

type CreateStudentInput = z.infer<typeof createStudentSchema>

// 2. L'action — toujours async, toujours ActionResult<T>
export async function createStudentAction(
  schoolId: string,
  input: CreateStudentInput
): Promise<ActionResult<StudentType>> {
  // 2a. Valider l'input avec Zod
  const parsed = createStudentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0].message,
    }
  }

  // 2b. Appeler le service (jamais Firebase directement ici)
  try {
    const student = await studentsService.create(schoolId, parsed.data)
    
    // 2c. Revalider le cache Next.js si besoin
    revalidatePath(`/admin-portal/students`)
    
    return { success: true, data: student }
  } catch (error) {
    console.error('[createStudentAction]', error)
    return {
      success: false,
      error: 'Impossible de créer l\'élève. Réessayez.',
    }
  }
}
