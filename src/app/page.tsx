'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InvoiceUpload } from '@/components/invoice-upload';
import { DataTable } from '@/components/data-table';
import { InvoiceHistory } from '@/components/invoice-history';
import { MigrationDialog } from '@/components/migration-dialog';
import { extractAndValidateInvoiceAction } from '@/lib/actions';
import { useGoogleAuth } from '@/lib/google-auth';
import {
  saveInvoiceToDrive,
  listAllInvoicesFromDrive,
  deleteInvoiceFromDrive,
} from '@/lib/google-drive';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedInvoice, InvoiceHistoryItem, InvoiceData } from '@/types';
import { Loader2, History, RefreshCcw, CloudOff, LogIn, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AppState = 'idle' | 'loading' | 'success' | 'error' | 'history';
type SyncStatus = 'idle' | 'syncing' | 'saving' | 'synced' | 'error';

export default function Home() {
  const { user, isLoading: authLoading, signIn } = useGoogleAuth();
  const [appState, setAppState] = useState<AppState>('idle');
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[] | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [localItemsForMigration, setLocalItemsForMigration] = useState<InvoiceHistoryItem[]>([]);
  const { toast } = useToast();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from Drive or localStorage
  const loadHistory = useCallback(async () => {
    if (user) {
      setHistoryLoading(true);
      setSyncStatus('syncing');
      try {
        const driveInvoices = await listAllInvoicesFromDrive(user.accessToken);
        setInvoiceHistory(driveInvoices);
        setSyncStatus('synced');
      } catch (error) {
        console.error('Error loading from Drive:', error);
        setSyncStatus('error');
        toast({
          variant: 'destructive',
          title: 'Error al sincronizar con Drive',
          description: 'No se pudieron cargar las facturas. Usando datos locales como respaldo.',
        });
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem('invoiceHistory');
          if (stored) setInvoiceHistory(JSON.parse(stored));
        } catch { /* ignore */ }
      } finally {
        setHistoryLoading(false);
      }
    } else {
      // Not authenticated — use localStorage
      try {
        const stored = localStorage.getItem('invoiceHistory');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (item: any): item is InvoiceHistoryItem => item && Array.isArray(item.invoices)
            );
            setInvoiceHistory(valid);
          }
        }
      } catch (err) {
        console.error('Error reading localStorage:', err);
        localStorage.removeItem('invoiceHistory');
      }
    }
  }, [user, toast]);

  // Initial load
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      loadHistory();
    }
  }, [isClient, authLoading, loadHistory]);

  // Check for local data migration on auth
  useEffect(() => {
    if (user && isClient) {
      const dismissed = localStorage.getItem('migrationDismissed');
      if (dismissed) return;

      try {
        const stored = localStorage.getItem('invoiceHistory');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocalItemsForMigration(parsed);
            setShowMigrationDialog(true);
          }
        }
      } catch { /* ignore */ }
    }
  }, [user, isClient]);

  const handleDataChange = useCallback(async (invoiceIndex: number, newInvoiceData: InvoiceData) => {
    if (!currentHistoryId) return;

    // Update local state immediately for responsiveness
    setInvoiceHistory(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(item => item.id === currentHistoryId);
      if (idx > -1 && updated[idx].invoices[invoiceIndex]) {
        updated[idx] = {
          ...updated[idx],
          invoices: updated[idx].invoices.map((inv, i) =>
            i === invoiceIndex ? { ...inv, data: newInvoiceData } : inv
          ),
        };
      }
      return updated;
    });

    // Debounced save — wait 1.5s after last edit before persisting
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setInvoiceHistory(current => {
        const idx = current.findIndex(item => item.id === currentHistoryId);
        if (idx === -1) return current;
        const item = current[idx];

        if (user) {
          setSyncStatus('saving');
          saveInvoiceToDrive(user.accessToken, item, item.driveFileId)
            .then(() => setSyncStatus('synced'))
            .catch(err => {
              console.error('Error saving to Drive:', err);
              setSyncStatus('error');
            });
        } else {
          localStorage.setItem('invoiceHistory', JSON.stringify(current));
        }
        return current; // no mutation
      });
    }, 1500);
  }, [currentHistoryId, user]);

  const handleProcessInvoices = async (files: File[]) => {
    setAppState('loading');

    const processFile = (file: File): Promise<ProcessedInvoice[] | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const dataUri = reader.result as string;
          try {
            const result = await extractAndValidateInvoiceAction(dataUri);
            if (result.errorMessage || !result.processedInvoices) {
              toast({
                variant: 'destructive',
                title: `Error al procesar ${file.name}`,
                description: result.errorMessage || 'Ocurrió un error desconocido.',
              });
              resolve(null);
            } else {
              resolve(result.processedInvoices);
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
            toast({
              variant: 'destructive',
              title: `Error al procesar ${file.name}`,
              description: errorMessage,
            });
            resolve(null);
          }
        };
        reader.onerror = () => {
          toast({
            variant: 'destructive',
            title: 'Error al Leer el Archivo',
            description: `No se pudo leer el archivo ${file.name}. Por favor, inténtalo de nuevo.`,
          });
          resolve(null);
        };
      });
    };

    const results = await Promise.all(files.map(processFile));
    const successfulResults = results.filter((r): r is ProcessedInvoice[] => r !== null);

    if (successfulResults.length === 0) {
      setAppState('error');
      return;
    }

    const allProcessedInvoices = successfulResults.flat();

    const newHistoryItemId = Date.now().toString();
    const newHistoryItem: InvoiceHistoryItem = {
      id: newHistoryItemId,
      fileName: files.length > 1 ? `${files.length} archivos procesados` : files[0].name,
      processedAt: new Date().toISOString(),
      invoices: allProcessedInvoices,
    };

    // Save to Drive or localStorage
    if (user) {
      setSyncStatus('saving');
      try {
        const driveFileId = await saveInvoiceToDrive(user.accessToken, newHistoryItem);
        newHistoryItem.driveFileId = driveFileId;
        setSyncStatus('synced');
        toast({
          title: '✓ Guardado en Drive',
          description: 'La factura se respaldó en tu Google Drive.',
        });
      } catch (err) {
        console.error('Error saving to Drive:', err);
        setSyncStatus('error');
        toast({
          variant: 'destructive',
          title: 'Error al guardar en Drive',
          description: 'La factura se guardó solo localmente.',
        });
        // Fallback to localStorage
        const fallback = [newHistoryItem, ...invoiceHistory];
        localStorage.setItem('invoiceHistory', JSON.stringify(fallback));
      }
    } else {
      const newHistory = [newHistoryItem, ...invoiceHistory];
      localStorage.setItem('invoiceHistory', JSON.stringify(newHistory));
    }

    const newHistory = [newHistoryItem, ...invoiceHistory];
    setInvoiceHistory(newHistory);
    setProcessedInvoices(allProcessedInvoices);
    setCurrentHistoryId(newHistoryItemId);
    setAppState('success');
  };

  const handleSelectFromHistory = (item: InvoiceHistoryItem) => {
    setProcessedInvoices(item.invoices);
    setCurrentHistoryId(item.id);
    setAppState('success');
  };

  const handleDeleteFromHistory = async (id: string) => {
    const item = invoiceHistory.find(i => i.id === id);

    // Delete from Drive if applicable
    if (user && item?.driveFileId) {
      try {
        await deleteInvoiceFromDrive(user.accessToken, item.driveFileId);
      } catch (err) {
        console.error('Error deleting from Drive:', err);
        toast({
          variant: 'destructive',
          title: 'Error al eliminar de Drive',
          description: 'No se pudo eliminar la factura de Drive.',
        });
        return;
      }
    }

    const newHistory = invoiceHistory.filter(i => i.id !== id);
    setInvoiceHistory(newHistory);

    if (!user) {
      localStorage.setItem('invoiceHistory', JSON.stringify(newHistory));
    }
  };

  // Flush pending save before navigating away from invoice view
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;

      if (currentHistoryId) {
        const item = invoiceHistory.find(i => i.id === currentHistoryId);
        if (item && user) {
          setSyncStatus('saving');
          saveInvoiceToDrive(user.accessToken, item, item.driveFileId)
            .then(() => setSyncStatus('synced'))
            .catch(err => {
              console.error('Error saving to Drive:', err);
              setSyncStatus('error');
            });
        } else if (item && !user) {
          localStorage.setItem('invoiceHistory', JSON.stringify(invoiceHistory));
        }
      }
    }
  }, [currentHistoryId, invoiceHistory, user]);

  const handleStartOver = () => {
    flushSave();
    setProcessedInvoices(null);
    setCurrentHistoryId(null);
    setAppState('idle');
  };

  const handleShowHistory = () => {
    flushSave();
    setAppState('history');
  };

  const handleMigrationComplete = () => {
    setLocalItemsForMigration([]);
    loadHistory();
  };

  const handleMigrationDismiss = () => {
    setLocalItemsForMigration([]);
  };

  // Sync status badge component
  const SyncBadge = () => {
    if (!user) return null;

    const badges: Record<SyncStatus, { label: string; className: string } | null> = {
      idle: null,
      syncing: { label: 'Sincronizando...', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      saving: { label: 'Guardando en Drive...', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
      synced: { label: '✓ Sincronizado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      error: { label: 'Error de sincronización', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    };

    const badge = badges[syncStatus];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-300 ${badge.className}`}>
        {syncStatus === 'syncing' || syncStatus === 'saving' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : null}
        {badge.label}
      </span>
    );
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center gap-6 text-center py-20 animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">Extrayendo datos de sus facturas...</p>
              <p className="mt-1 text-sm text-muted-foreground">La IA está trabajando. Esto puede tomar un momento.</p>
            </div>
          </div>
        );
      case 'success':
        if (processedInvoices) {
          return (
            <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-0 shadow-md bg-gradient-to-r from-card to-card/80">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">Facturas Procesadas</CardTitle>
                        <SyncBadge />
                      </div>
                      <CardDescription className="mt-1">
                        Se encontraron {processedInvoices.length} factura(s). Revisa y edita los datos antes de exportar.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {invoiceHistory.length > 0 && (
                        <Button variant="outline" onClick={handleShowHistory} className="gap-2 shadow-sm">
                          <History className="h-4 w-4" />
                          Historial
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleStartOver} className="gap-2 shadow-sm">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {processedInvoices.map((invoice, index) => (
                <DataTable
                  key={`${currentHistoryId}-${invoice.data.numeroDeFactura || 'invoice'}-${index}`}
                  initialData={invoice.data}
                  initialValidationErrors={invoice.errors}
                  onDataChange={(newData) => handleDataChange(index, newData)}
                />
              ))}
            </div>
          );
        }
        return null;
      case 'history':
        return (
          <InvoiceHistory
            history={invoiceHistory}
            onSelect={handleSelectFromHistory}
            onDelete={handleDeleteFromHistory}
            onGoToUpload={handleStartOver}
            isLoading={historyLoading}
            isCloudMode={!!user}
          />
        );
      case 'idle':
      case 'error':
      default:
        return (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Impulsado por IA
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text">
                PharmaReceipt AI
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Sube tu factura para extraer, verificar y formatear automáticamente los datos de recepción de tus productos farmacéuticos.
              </p>
            </div>

            {/* Auth prompt if not logged in */}
            {isClient && !authLoading && !user && (
              <Card className="mb-6 border-dashed border-primary/30 bg-primary/5">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Accede desde cualquier dispositivo</CardTitle>
                  <CardDescription>
                    Inicia sesión con Google para sincronizar tus facturas en Drive y acceder desde cualquier lugar.
                  </CardDescription>
                  <Button onClick={signIn} className="mt-3 mx-auto gap-2 shadow-sm" size="sm">
                    <LogIn className="h-4 w-4" />
                    Iniciar Sesión con Google
                  </Button>
                </CardHeader>
              </Card>
            )}

            <InvoiceUpload onProcess={handleProcessInvoices} isCloudMode={!!user} />

            {isClient && invoiceHistory.length > 0 && (
              <div className="mt-8 text-center">
                <Button variant="ghost" onClick={handleShowHistory} className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <History className="h-4 w-4" />
                  Ver Historial de Facturas ({invoiceHistory.length})
                </Button>
              </div>
            )}

            {/* Offline indicator */}
            {isClient && !user && invoiceHistory.length > 0 && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CloudOff className="h-3.5 w-3.5" />
                  Modo local — datos guardados solo en este dispositivo
                </span>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="flex w-full items-start justify-center">
          {renderContent()}
        </div>
      </div>

      {/* Migration Dialog */}
      {user && (
        <MigrationDialog
          open={showMigrationDialog}
          onOpenChange={setShowMigrationDialog}
          localItems={localItemsForMigration}
          accessToken={user.accessToken}
          onMigrationComplete={handleMigrationComplete}
          onDismiss={handleMigrationDismiss}
        />
      )}
    </>
  );
}
