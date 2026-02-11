'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X, Cloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceUploadProps {
  onProcess: (files: File[]) => void;
  isCloudMode?: boolean;
}

export function InvoiceUpload({ onProcess, isCloudMode = false }: InvoiceUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Error al Subir Archivos',
        description: 'Solo se aceptan archivos PDF. Por favor, inténtalo de nuevo.',
      });
    }
    if (acceptedFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const handleProcess = () => {
    if (files.length > 0) {
      onProcess(files);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== fileToRemove));
  };

  const clearFiles = () => {
    setFiles([]);
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center p-14 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group
            ${isDragActive
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
        >
          <input {...getInputProps()} />

          <div className={`relative mb-5 transition-all duration-300 ${isDragActive ? 'scale-110' : 'group-hover:scale-105'}`}>
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UploadCloud className={`h-8 w-8 transition-colors duration-300 ${isDragActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
            </div>
          </div>

          <p className="text-lg font-semibold text-center transition-colors duration-200">
            {isDragActive ? '¡Suelta las facturas aquí!' : 'Arrastra y suelta tus facturas PDF aquí'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">o haz clic para buscar</p>

          {isCloudMode && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Cloud className="h-3.5 w-3.5" />
              <span>Se guardarán automáticamente en Google Drive</span>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              Archivos en cola ({files.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 p-3 text-sm transition-all duration-200 hover:bg-muted animate-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-medium truncate block">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFile(file)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Button onClick={handleProcess} className="w-full sm:w-auto gap-2 shadow-sm" size="lg">
                <UploadCloud className="h-4 w-4" />
                Procesar {files.length} Factura(s)
              </Button>
              <Button variant="outline" onClick={clearFiles} className="w-full sm:w-auto">
                Limpiar Todo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
