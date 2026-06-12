/**
 * PATTERN DE RÉFÉRENCE — Service Firebase
 * SEUL endroit où Firestore est appelé pour un module.
 * Jamais d'appel Firebase ailleurs (composants, hooks, actions directement).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { adminDb } from '@/lib/firebase/admin'  // Server-side uniquement
import type { StudentType } from './students.types'
import type { CreateStudentInput } from './students.schema'

// Chemin collection — toujours préfixé par schoolId
const studentsCol = (schoolId: string) =>
  `schools/${schoolId}/students`

export const studentsService = {
  // READ — liste
  async getBySchool(schoolId: string): Promise<StudentType[]> {
    const snapshot = await adminDb
      .collection(studentsCol(schoolId))
      .orderBy('lastName')
      .get()
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as StudentType[]
  },

  // READ — un seul
  async getById(schoolId: string, studentId: string): Promise<StudentType | null> {
    const docRef = adminDb.doc(`${studentsCol(schoolId)}/${studentId}`)
    const snapshot = await docRef.get()
    
    if (!snapshot.exists) return null
    return { id: snapshot.id, ...snapshot.data() } as StudentType
  },

  // CREATE
  async create(schoolId: string, data: CreateStudentInput): Promise<StudentType> {
    const now = Timestamp.now()
    const docRef = await adminDb.collection(studentsCol(schoolId)).add({
      ...data,
      schoolId,
      createdAt: now,
      updatedAt: now,
    })
    
    const created = await docRef.get()
    return { id: created.id, ...created.data() } as StudentType
  },

  // UPDATE
  async update(
    schoolId: string,
    studentId: string,
    data: Partial<StudentType>
  ): Promise<void> {
    const docRef = adminDb.doc(`${studentsCol(schoolId)}/${studentId}`)
    await docRef.update({
      ...data,
      updatedAt: Timestamp.now(),
    })
  },

  // DELETE
  async delete(schoolId: string, studentId: string): Promise<void> {
    const docRef = adminDb.doc(`${studentsCol(schoolId)}/${studentId}`)
    await docRef.delete()
  },
}
