'use client';

import { useState, useMemo } from 'react';
import type { InvoiceData, Product, ValidationError } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, AlertCircle, RefreshCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataTableProps {
  initialData: InvoiceData;
  initialValidationErrors: ValidationError[];
  onStartOver: () => void;
}

const keyMap: { [K in keyof Omit<Product, 'envaseInmediato' | 'envaseMediato' | 'condicionesDeAlmacenamiento' | 'observaciones'>]: string } = {
  nombreDelProductoFarmaceutico: 'productName',
  formaFarmaceutica: 'form',
  numeroDeLote: 'lotNumber',
  concentracion: 'concentration',
  presentacion: 'presentation',
  fechaDeVencimiento: 'expirationDate',
  registroSanitario: 'registrationNumber',
  cantidadRecibida: 'quantityReceived',
};

export function DataTable({ initialData, initialValidationErrors, onStartOver }: DataTableProps) {
  const [data, setData] = useState<InvoiceData>(initialData);

  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    initialValidationErrors.forEach(err => {
      map[err.field] = err.message;
    });
    return map;
  }, [initialValidationErrors]);

  const handleInputChange = (rowIndex: number, field: keyof Product, value: string) => {
    const updatedProducts = [...data.productos];
    updatedProducts[rowIndex] = { ...updatedProducts[rowIndex], [field]: value };
    setData({ ...data, productos: updatedProducts });
  };
  
  const handleHeaderChange = (field: keyof InvoiceData, value: string) => {
    setData({ ...data, [field]: value });
  };

  const generatePdf = () => {
    const doc = new jsPDF();
    
    doc.setFont('Inter', 'bold');
    doc.setFontSize(16);
    doc.text('Formato de Recepción F-BFKIDS-10', 105, 15, { align: 'center' });
    
    doc.setFont('Inter', 'normal');
    doc.setFontSize(12);
    doc.text('Botica Farma Kids', 105, 22, { align: 'center' });

    autoTable(doc, {
      body: [
        [{ content: `Proveedor: ${data.proveedor}`, styles: { fontStyle: 'bold' } }],
        [{ content: `Nº de Factura: ${data.numeroDeFactura}`, styles: { fontStyle: 'bold' } }],
        [{ content: `Fecha de Emisión: ${data.fechaDeEmision}`, styles: { fontStyle: 'bold' } }],
      ],
      startY: 30,
      theme: 'plain',
      styles: { cellPadding: 1 },
    });

    const tableHead = [
      'Nombre del Producto',
      'Forma Farmacéutica',
      'Nº Lote',
      'Concentración',
      'Presentación',
      'F. Vencimiento',
      'Reg. Sanitario',
      'Cant. Recibida',
      'Envase Inmediato',
      'Envase Mediato',
      'Cond. Almacenamiento',
      'Observaciones',
    ];
    
    const tableBody = data.productos.map(p => [
      p.nombreDelProductoFarmaceutico,
      p.formaFarmaceutica,
      p.numeroDeLote,
      p.concentracion,
      p.presentacion,
      p.fechaDeVencimiento,
      p.registroSanitario || '',
      p.cantidadRecibida,
      p.envaseInmediato || '',
      p.envaseMediato || '',
      p.condicionesDeAlmacenamiento || '',
      p.observaciones || '',
    ]);

    autoTable(doc, {
      head: [tableHead],
      body: tableBody,
      startY: (doc as any).lastAutoTable.finalY + 5,
      headStyles: { fillColor: [100, 181, 246], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [240, 244, 248] },
      styles: { cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    const signatureY = finalY > pageHeight - 40 ? pageHeight - 30 : finalY + 20;

    if (finalY > pageHeight - 40) doc.addPage();
    
    doc.setFontSize(10);
    doc.text('Recepcionado Por:', 20, signatureY + 15);
    doc.line(20, signatureY + 17, 80, signatureY + 17);
    
    doc.text('Director Técnico:', 120, signatureY + 15);
    doc.line(120, signatureY + 17, 180, signatureY + 17);

    doc.save(`recepcion_${data.numeroDeFactura}.pdf`);
  };
  
  const columns: { key: keyof Product, label: string, isTextarea?: boolean }[] = [
      { key: 'nombreDelProductoFarmaceutico', label: 'Nombre del Producto' },
      { key: 'formaFarmaceutica', label: 'Forma Farmacéutica' },
      { key: 'numeroDeLote', label: 'Nº Lote' },
      { key: 'concentracion', label: 'Concentración' },
      { key: 'presentacion', label: 'Presentación' },
      { key: 'fechaDeVencimiento', label: 'F. Vencimiento' },
      { key: 'registroSanitario', label: 'Reg. Sanitario' },
      { key: 'cantidadRecibida', label: 'Cant. Recibida' },
      { key: 'envaseInmediato', label: 'Envase Inmediato' },
      { key: 'envaseMediato', label: 'Envase Mediato' },
      { key: 'condicionesDeAlmacenamiento', label: 'Cond. Almacenamiento', isTextarea: true },
      { key: 'observaciones', label: 'Observaciones', isTextarea: true },
  ];

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Formato de Recepción</CardTitle>
          <CardDescription>
            Verifique los datos extraídos por la IA. Puede editar cualquier campo antes de generar el PDF final.
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Input label="Proveedor" value={data.proveedor} onChange={(e) => handleHeaderChange('proveedor', e.target.value)} />
            <Input label="Nº de Factura" value={data.numeroDeFactura} onChange={(e) => handleHeaderChange('numeroDeFactura', e.target.value)} />
            <Input label="Fecha de Emisión" value={data.fechaDeEmision} onChange={(e) => handleHeaderChange('fechaDeEmision', e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.productos.map((product, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map(col => {
                        const fieldKey = col.key as keyof typeof keyMap;
                        const errorKey = `products.${rowIndex}.${keyMap[fieldKey]}`;
                        const error = errorMap[errorKey];
                        const InputComponent = col.isTextarea ? Textarea : Input;

                        return (
                        <TableCell key={col.key}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                    <InputComponent
                                        value={product[col.key] || ''}
                                        onChange={(e) => handleInputChange(rowIndex, col.key, e.target.value)}
                                        className={error ? 'border-destructive ring-destructive ring-1' : ''}
                                        />
                                    {error && <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />}
                                    </div>
                                </TooltipTrigger>
                                {error && <TooltipContent><p>{error}</p></TooltipContent>}
                            </Tooltip>
                        </TableCell>
                        );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={onStartOver}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Empezar de Nuevo
            </Button>
            <Button onClick={generatePdf} className="bg-accent hover:bg-accent/90">
                <Download className="mr-2 h-4 w-4" />
                Generar PDF
            </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
