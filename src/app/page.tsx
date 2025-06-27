'use client';

import { useState } from 'react';
import { InvoiceUpload } from '@/components/invoice-upload';
import { DataTable } from '@/components/data-table';
import { extractAndValidateInvoiceAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { InvoiceData, ValidationError } from '@/types';
import { Loader2 } from 'lucide-react';

type AppState = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleProcessInvoice = async (file: File) => {
    setAppState('loading');
    setProgress(10);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      setProgress(30);

      // Fake progress for better UX
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

  const handleStartOver = () => {
    setInvoiceData(null);
    setValidationErrors([]);
    setAppState('idle');
    setProgress(0);
  };

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
        return null; // Should not happen
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
