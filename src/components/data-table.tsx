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
  nombreDelDispositivoMedico: 'medicalDeviceName',
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
  
  const handleHeaderChange = (field: keyof Omit<InvoiceData, 'productos'>, value: string) => {
    setData({ ...data, [field]: value });
  };

  const generatePdf = () => {
    const doc = new jsPDF();
    
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
    doc.text('BOTICA F-KIDS', 140, 15, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    doc.text('POE BFKIDS-10: RECEPCIÓN DE PRODUCTOS FARMACÉUTICOS, DISPOSITIVOS MÉDICOS Y PRODUCTOS SANITARIOS', 140, 22, { align: 'center' });
    
    autoTable(doc, {
        body: [[
            { content: 'FORMATO DE RECEPCIÓN: F-BFKIDS-10', styles: { fontStyle: 'bold' } },
            { content: 'VERSION: 00', styles: { fontStyle: 'bold' } }
        ]],
        startY: 25,
        theme: 'plain',
        styles: { cellPadding: 1, fontSize: 9 },
        tableWidth: 'wrap',
        margin: { left: 78 }
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
        0: { cellWidth: 130 },
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

    const requiredRows = 15;
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
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 15 },
        3: { cellWidth: 12 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
        8: { cellWidth: 15 },
        9: { cellWidth: 12 },
        10: { cellWidth: 10 },
        11: { cellWidth: 18 },
        12: { cellWidth: 'auto' },
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    let signatureY = finalY + 20;

    if (finalY > pageHeight - 40) {
      doc.addPage();
      signatureY = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    doc.text('RECEPCIONADO POR:', 45, signatureY + 15, { align: 'center' });
    doc.line(20, signatureY + 17, 70, signatureY + 17);
    
    doc.text('DIRECTOR TÉCNICO:', 160, signatureY + 15, { align: 'center' });
    doc.line(135, signatureY + 17, 185, signatureY + 17);

    doc.save(`recepcion_${data.numeroDeFactura}.pdf`);
  };
  
  const columns: { key: keyof Product, label: string, isTextarea?: boolean }[] = [
      { key: 'nombreDelProductoFarmaceutico', label: 'Nombre Producto Farmaceutico' },
      { key: 'nombreDelDispositivoMedico', label: 'Nombre Dispositivo Médico' },
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
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input id="proveedor" value={data.proveedor} onChange={(e) => handleHeaderChange('proveedor', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroDeFactura">Nº de Factura</Label>
              <Input id="numeroDeFactura" value={data.numeroDeFactura} onChange={(e) => handleHeaderChange('numeroDeFactura', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaDeEmision">Fecha de Emisión</Label>
              <Input id="fechaDeEmision" value={data.fechaDeEmision} onChange={(e) => handleHeaderChange('fechaDeEmision', e.target.value)} />
            </div>
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
