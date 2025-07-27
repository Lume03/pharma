'use server';

import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { validateExtractedData } from '@/ai/flows/validate-extracted-data';
import type { ProcessedInvoice, InvoiceData } from '@/types';

interface ActionResult {
  processedInvoices: ProcessedInvoice[] | null;
  errorMessage: string | null;
}

export async function extractAndValidateInvoiceAction(invoiceDataUri: string): Promise<ActionResult> {
  if (!invoiceDataUri) {
    return { processedInvoices: null, errorMessage: 'No se proporcionó ningún archivo de factura.' };
  }

  try {
    // 1. Extract data from the invoice PDF
    const extractionResult = await extractInvoiceData({ invoiceDataUri });

    if (!extractionResult?.invoices || extractionResult.invoices.length === 0) {
      return { processedInvoices: null, errorMessage: 'No se pudo extraer ninguna factura del documento. Inténtelo de nuevo o con otro archivo.' };
    }

    // 2. Merge invoices with the same invoice number
    const mergedInvoicesMap = new Map<string, InvoiceData>();

    for (const invoice of extractionResult.invoices) {
      const invoiceNumber = invoice.numeroDeFactura;
      // Skip merging if the invoice number is missing, treat it as unique.
      if (!invoiceNumber) {
        // Use a unique key for invoices without a number
        const uniqueKey = `no-number-${Math.random()}`;
        mergedInvoicesMap.set(uniqueKey, {
          proveedor: invoice.proveedor || '',
          numeroDeFactura: invoice.numeroDeFactura || '',
          fechaDeEmision: invoice.fechaDeEmision || '',
          productos: invoice.productos || [],
        });
        continue;
      }
      
      if (mergedInvoicesMap.has(invoiceNumber)) {
        // If invoice number exists, merge products
        const existingInvoice = mergedInvoicesMap.get(invoiceNumber)!;
        existingInvoice.productos.push(...(invoice.productos || []));
      } else {
        // If it's a new invoice number, add it to the map
        mergedInvoicesMap.set(invoiceNumber, {
          proveedor: invoice.proveedor || '',
          numeroDeFactura: invoice.numeroDeFactura || '',
          fechaDeEmision: invoice.fechaDeEmision || '',
          productos: invoice.productos || [],
        });
      }
    }
    
    const mergedInvoices = Array.from(mergedInvoicesMap.values());


    const processedInvoices: ProcessedInvoice[] = [];

    // 3. Validate each merged invoice
    for (const invoice of mergedInvoices) {
        // Ensure products is always an array
        const products = Array.isArray(invoice.productos) ? invoice.productos : [];

        const validationInput = {
            supplier: invoice.proveedor || '',
            invoiceNumber: invoice.numeroDeFactura || '',
            invoiceDate: invoice.fechaDeEmision || '',
            products: products.map(p => ({
                productName: p.nombreDelProductoFarmaceutico || '',
                medicalDeviceName: p.nombreDelDispositivoMedico || '',
                form: p.formaFarmaceutica || '',
                lotNumber: p.numeroDeLote || '',
                concentration: p.concentracion || '',
                presentation: p.presentacion || '',
                expirationDate: p.fechaDeVencimiento || '',
                registrationNumber: p.registroSanitario || '',
                quantityReceived: String(p.cantidadRecibida || '0'),
            })),
        };

        const validationResult = await validateExtractedData(validationInput);
        
        processedInvoices.push({
            data: {
              proveedor: invoice.proveedor || '',
              numeroDeFactura: invoice.numeroDeFactura || '',
              fechaDeEmision: invoice.fechaDeEmision || '',
              productos: products,
            },
            errors: validationResult.validationErrors,
        });
    }

    // 4. Return all processed invoices
    return {
      processedInvoices,
      errorMessage: null,
    };
  } catch (error) {
    console.error('Error during AI processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { 
        processedInvoices: null, 
        errorMessage: `No se pudo procesar la factura. Es posible que el modelo de IA haya tenido problemas con este formato de archivo. Detalles: ${errorMessage}` 
    };
  }
}
