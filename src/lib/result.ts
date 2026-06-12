export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function err<T>(error: string): ActionResult<T> {
  return { success: false, error }
}

export function unauthorized<T>(): ActionResult<T> {
  return { success: false, error: 'Non authentifié' }
}

export function forbidden<T>(): ActionResult<T> {
  return { success: false, error: 'Accès refusé' }
}
