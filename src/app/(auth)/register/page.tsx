import { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Register | ParticiPay',
  description: 'Create your ParticiPay account',
}

export default function RegisterPage() {
  return <RegisterForm />
}
