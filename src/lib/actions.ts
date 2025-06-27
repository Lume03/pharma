'use server';

import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { validateExtractedData } from '@/ai/flows/validate-extracted-data';
import type { ProcessedInvoice } from '@/types';

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

    const processedInvoices: ProcessedInvoice[] = [];

    // 2. Validate each extracted invoice
    for (const invoice of extractionResult.invoices) {
        const validationInput = {
            supplier: invoice.proveedor,
            invoiceNumber: invoice.numeroDeFactura,
            invoiceDate: invoice.fechaDeEmision,
            products: invoice.productos.map(p => ({
                productName: p.nombreDelProductoFarmaceutico,
                medicalDeviceName: p.nombreDelDispositivoMedico || '',
                form: p.formaFarmaceutica,
                lotNumber: p.numeroDeLote,
                concentration: p.concentracion,
                presentation: p.presentacion,
                expirationDate: p.fechaDeVencimiento,
                registrationNumber: p.registroSanitario || '',
                quantityReceived: String(p.cantidadRecibida),
            })),
        };

        const validationResult = await validateExtractedData(validationInput);
        
        processedInvoices.push({
            data: invoice,
            errors: validationResult.validationErrors,
        });
    }

    // 3. Return all processed invoices
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
