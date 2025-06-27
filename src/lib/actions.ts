'use server';

import { extractInvoiceData, type ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { validateExtractedData, type ValidateExtractedDataOutput } from '@/ai/flows/validate-extracted-data';
import type { InvoiceData, ValidationError } from '@/types';

interface ActionResult {
  data: InvoiceData | null;
  errors: ValidationError[] | null;
  errorMessage: string | null;
}

export async function extractAndValidateInvoiceAction(invoiceDataUri: string): Promise<ActionResult> {
  if (!invoiceDataUri) {
    return { data: null, errors: null, errorMessage: 'No invoice file provided.' };
  }

  try {
    // 1. Extract data from the invoice PDF
    const extractedData = await extractInvoiceData({ invoiceDataUri });

    // 2. Prepare data for validation by mapping to the expected schema
    const validationInput = {
      supplier: extractedData.proveedor,
      invoiceNumber: extractedData.numeroDeFactura,
      invoiceDate: extractedData.fechaDeEmision,
      products: extractedData.productos.map(p => ({
        productName: p.nombreDelProductoFarmaceutico,
        form: p.formaFarmaceutica,
        lotNumber: p.numeroDeLote,
        concentration: p.concentracion,
        presentation: p.presentacion,
        expirationDate: p.fechaDeVencimiento,
        registrationNumber: p.registroSanitario || '',
        quantityReceived: String(p.cantidadRecibida),
      })),
    };

    // 3. Validate the extracted data
    const validationResult = await validateExtractedData(validationInput);

    // 4. Return both extracted data and validation errors
    return {
      data: extractedData,
      errors: validationResult.validationErrors,
      errorMessage: null,
    };
  } catch (error) {
    console.error('Error during AI processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { 
        data: null, 
        errors: null, 
        errorMessage: `Failed to process invoice. The AI model may have had trouble with this file format. Details: ${errorMessage}` 
    };
  }
}
