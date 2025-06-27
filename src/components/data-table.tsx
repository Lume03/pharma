'use client';

import { useState, useMemo } from 'react';
import type { InvoiceData, Product, ValidationError } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataTableProps {
  initialData: InvoiceData;
  initialValidationErrors: ValidationError[];
}

const keyMap: { [K in keyof Omit<Product, 'envaseInmediato' | 'envaseMediato' | 'condicionesDeAlmacenamiento' | 'observaciones'>]: string } = {
  nombreDelProductoFarmaceutico: 'productName',
  nombreDelDispositivoMedico: 'medicalDeviceName',
  formaFarmaceutica: 'form',
  numeroDeLote: 'lotNumber',
  concentracion: 'concentration',
  presentacion: 'presentation',
  fechaDeVencimiento: 'expirationDate',
  registroSanitario: 'registrationNumber',
  cantidadRecibida: 'quantityReceived',
};

export function DataTable({ initialData, initialValidationErrors }: DataTableProps) {
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
  
  const handleHeaderChange = (field: keyof Omit<InvoiceData, 'productos'>, value: string) => {
    setData({ ...data, [field]: value });
  };

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    
    // Header section
    doc.setFontSize(14);
    doc.setFont('Inter', 'bold');
    doc.text('BOTICA', 20, 15);
    doc.text('FARMA KIDS', 20, 21);
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text('Profesionales a su servicio', 20, 26);
    doc.setDrawColor(100, 181, 246);
    doc.setLineWidth(0.5);
    doc.rect(15, 8, 50, 22);
    doc.line(15, 23, 65, 23);

    doc.setFontSize(12);
    doc.setFont('Inter', 'bold');
    doc.text('BOTICA F-KIDS', pageW - 70, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    doc.text('POE BFKIDS-10: RECEPCIÓN DE PRODUCTOS FARMACÉUTICOS, DISPOSITIVOS MÉDICOS Y PRODUCTOS SANITARIOS', pageW - 70, 22, { align: 'center', maxWidth: 120 });
    
    autoTable(doc, {
        body: [[
            { content: 'FORMATO DE RECEPCIÓN: F-BFKIDS-10', styles: { fontStyle: 'bold' } },
            { content: 'VERSION: 00', styles: { fontStyle: 'bold' } }
        ]],
        startY: 25,
        theme: 'plain',
        styles: { cellPadding: 1, fontSize: 9 },
        tableWidth: 'wrap',
        margin: { left: pageW - 120 }
    });

    // Details section
    autoTable(doc, {
      body: [
        [
            { content: `PROVEEDOR: ${data.proveedor}`, styles: { fontStyle: 'bold' } },
            { content: `FECHA: ${data.fechaDeEmision}`, styles: { fontStyle: 'bold' } }
        ],
        [
            { content: `N° DE FACTURA: ${data.numeroDeFactura}`, styles: { fontStyle: 'bold' } },
            { content: '' }
        ]
      ],
      startY: (doc as any).lastAutoTable.finalY + 2,
      theme: 'plain',
      styles: { cellPadding: 0.5, fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 180 },
        1: { cellWidth: 'auto' }
      }
    });

    const tableHead = [
      'NOMBRE DEL PRODUCTO FARMACEUTICO',
      'NOMBRE DEL DISPOSITIVO MEDICO',
      'FORMA FARMACEUTICA',
      'N° DE LOTE',
      'CONCENTRACION',
      'PRESENTACION',
      'ENVASE INMEDIATO',
      'ENVASE MEDIATO',
      'FECHA DE VENCIMIENTO',
      'REGISTRO SANITARIO',
      'CANT. RECIBIDA',
      'CONDICIONES DE ALMACENAMIENTO',
      'OBSERVACIONES',
    ];
    
    const tableBody = data.productos.map(p => [
      p.nombreDelProductoFarmaceutico || '',
      p.nombreDelDispositivoMedico || '',
      p.formaFarmaceutica || '',
      p.numeroDeLote || '',
      p.concentracion || '',
      p.presentacion || '',
      p.envaseInmediato || '',
      p.envaseMediato || '',
      p.fechaDeVencimiento || '',
      p.registroSanitario || '',
      p.cantidadRecibida || '',
      p.condicionesDeAlmacenamiento || '',
      p.observaciones || '',
    ]);

    const requiredRows = 10;
    while (tableBody.length < requiredRows) {
        tableBody.push(Array(tableHead.length).fill(''));
    }

    autoTable(doc, {
      head: [tableHead],
      body: tableBody,
      startY: (doc as any).lastAutoTable.finalY + 2,
      theme: 'grid',
      headStyles: { 
          fillColor: '#FFFFFF', 
          textColor: 0, 
          fontSize: 6,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          halign: 'center',
          valign: 'middle'
      },
      bodyStyles: { 
          fontSize: 7,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          minCellHeight: 8
      },
      styles: { cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
        8: { cellWidth: 15 },
        9: { cellWidth: 20 },
        10: { cellWidth: 10 },
        11: { cellWidth: 25 },
        12: { cellWidth: 'auto' },
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    let signatureY = finalY + 15;

    if (finalY > pageHeight - 35) {
      doc.addPage();
      signatureY = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    doc.text('RECEPCIONADO POR:', 45, signatureY + 15, { align: 'center' });
    doc.line(20, signatureY + 17, 70, signatureY + 17);
    
    doc.text('DIRECTOR TÉCNICO:', pageW - 45, signatureY + 15, { align: 'center' });
    doc.line(pageW - 70, signatureY + 17, pageW - 20, signatureY + 17);

    doc.save(`recepcion_${data.numeroDeFactura}.pdf`);
  };
  
  const columns: { key: keyof Product, label: string, isTextarea?: boolean, widthClass?: string }[] = [
      { key: 'nombreDelProductoFarmaceutico', label: 'Nombre Producto Farmaceutico', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'nombreDelDispositivoMedico', label: 'Nombre Dispositivo Médico', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'formaFarmaceutica', label: 'Forma Farmacéutica', isTextarea: true, widthClass: 'min-w-[200px]' },
      { key: 'numeroDeLote', label: 'Nº Lote', isTextarea: true, widthClass: 'min-w-[180px]' },
      { key: 'concentracion', label: 'Concentración', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'presentacion', label: 'Presentación', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'fechaDeVencimiento', label: 'F. Vencimiento', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'registroSanitario', label: 'Reg. Sanitario', isTextarea: true, widthClass: 'min-w-[180px]' },
      { key: 'cantidadRecibida', label: 'Cant. Recibida', widthClass: 'min-w-[120px]' },
      { key: 'envaseInmediato', label: 'Envase Inmediato', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'envaseMediato', label: 'Envase Mediato', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'condicionesDeAlmacenamiento', label: 'Cond. Almacenamiento', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'observaciones', label: 'Observaciones', isTextarea: true, widthClass: 'min-w-[250px]' },
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
            <div className="space-y-2">
              <Label htmlFor={`proveedor-${initialData.numeroDeFactura}`}>Proveedor</Label>
              <Input id={`proveedor-${initialData.numeroDeFactura}`} value={data.proveedor} onChange={(e) => handleHeaderChange('proveedor', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`numeroDeFactura-${initialData.numeroDeFactura}`}>Nº de Factura</Label>
              <Input id={`numeroDeFactura-${initialData.numeroDeFactura}`} value={data.numeroDeFactura} onChange={(e) => handleHeaderChange('numeroDeFactura', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`fechaDeEmision-${initialData.numeroDeFactura}`}>Fecha de Emisión</Label>
              <Input id={`fechaDeEmision-${initialData.numeroDeFactura}`} value={data.fechaDeEmision} onChange={(e) => handleHeaderChange('fechaDeEmision', e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(c => <TableHead key={c.key} className={c.widthClass}>{c.label}</TableHead>)}
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

                        const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            if (col.key === 'cantidadRecibida') {
                              const value = (e.target as HTMLInputElement).value;
                              if (value && /^\d+$/.test(value)) {
                                handleInputChange(rowIndex, 'cantidadRecibida', `${value}.00`);
                              }
                            }
                        };

                        return (
                        <TableCell key={col.key} className={col.widthClass}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                    <InputComponent
                                        value={product[col.key] || ''}
                                        onChange={(e) => handleInputChange(rowIndex, col.key, e.target.value)}
                                        onBlur={handleBlur}
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
            <Button onClick={generatePdf} className="bg-accent hover:bg-accent/90">
                <Download className="mr-2 h-4 w-4" />
                Generar PDF
            </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
