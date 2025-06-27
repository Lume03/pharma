'use client';

import type { InvoiceHistoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Eye, Upload } from 'lucide-react';

interface InvoiceHistoryProps {
  history: InvoiceHistoryItem[];
  onSelect: (item: InvoiceHistoryItem) => void;
  onDelete: (id: string) => void;
  onGoToUpload: () => void;
}

export function InvoiceHistory({ history, onSelect, onDelete, onGoToUpload }: InvoiceHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Historial de Facturas</h2>
        <p className="text-muted-foreground mb-6">Aún no has procesado ninguna factura.</p>
        <Button onClick={onGoToUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Subir Primera Factura
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Historial de Facturas</CardTitle>
            <CardDescription>Aquí puedes ver las facturas que has procesado.</CardDescription>
          </div>
          <Button variant="outline" onClick={onGoToUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Subir Nueva Factura
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                <div className="mb-4 sm:mb-0">
                  <p className="font-semibold text-lg">{item.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.invoices.length} factura(s) encontrada(s)
                  </p>
                  <p className="text-xs text-muted-foreground">Procesado: {new Date(item.processedAt).toLocaleString('es-ES')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onSelect(item)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalles
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
