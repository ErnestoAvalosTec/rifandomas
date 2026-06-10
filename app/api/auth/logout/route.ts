import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  await supabase.auth.signOut()

  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host
  const baseUrl = `${proto}://${host}`

  return NextResponse.redirect(new URL('/', baseUrl), { status: 303 })
}
