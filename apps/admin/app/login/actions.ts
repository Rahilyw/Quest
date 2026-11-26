'use server'

import { createServerClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut()
    return { error: 'Access denied. Contact the Quest! team.' }
  }

  redirect('/')
}
