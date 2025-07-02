'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { InvoiceData, Product, ValidationError } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, AlertCircle } from 'lucide-react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState('BOTICA FARMA KIDS');

  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    initialValidationErrors.forEach(err => {
      map[err.field] = err.message;
    });
    return map;
  }, [initialValidationErrors]);

  useEffect(() => {
    const slider = scrollContainerRef.current;
    if (!slider) return;

    slider.style.cursor = 'grab';

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button[role="checkbox"]')
      ) {
        return;
      }
      
      isDown = true;
      slider.setPointerCapture(e.pointerId);
      slider.style.cursor = 'grabbing';
      startX = e.pageX;
      scrollLeft = slider.scrollLeft;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      slider.releasePointerCapture(e.pointerId);
      slider.style.cursor = 'grab';
    };

    slider.addEventListener('pointerdown', handlePointerDown);
    slider.addEventListener('pointermove', handlePointerMove);
    slider.addEventListener('pointerup', handlePointerUp);
    slider.addEventListener('pointerleave', handlePointerUp);

    return () => {
      if (slider) {
        slider.removeEventListener('pointerdown', handlePointerDown);
        slider.removeEventListener('pointermove', handlePointerMove);
        slider.removeEventListener('pointerup', handlePointerUp);
        slider.removeEventListener('pointerleave', handlePointerUp);
      }
    };
  }, []);

  const handleInputChange = (rowIndex: number, field: keyof Product, value: string | boolean) => {
    const updatedProducts = [...data.productos];
    updatedProducts[rowIndex] = { ...updatedProducts[rowIndex], [field]: value };
    setData({ ...data, productos: updatedProducts });
  };
  
  const handleHeaderChange = (field: keyof Omit<InvoiceData, 'productos'>, value: string) => {
    setData({ ...data, [field]: value });
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
            p.envaseInmediato ? '✓' : '',
            p.envaseMediato ? '✓' : '',
            p.fechaDeVencimiento,
            p.registroSanitario,
            p.cantidadRecibida,
            p.condicionesDeAlmacenamiento,
            p.observaciones,
          ];
          
          return originalValues.map(val => {
            if (val === 'N/A') return '-';
            return val || '';
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
              minCellHeight: 8
          },
          styles: { cellPadding: 1 },
          willDrawCell: (data) => {
            if (data.cell.section === 'body' && (data.column.index === 6 || data.column.index === 7) && data.cell.raw === '✓') {
              data.cell.text = [];
            }
          },
          didDrawCell: (data) => {
            if (data.cell.section === 'body' && (data.column.index === 6 || data.column.index === 7) && data.cell.raw === '✓') {
              const cell = data.cell;
              const x = cell.x + cell.width / 2;
              const y = cell.y + cell.height / 2;
              doc.setLineWidth(0.3);
              doc.setDrawColor(0, 0, 0);
              doc.line(x - 1.5, y - 0.5, x, y + 1.5);
              doc.line(x, y + 1.5, x + 2.5, y - 2);
            }
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 10 },
            2: { cellWidth: 60 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 15, halign: 'center' },
            7: { cellWidth: 15, halign: 'center' },
            8: { cellWidth: 20, halign: 'center' },
            9: { cellWidth: 20, halign: 'center' },
            10: { cellWidth: 15, halign: 'center' },
            11: { cellWidth: 10, halign: 'center' },
            12: { cellWidth: 'auto' },
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
  
  const columns: { key: keyof Product, label: string, isTextarea?: boolean, isCheckbox?: boolean, widthClass?: string }[] = [
      { key: 'nombreDelProductoFarmaceutico', label: 'Nombre Producto Farmaceutico', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'nombreDelDispositivoMedico', label: 'Nombre Dispositivo Médico', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'formaFarmaceutica', label: 'Forma Farmacéutica', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'numeroDeLote', label: 'Nº Lote', isTextarea: true, widthClass: 'min-w-[180px]' },
      { key: 'concentracion', label: 'Concentración', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'presentacion', label: 'Presentación', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'envaseInmediato', label: 'Env. Inmediato', isCheckbox: true, widthClass: 'min-w-[120px]' },
      { key: 'envaseMediato', label: 'Env. Mediato', isCheckbox: true, widthClass: 'min-w-[120px]' },
      { key: 'fechaDeVencimiento', label: 'F. Vencimiento', isTextarea: true, widthClass: 'min-w-[150px]' },
      { key: 'registroSanitario', label: 'Reg. Sanitario', isTextarea: true, widthClass: 'min-w-[180px]' },
      { key: 'cantidadRecibida', label: 'Cant. Recibida', widthClass: 'min-w-[120px]' },
      { key: 'condicionesDeAlmacenamiento', label: 'Cond. Almacenamiento', isTextarea: true, widthClass: 'min-w-[250px]' },
      { key: 'observaciones', label: 'Observaciones', isTextarea: true, widthClass: 'min-w-[250px]' },
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
        src="https://placehold.co/80x80.png"
        alt="Botica T-Pharma logo"
        width={80}
        height={80}
        className="hidden"
        data-ai-hint="logo pharma"
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
          <div className="w-full overflow-hidden">
            <div className="relative w-full overflow-auto" ref={scrollContainerRef}>
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c.key} className={c.widthClass}>{c.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.productos.map((product, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map(col => {
                          if (col.isCheckbox) {
                            return (
                                  <TableCell key={col.key} className={`${col.widthClass} text-center`}>
                                      <div className="flex justify-center">
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
                                          value={product[col.key] as string || ''}
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
              </table>
            </div>
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
