import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Login | ParticiPay',
  description: 'Sign in to your ParticiPay account',
}

export default function LoginPage() {
  return <LoginForm />
}
