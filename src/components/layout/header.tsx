'use client';

import { Pill, LogIn, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useGoogleAuth } from '@/lib/google-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isLoading, signIn, signOut } = useGoogleAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold transition-opacity hover:opacity-80" aria-label="PharmaReceipt AI Inicio">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PharmaReceipt AI</span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center gap-2.5 rounded-full pl-2 pr-3 py-1.5 h-auto hover:bg-muted/80 transition-all duration-200">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium max-w-[150px] truncate">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 overflow-hidden">
                      <p className="text-sm font-semibold leading-none truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground leading-none truncate">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={signIn} size="sm" className="gap-2 transition-all duration-200 shadow-sm hover:shadow-md">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
