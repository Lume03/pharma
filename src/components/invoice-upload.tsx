'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceUploadProps {
  onProcess: (files: File[]) => void;
}

export function InvoiceUpload({ onProcess }: InvoiceUploadProps) {
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
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-lg font-semibold text-center">
            {isDragActive ? '¡Suelta las facturas aquí!' : 'Arrastra y suelta tus facturas PDF aquí'}
          </p>
          <p className="text-muted-foreground">o haz clic para buscar</p>
        </div>
        
        {files.length > 0 && (
            <div className="mt-6">
                <h4 className="text-md font-semibold mb-3">Archivos en cola:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted p-2 text-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                                <span className="font-medium truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(file)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleProcess} className="w-full sm:w-auto" size="lg">
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
