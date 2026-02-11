'use client';

import type { InvoiceHistoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SkeletonCard } from '@/components/skeleton-card';
import { Trash2, Eye, Upload, Cloud, HardDrive, FileText } from 'lucide-react';

interface InvoiceHistoryProps {
  history: InvoiceHistoryItem[];
  onSelect: (item: InvoiceHistoryItem) => void;
  onDelete: (id: string) => void;
  onGoToUpload: () => void;
  isLoading?: boolean;
  isCloudMode?: boolean;
}

export function InvoiceHistory({
  history,
  onSelect,
  onDelete,
  onGoToUpload,
  isLoading = false,
  isCloudMode = false,
}: InvoiceHistoryProps) {
  if (!isLoading && history.length === 0) {
    return (
      <div className="text-center py-16 animate-in fade-in duration-500">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Historial de Facturas</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          Aún no has procesado ninguna factura. Comienza subiendo tu primer archivo PDF.
        </p>
        <Button onClick={onGoToUpload} size="lg" className="gap-2 shadow-sm">
          <Upload className="h-4 w-4" />
          Subir Primera Factura
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl border-0 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">Historial de Facturas</CardTitle>
              {isCloudMode ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Cloud className="h-3 w-3" />
                  Google Drive
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <HardDrive className="h-3 w-3" />
                  Local
                </span>
              )}
            </div>
            <CardDescription className="mt-1">
              {isLoading
                ? 'Cargando facturas...'
                : `${history.length} factura(s) procesada(s)`}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onGoToUpload} className="gap-2 shadow-sm">
            <Upload className="h-4 w-4" />
            Subir Nueva Factura
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[55vh] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              history.map((item, index) => (
                <Card
                  key={item.id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                >
                  <div className="mb-3 sm:mb-0 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base truncate">{item.fileName}</p>
                      {item.driveFileId && (
                        <Cloud className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.invoices.length} factura(s) encontrada(s)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Procesado: {new Date(item.processedAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelect(item)}
                      className="gap-1.5 transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
