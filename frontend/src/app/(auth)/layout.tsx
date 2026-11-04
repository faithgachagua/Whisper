import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-brand-50 to-canvas px-4 py-8">
      <Link href="/" className="mb-6"><Logo /></Link>
      <div className="card w-full max-w-md p-6 sm:p-8">{children}</div>
      <div className="mt-6 flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>
    </main>
  );
}
