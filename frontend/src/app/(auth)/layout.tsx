import { AnimatedBackdrop, HeroCopy } from '@/components/auth';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AnimatedBackdrop />
      <div className="absolute right-5 top-5 z-20"><LanguageToggle /></div>
      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <HeroCopy />
        <div className="glass animate-slide-in w-full max-w-md justify-self-center rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 lg:justify-self-end">
          {children}
        </div>
      </div>
    </main>
  );
}
