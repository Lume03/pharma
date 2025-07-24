'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { InvoiceData, Product, ValidationError } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, AlertCircle, PlusCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

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
  const [selectedPharmacy, setSelectedPharmacy] = useState('BOTICA FARMA KIDS');
  const tableRef = useRef<HTMLTableElement>(null);

  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    initialValidationErrors.forEach(err => {
      map[err.field] = err.message;
    });
    return map;
  }, [initialValidationErrors]);
  
  const handleInputChange = (rowIndex: number, field: keyof Product, value: string | boolean) => {
    const updatedProducts = [...data.productos];
    const currentProduct = { ...updatedProducts[rowIndex] };
    (currentProduct[field] as any) = value;
    updatedProducts[rowIndex] = currentProduct;
    setData({ ...data, productos: updatedProducts });
  };
  
  const handleHeaderChange = (field: keyof Omit<InvoiceData, 'productos'>, value: string) => {
    setData({ ...data, [field]: value });
  };
  
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    // Adjust height for all textareas on initial render and when data changes
    if (tableRef.current) {
      const textareas = tableRef.current.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }
  }, [data.productos]);

  const addRow = () => {
    const newProduct: Product = {
      nombreDelProductoFarmaceutico: '',
      formaFarmaceutica: '',
      numeroDeLote: '',
      concentracion: '',
      presentacion: '',
      fechaDeVencimiento: '',
      cantidadRecibida: '',
    };
    setData({ ...data, productos: [...data.productos, newProduct] });
  };

  const removeRow = (rowIndex: number) => {
    const updatedProducts = data.productos.filter((_, index) => index !== rowIndex);
    setData({ ...data, productos: updatedProducts });
  };


  const generatePdf = () => {
    const products = data.productos;
    const chunkSize = 12;
    const numDocuments = products.length > 0 ? Math.ceil(products.length / chunkSize) : 1;

    for (let i = 0; i < numDocuments; i++) {
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageW = doc.internal.pageSize.getWidth();
        
        const logoId = selectedPharmacy === 'BOTICA FARMA KIDS' ? 'farma-kids-logo' : 't-pharma-logo';
        const logoEl = document.getElementById(logoId);
        if (logoEl) {
          try {
            doc.addImage(logoEl as HTMLImageElement, 'PNG', 15, 8, 20, 20);
          } catch (e) {
            console.error("Error adding logo image to PDF:", e)
          }
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedPharmacy, pageW / 2, 12, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('POES 1: RECEPCION DE PRODUCTOS FARMACEUTICOS, DISPOSITIVOS MEDICOS Y PRODUCTOS SANITARIOS', pageW / 2, 18, { align: 'center' });

        const formatCode = selectedPharmacy === 'BOTICA FARMA KIDS' ? 'F-BFKIDS-10' : 'F-BTPHARMA-10';
        doc.text(`FORMATO DE RECEPCION: ${formatCode}`, pageW / 2, 23, { align: 'center' });


        const detailsY = 35;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PROVEEDOR:', 15, detailsY);
        doc.text('N° DE FACTURA:', 15, detailsY + 7);
        doc.text('FECHA:', pageW - 60, detailsY);

        doc.setFont('helvetica', 'normal');
        doc.text(data.proveedor, 50, detailsY);
        doc.text(data.numeroDeFactura, 50, detailsY + 7);
        doc.text(data.fechaDeEmision, pageW - 40, detailsY);

        doc.setDrawColor(0);
        doc.line(48, detailsY + 1, pageW / 2, detailsY + 1);
        doc.line(48, detailsY + 8, pageW / 2, detailsY + 8);
        doc.line(pageW - 38, detailsY + 1, pageW - 15, detailsY + 1);

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
          'CANTIDAD RECIBIDA',
          'CONDICIONES DE ALMACENAMIENTO',
          'OBSERVACIONES',
        ];
        
        const productChunk = products.slice(i * chunkSize, (i + 1) * chunkSize);
        
        const tableBody = productChunk.map(p => {
          const originalValues = [
            p.nombreDelProductoFarmaceutico,
            p.nombreDelDispositivoMedico,
            p.formaFarmaceutica,
            p.numeroDeLote,
            p.concentracion,
            p.presentacion,
            p.envaseInmediato,
            p.envaseMediato,
            p.fechaDeVencimiento,
            p.registroSanitario,
            p.cantidadRecibida,
            p.condicionesDeAlmacenamiento,
            p.observaciones,
          ];
          
          return originalValues.map(val => {
            if (val === true) return '✓';
            if (val === false || val === undefined || val === null) return '';
            return String(val);
          });
        });

        const requiredRows = 12;
        while (tableBody.length < requiredRows) {
            tableBody.push(Array(tableHead.length).fill(''));
        }

        autoTable(doc, {
          head: [tableHead],
          body: tableBody,
          startY: detailsY + 15,
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
              minCellHeight: 8,
              cellPadding: 1,
              valign: 'middle',
              halign: 'center'
          },
          didDrawCell: (data) => {
            if (data.cell.section === 'body' && (data.column.index === 6 || data.column.index === 7) && data.cell.raw === '✓') {
              const cell = data.cell;
              const x = cell.x + cell.width / 2;
              const y = cell.y + cell.height / 2;
              doc.setLineWidth(0.3);
              doc.setDrawColor(0, 0, 0);
              // Draw a clean checkmark
              doc.line(x - 1.5, y - 0.5, x, y + 1.5); // smaller part of check
              doc.line(x, y + 1.5, x + 2.5, y - 2); // larger part of check
              data.cell.text = []; // Clear the original '✓' text
            }
          },
          columnStyles: {
            0: { cellWidth: 30, halign: 'left' },
            1: { cellWidth: 30, halign: 'left' },
            2: { cellWidth: 30, halign: 'left' },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 },
            6: { cellWidth: 15 },
            7: { cellWidth: 15 },
            8: { cellWidth: 20 },
            9: { cellWidth: 20 },
            10: { cellWidth: 15 },
            11: { cellWidth: 20, halign: 'left' },
            12: { cellWidth: 'auto', halign: 'left' },
          }
        });
        
        const finalY = (doc as any).lastAutoTable.finalY;
        const signatureY = finalY + 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        doc.line(20, signatureY, 80, signatureY);
        doc.text('RECEPCIONADO POR:', 50, signatureY + 5, { align: 'center' });
        
        doc.line(pageW - 80, signatureY, pageW - 20, signatureY);
        doc.text('DIRECTOR TECNICO:', pageW - 50, signatureY + 5, { align: 'center' });

        const pageSuffix = numDocuments > 1 ? `_parte_${i + 1}` : '';
        doc.save(`recepcion_${data.numeroDeFactura}${pageSuffix}.pdf`);
    }
  };
  
  const columns: { key: keyof Product, label: string, isCheckbox?: boolean, width?: string }[] = [
    { key: 'nombreDelProductoFarmaceutico', label: 'Nombre del Producto Farmacéutico', width: 'w-[15%]' },
    { key: 'nombreDelDispositivoMedico', label: 'Dispositivo Médico', width: 'w-[10%]' },
    { key: 'formaFarmaceutica', label: 'Forma Farmacéutica', width: 'w-[10%]' },
    { key: 'numeroDeLote', label: 'Nº Lote', width: 'w-[8%]' },
    { key: 'concentracion', label: 'Concentración', width: 'w-[8%]' },
    { key: 'presentacion', label: 'Presentación', width: 'w-[10%]' },
    { key: 'envaseInmediato', label: 'Env. Inm.', isCheckbox: true, width: 'w-[5%]' },
    { key: 'envaseMediato', label: 'Env. Med.', isCheckbox: true, width: 'w-[5%]' },
    { key: 'fechaDeVencimiento', label: 'F. Venc.', width: 'w-[8%]' },
    { key: 'registroSanitario', label: 'Reg. Sanitario', width: 'w-[8%]' },
    { key: 'cantidadRecibida', label: 'Cant. Rec.', width: 'w-[5%]' },
    { key: 'condicionesDeAlmacenamiento', label: 'Almacenamiento', width: 'w-[10%]' },
    { key: 'observaciones', label: 'Observaciones', width: 'w-[10%]' },
  ];

  return (
    <TooltipProvider>
      <Image
        id="farma-kids-logo"
        src="/logo.png"
        alt="Botica Farma Kids logo"
        width={80}
        height={80}
        className="hidden"
        data-ai-hint="logo"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/80x80.png';
        }}
      />
      <Image
        id="t-pharma-logo"
        src="/logo.png"
        alt="Botica T-Pharma logo"
        width={80}
        height={80}
        className="hidden"
        data-ai-hint="logo pharma"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/80x80.png';
        }}
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Formato de Recepción</CardTitle>
          <CardDescription>
            Verifique los datos extraídos por la IA. Puede editar cualquier campo antes de generar el PDF final.
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor={`proveedor-${initialData.numeroDeFactura}`}>Proveedor</Label>
              <Textarea 
                id={`proveedor-${initialData.numeroDeFactura}`} 
                value={data.proveedor} 
                onChange={(e) => handleHeaderChange('proveedor', e.target.value)}
                onInput={handleTextareaInput}
                rows={1}
                className="resize-none overflow-hidden" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`numeroDeFactura-${initialData.numeroDeFactura}`}>Nº de Factura</Label>
              <Textarea 
                id={`numeroDeFactura-${initialData.numeroDeFactura}`} 
                value={data.numeroDeFactura} 
                onChange={(e) => handleHeaderChange('numeroDeFactura', e.target.value)}
                onInput={handleTextareaInput}
                rows={1}
                className="resize-none overflow-hidden" 
               />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`fechaDeEmision-${initialData.numeroDeFactura}`}>Fecha de Emisión</Label>
              <Textarea 
                id={`fechaDeEmision-${initialData.numeroDeFactura}`} 
                value={data.fechaDeEmision} 
                onChange={(e) => handleHeaderChange('fechaDeEmision', e.target.value)} 
                onInput={handleTextareaInput}
                rows={1}
                className="resize-none overflow-hidden" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {columns.map(c => (
                    <TableHead key={c.key} className={cn("px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", c.width)}>
                      {c.label}
                    </TableHead>
                  ))}
                   <TableHead className="w-[5%] text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {data.productos.map((product, rowIndex) => (
                  <TableRow key={rowIndex} className="bg-white hover:bg-gray-50">
                    {columns.map(col => {
                      if (col.isCheckbox) {
                        return (
                          <TableCell key={col.key} className="p-1 align-top">
                            <div className="flex justify-center pt-1">
                              <Checkbox
                                checked={!!product[col.key]}
                                onCheckedChange={(checked) => handleInputChange(rowIndex, col.key, !!checked)}
                              />
                            </div>
                          </TableCell>
                        )
                      }
                      
                      const fieldKey = col.key as keyof typeof keyMap;
                      const errorKey = `products.${rowIndex}.${keyMap[fieldKey]}`;
                      const error = errorMap[errorKey];
                      
                      return (
                        <TableCell key={col.key} className="p-0 align-top">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative h-full">
                                <Textarea
                                  value={(product[col.key] as string || '').toString()}
                                  onChange={(e) => handleInputChange(rowIndex, col.key, e.target.value)}
                                  onInput={handleTextareaInput}
                                  rows={1}
                                  className={cn(
                                    "w-full bg-transparent border-0 rounded-none p-2 h-full focus:ring-1 focus:ring-blue-500 focus:bg-white text-xs resize-none overflow-hidden", 
                                    error ? 'ring-1 ring-destructive' : ''
                                  )}
                                />
                                {error && <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-destructive" />}
                              </div>
                            </TooltipTrigger>
                            {error && <TooltipContent><p>{error}</p></TooltipContent>}
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                     <TableCell className="p-1 align-top text-center">
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full h-8 w-8 mt-1" onClick={() => removeRow(rowIndex)}>
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
              <Button variant="outline" onClick={addRow}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Fila
              </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-end gap-4">
            <div>
              <Label htmlFor="pharmacy-select">Botica para el Reporte</Label>
              <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                <SelectTrigger id="pharmacy-select" className="w-[280px] mt-2">
                  <SelectValue placeholder="Seleccionar botica..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOTICA FARMA KIDS">BOTICA FARMA KIDS</SelectItem>
                  <SelectItem value="BOTICA T-PHARMA">BOTICA T-PHARMA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generatePdf} className="bg-accent hover:bg-accent/90">
                <Download className="mr-2 h-4 w-4" />
                Generar PDF
            </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
