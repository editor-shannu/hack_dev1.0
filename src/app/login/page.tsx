import { LoginPage } from '@/components/auth/LoginPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login — Prescriptime',
  description: 'Sign in to Prescriptime to manage your digital prescriptions and medicine schedules.',
};

export default function LoginRoute() {
  return <LoginPage />;
}
