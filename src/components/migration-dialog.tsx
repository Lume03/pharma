'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { CloudUpload, CheckCircle2, XCircle } from 'lucide-react';
import { saveInvoiceToDrive } from '@/lib/google-drive';
import type { InvoiceHistoryItem } from '@/types';

interface MigrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    localItems: InvoiceHistoryItem[];
    accessToken: string;
    onMigrationComplete: () => void;
    onDismiss: () => void;
}

type MigrationStatus = 'prompt' | 'migrating' | 'success' | 'error';

export function MigrationDialog({
    open,
    onOpenChange,
    localItems,
    accessToken,
    onMigrationComplete,
    onDismiss,
}: MigrationDialogProps) {
    const [status, setStatus] = useState<MigrationStatus>('prompt');
    const [progress, setProgress] = useState(0);
    const [currentItem, setCurrentItem] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const totalItems = localItems.length;

    const handleMigrate = async () => {
        setStatus('migrating');
        setProgress(0);
        setCurrentItem(0);

        try {
            for (let i = 0; i < localItems.length; i++) {
                setCurrentItem(i + 1);
                await saveInvoiceToDrive(accessToken, localItems[i]);
                setProgress(Math.round(((i + 1) / totalItems) * 100));
            }

            // Clear localStorage after successful migration
            localStorage.removeItem('invoiceHistory');
            setStatus('success');

            // Auto-close after a short delay
            setTimeout(() => {
                onOpenChange(false);
                onMigrationComplete();
            }, 2000);
        } catch (err) {
            console.error('Migration error:', err);
            setErrorMessage(err instanceof Error ? err.message : 'Error desconocido durante la migración.');
            setStatus('error');
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('migrationDismissed', 'true');
        onOpenChange(false);
        onDismiss();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-md">
                {status === 'prompt' && (
                    <>
                        <AlertDialogHeader>
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <CloudUpload className="h-7 w-7 text-primary" />
                            </div>
                            <AlertDialogTitle className="text-center">
                                Facturas locales detectadas
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                Hemos encontrado <strong>{totalItems} factura(s)</strong> guardadas en este dispositivo.
                                ¿Deseas respaldarlas en tu Google Drive para acceder desde cualquier lugar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="sm:justify-center gap-2">
                            <AlertDialogCancel onClick={handleDismiss}>
                                No, gracias
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleMigrate}>
                                <CloudUpload className="mr-2 h-4 w-4" />
                                Respaldar en Drive
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}

                {status === 'migrating' && (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-center">
                                Migrando facturas a Drive...
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                Subiendo {currentItem} de {totalItems}...
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4 px-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center mt-2">{progress}% completado</p>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <AlertDialogHeader>
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                            </div>
                            <AlertDialogTitle className="text-center">
                                ¡Migración completada!
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                Todas tus facturas han sido respaldadas en Google Drive exitosamente.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertDialogHeader>
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                                <XCircle className="h-7 w-7 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-center">
                                Error en la migración
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                {errorMessage || 'Ocurrió un error al migrar las facturas. Inténtalo de nuevo.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="sm:justify-center gap-2">
                            <AlertDialogCancel onClick={() => onOpenChange(false)}>
                                Cerrar
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleMigrate}>
                                Reintentar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
}
