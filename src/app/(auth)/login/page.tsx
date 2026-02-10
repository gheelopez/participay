import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Login | Participay',
  description: 'Sign in to your Participay account',
}

export default function LoginPage() {
  return <LoginForm />
}
