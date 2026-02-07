import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50">
        <p>© 2026 FamilyTech Sandbox. Made with ❤️ for families everywhere.</p>
      </footer>
    </div>
  );
}
