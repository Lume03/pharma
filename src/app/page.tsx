'use client';

import { useState, useEffect } from 'react';
import { InvoiceUpload } from '@/components/invoice-upload';
import { DataTable } from '@/components/data-table';
import { InvoiceHistory } from '@/components/invoice-history';
import { extractAndValidateInvoiceAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { ProcessedInvoice, InvoiceHistoryItem } from '@/types';
import { Loader2, History, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AppState = 'idle' | 'loading' | 'success' | 'error' | 'history';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [processedInvoices, setProcessedInvoices] = useState<ProcessedInvoice[] | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    try {
      const storedHistory = localStorage.getItem('invoiceHistory');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          const validHistory = parsedHistory.filter(
            (item): item is InvoiceHistoryItem => item && Array.isArray(item.invoices)
          );
          setInvoiceHistory(validHistory);
          if (validHistory.length !== parsedHistory.length) {
            localStorage.setItem('invoiceHistory', JSON.stringify(validHistory));
          }
        }
      }
    } catch (error) {
      console.error("Error al analizar el historial de facturas desde localStorage", error);
      localStorage.removeItem('invoiceHistory');
    }
  }, []);

  const updateHistory = (newHistory: InvoiceHistoryItem[]) => {
    setInvoiceHistory(newHistory);
    localStorage.setItem('invoiceHistory', JSON.stringify(newHistory));
  };

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

    const newHistoryItem: InvoiceHistoryItem = {
        id: Date.now().toString(),
        fileName: files.length > 1 ? `${files.length} archivos procesados` : files[0].name,
        processedAt: new Date().toISOString(),
        invoices: allProcessedInvoices,
    };
    updateHistory([newHistoryItem, ...invoiceHistory]);

    setProcessedInvoices(allProcessedInvoices);
    setAppState('success');
};
  
  const handleSelectFromHistory = (item: InvoiceHistoryItem) => {
    setProcessedInvoices(item.invoices);
    setAppState('success');
  };

  const handleDeleteFromHistory = (id: string) => {
    const newHistory = invoiceHistory.filter(item => item.id !== id);
    updateHistory(newHistory);
  };

  const handleStartOver = () => {
    setProcessedInvoices(null);
    setAppState('idle');
  };
  
  const handleShowHistory = () => {
      setAppState('history');
  }

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Extrayendo datos de sus facturas...</p>
            <p className="text-sm text-muted-foreground">La IA está trabajando. Esto puede tomar un momento.</p>
          </div>
        );
      case 'success':
        if (processedInvoices) {
          return (
            <div className="w-full flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle>Facturas Procesadas</CardTitle>
                                <CardDescription>Se encontraron {processedInvoices.length} factura(s). Revisa y edita los datos antes de exportar.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={handleStartOver}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Empezar de Nuevo
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {processedInvoices.map((invoice, index) => (
                    <DataTable
                        key={invoice.data.numeroDeFactura || index}
                        initialData={invoice.data}
                        initialValidationErrors={invoice.errors}
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
          />
        );
      case 'idle':
      case 'error':
      default:
        return (
          <div className="w-full max-w-2xl">
             <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">PharmaReceipt AI</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Sube tu factura para extraer, verificar y formatear automáticamente los datos de recepción de tus productos farmacéuticos.
              </p>
            </div>
            <InvoiceUpload onProcess={handleProcessInvoices} />
            {isClient && invoiceHistory.length > 0 && (
                <div className="mt-6 text-center">
                    <Button variant="ghost" onClick={handleShowHistory}>
                        <History className="mr-2 h-4 w-4" />
                        Ver Historial de Facturas
                    </Button>
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="flex w-full items-start justify-center">
        {renderContent()}
      </div>
    </div>
  );
}
