import { db } from '@/db'
import { classCatalog } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import type { CreateCatalogClassInput, UpdateCatalogClassInput } from './classes.schema'
import type { CatalogClass, CatalogClassWithNext } from './classes.types'

export const catalogClassesService = {
  // READ — toutes les classes du catalogue (global, sans school_id)
  async getAll(): Promise<CatalogClassWithNext[]> {
    const rows = await db
      .select()
      .from(classCatalog)
      .orderBy(asc(classCatalog.subjectCode), asc(classCatalog.levelNumber))

    // Résoudre les noms des classes suivantes en mémoire
    const byId = new Map(rows.map(r => [r.id, r]))

    return rows.map(r => ({
      ...r,
      nextClassName: r.nextClassId ? (byId.get(r.nextClassId)?.name ?? null) : null,
      nextClassCode: r.nextClassId ? (byId.get(r.nextClassId)?.code ?? null) : null,
    }))
  },

  async getById(id: string): Promise<CatalogClass | null> {
    const [row] = await db
      .select()
      .from(classCatalog)
      .where(eq(classCatalog.id, id))
      .limit(1)
    return row ?? null
  },

  async create(data: CreateCatalogClassInput): Promise<CatalogClass> {
    const code = data.levelNumber
      ? `${data.subjectCode}-${data.levelNumber}`
      : data.subjectCode

    const [row] = await db
      .insert(classCatalog)
      .values({
        code,
        subjectCode:  data.subjectCode,
        levelNumber:  data.levelNumber ?? null,
        name:         data.name,
        nextClassId:  data.nextClassId ?? null,
        curriculum:   data.curriculum  ?? null,
      })
      .returning()
    return row
  },

  async update(id: string, data: UpdateCatalogClassInput): Promise<CatalogClass> {
    // Recalculate code if subject or level changed
    const existing = await this.getById(id)
    const subjectCode = data.subjectCode ?? existing?.subjectCode ?? ''
    const levelNumber = data.levelNumber !== undefined ? data.levelNumber : existing?.levelNumber

    const code = levelNumber
      ? `${subjectCode}-${levelNumber}`
      : subjectCode

    const [row] = await db
      .update(classCatalog)
      .set({
        code,
        ...(data.subjectCode  !== undefined && { subjectCode: data.subjectCode }),
        ...(data.levelNumber  !== undefined && { levelNumber: data.levelNumber ?? null }),
        ...(data.name         !== undefined && { name: data.name }),
        ...(data.nextClassId  !== undefined && { nextClassId: data.nextClassId ?? null }),
        ...(data.curriculum   !== undefined && { curriculum: data.curriculum ?? null }),
        updatedAt: new Date(),
      })
      .where(eq(classCatalog.id, id))
      .returning()
    return row
  },

  async delete(id: string): Promise<void> {
    await db.delete(classCatalog).where(eq(classCatalog.id, id))
  },
}
