import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const publicPaths = [
    '/login',
    '/login/forgot-password',
    '/login/reset-password',
    '/auth/confirm',
    '/auth/recovery',
  ]
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user) {
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Authenticated but not an allowed admin — still allow password reset in progress.
  if (!isAdminEmail(user.email)) {
    if (pathname === '/login/reset-password') {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(url)
  }

  // Authenticated admin visiting /login → send to dashboard (except password reset)
  if (pathname.startsWith('/login') && pathname !== '/login/reset-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.delete('error')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|password-reset.html).*)'],
}
