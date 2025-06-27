'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceUploadProps {
  onProcess: (file: File) => void;
}

export function InvoiceUpload({ onProcess }: InvoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Error al Subir Archivo',
        description: 'Solo se aceptan archivos PDF. Por favor, inténtalo de nuevo.',
      });
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleProcess = () => {
    if (file) {
      onProcess(file);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {!file ? (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-semibold text-center">
              {isDragActive ? '¡Suelta la factura aquí!' : 'Arrastra y suelta tu factura PDF aquí'}
            </p>
            <p className="text-muted-foreground">o haz clic para buscar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 mb-4 text-primary" />
            <div className="flex items-center gap-2 mb-4 rounded-md bg-muted p-2 text-sm">
                <span className="font-medium">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeFile}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <Button onClick={handleProcess} className="w-full" size="lg">
              Procesar Factura
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
