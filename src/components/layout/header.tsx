import { Pill } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold" aria-label="PharmaReceipt AI Inicio">
          <Pill className="h-6 w-6 text-primary" />
          <span className="text-lg">PharmaReceipt AI</span>
        </Link>
      </div>
    </header>
  );
}
