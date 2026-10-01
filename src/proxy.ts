import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessAdminPath } from '@/lib/auth/permissions'
import type { PortalRole, AdminSubRole } from '@/lib/constants'

export async function proxy(request: NextRequest) {
  // Skip si Supabase n'est pas configuré (dev sans env vars)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session — ne pas supprimer ces lignes
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPortalRoute =
    pathname.startsWith('/admin-portal') ||
    pathname.startsWith('/teacher-portal') ||
    pathname.startsWith('/parent-portal')

  if (isPortalRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Sous-rôles admin (trésorier / gestionnaire) : bloque les pages non autorisées.
  // Le layout admin ne se ré-exécute pas lors d'une navigation client → le contrôle
  // par URL doit vivre ici. Les Server Actions ont leur propre garde (canAccess).
  if (user && pathname.startsWith('/admin-portal')) {
    const { data: member } = await supabase
      .from('school_members')
      .select('portal_roles, admin_sub_role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (member) {
      const access = {
        roles: (member.portal_roles ?? []) as PortalRole[],
        adminSubRole: member.admin_sub_role as AdminSubRole | null,
      }
      // Pas de rôle admin → le layout admin redirige déjà vers /teacher-portal
      if (access.roles.includes('admin') && !canAccessAdminPath(access, pathname)) {
        return NextResponse.redirect(new URL('/admin-portal', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
