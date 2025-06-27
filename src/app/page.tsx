'use client';

import { useState, useEffect } from 'react';
import { InvoiceUpload } from '@/components/invoice-upload';
import { DataTable } from '@/components/data-table';
import { InvoiceHistory } from '@/components/invoice-history';
import { extractAndValidateInvoiceAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { InvoiceData, ValidationError, InvoiceHistoryItem } from '@/types';
import { Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppState = 'idle' | 'loading' | 'success' | 'error' | 'history';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryItem[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('invoiceHistory');
      if (storedHistory) {
        setInvoiceHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to parse invoice history from localStorage", error);
      localStorage.removeItem('invoiceHistory');
    }
  }, []);

  const updateHistory = (newHistory: InvoiceHistoryItem[]) => {
    setInvoiceHistory(newHistory);
    localStorage.setItem('invoiceHistory', JSON.stringify(newHistory));
  };

  const handleProcessInvoice = async (file: File) => {
    setAppState('loading');
    setProgress(10);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      setProgress(30);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      const result = await extractAndValidateInvoiceAction(dataUri);
      clearInterval(progressInterval);
      setProgress(100);

      if (result.errorMessage || !result.data) {
        setAppState('error');
        toast({
          variant: 'destructive',
          title: 'Error al Procesar la Factura',
          description: result.errorMessage || 'Ocurrió un error desconocido.',
        });
        return;
      }

      const initialData: InvoiceData = {
        ...result.data,
        productos: result.data.productos.map(p => ({ ...p })),
      };

      const newHistoryItem: InvoiceHistoryItem = {
        id: Date.now().toString(),
        fileName: file.name,
        processedAt: new Date().toISOString(),
        data: initialData,
        errors: result.errors || [],
      };
      updateHistory([...invoiceHistory, newHistoryItem]);

      setInvoiceData(initialData);
      setValidationErrors(result.errors || []);
      setAppState('success');
    };
    reader.onerror = () => {
      setAppState('error');
      toast({
        variant: 'destructive',
        title: 'Error al Leer el Archivo',
        description: 'No se pudo leer el archivo seleccionado. Por favor, inténtalo de nuevo.',
      });
    };
  };
  
  const handleSelectFromHistory = (item: InvoiceHistoryItem) => {
    setInvoiceData(item.data);
    setValidationErrors(item.errors);
    setAppState('success');
  };

  const handleDeleteFromHistory = (id: string) => {
    const newHistory = invoiceHistory.filter(item => item.id !== id);
    updateHistory(newHistory);
  };

  const handleStartOver = () => {
    setInvoiceData(null);
    setValidationErrors([]);
    setAppState('idle');
    setProgress(0);
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
            <p className="text-lg font-medium text-muted-foreground">Extrayendo datos de su factura...</p>
            <p className="text-sm text-muted-foreground">La IA está trabajando. Esto puede tomar un momento.</p>
          </div>
        );
      case 'success':
        if (invoiceData) {
          return (
            <DataTable
              initialData={invoiceData}
              initialValidationErrors={validationErrors}
              onStartOver={handleStartOver}
            />
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
            <InvoiceUpload onProcess={handleProcessInvoice} />
            {invoiceHistory.length > 0 && (
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
      <div className="flex min-h-[60vh] items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}
