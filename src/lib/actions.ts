'use server';

import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { validateExtractedData } from '@/ai/flows/validate-extracted-data';
import type { ProcessedInvoice, InvoiceData, Product } from '@/types';

// Sanitize Zod optional fields to required strings for Product type
function sanitizeProducts(products: any[]): Product[] {
  return products.map(p => ({
    nombreDelProductoFarmaceutico: p.nombreDelProductoFarmaceutico ?? '',
    nombreDelDispositivoMedico: p.nombreDelDispositivoMedico ?? '',
    formaFarmaceutica: p.formaFarmaceutica ?? '',
    numeroDeLote: p.numeroDeLote ?? '',
    concentracion: p.concentracion ?? '',
    presentacion: p.presentacion ?? '',
    envaseInmediato: p.envaseInmediato ?? false,
    envaseMediato: p.envaseMediato ?? false,
    fechaDeVencimiento: p.fechaDeVencimiento ?? '',
    registroSanitario: p.registroSanitario ?? '',
    cantidadRecibida: p.cantidadRecibida ?? '',
    condicionesDeAlmacenamiento: p.condicionesDeAlmacenamiento ?? '',
    observaciones: p.observaciones ?? '',
  }));
}

interface ActionResult {
  processedInvoices: ProcessedInvoice[] | null;
  errorMessage: string | null;
}

/**
 * Classify an AI error into a user-friendly message.
 */
function classifyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return '⚠️ El servicio de IA está experimentando alta demanda. Se intentó con todas las claves disponibles pero todas fallaron. Intenta de nuevo en unos minutos.';
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate') || lower.includes('resource exhausted')) {
    return '⚠️ Se agotaron los tokens/cuota de la API de IA. Se intentó con todas las claves disponibles. Intenta de nuevo más tarde o agrega más claves en el archivo .env.';
  }
  if (lower.includes('todas las') && lower.includes('claves')) {
    return msg; // Already a user-friendly message from withKeyRotation
  }
  if (lower.includes('invalid') || lower.includes('api key')) {
    return '🔑 Error de autenticación con la API de IA. Verifica que las claves GEMINI_API_KEY en tu archivo .env sean válidas.';
  }

  return `No se pudo procesar la factura. Detalles: ${msg.substring(0, 200)}`;
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
      if (!invoiceNumber) {
        const uniqueKey = `no-number-${Math.random()}`;
        mergedInvoicesMap.set(uniqueKey, {
          proveedor: invoice.proveedor || '',
          numeroDeFactura: invoice.numeroDeFactura || '',
          fechaDeEmision: invoice.fechaDeEmision || '',
          productos: sanitizeProducts(invoice.productos || []),
        });
        continue;
      }

      if (mergedInvoicesMap.has(invoiceNumber)) {
        const existingInvoice = mergedInvoicesMap.get(invoiceNumber)!;
        existingInvoice.productos.push(...sanitizeProducts(invoice.productos || []));
      } else {
        mergedInvoicesMap.set(invoiceNumber, {
          proveedor: invoice.proveedor || '',
          numeroDeFactura: invoice.numeroDeFactura || '',
          fechaDeEmision: invoice.fechaDeEmision || '',
          productos: sanitizeProducts(invoice.productos || []),
        });
      }
    }

    const mergedInvoices = Array.from(mergedInvoicesMap.values());

    // 3. Validate ALL invoices in parallel for speed
    const validationPromises = mergedInvoices.map(async (invoice): Promise<ProcessedInvoice> => {
      const products = Array.isArray(invoice.productos) ? invoice.productos : [];

      try {
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

        return {
          data: {
            proveedor: invoice.proveedor || '',
            numeroDeFactura: invoice.numeroDeFactura || '',
            fechaDeEmision: invoice.fechaDeEmision || '',
            productos: products,
          },
          errors: validationResult.validationErrors,
        };
      } catch (validationError) {
        // If validation fails, still return the extracted data without validation errors
        console.warn('Validation failed for invoice, continuing without validation:', validationError);
        return {
          data: {
            proveedor: invoice.proveedor || '',
            numeroDeFactura: invoice.numeroDeFactura || '',
            fechaDeEmision: invoice.fechaDeEmision || '',
            productos: products,
          },
          errors: [],
        };
      }
    });

    const processedInvoices = await Promise.all(validationPromises);

    return {
      processedInvoices,
      errorMessage: null,
    };
  } catch (error) {
    console.error('Error during AI processing:', error);
    return {
      processedInvoices: null,
      errorMessage: classifyError(error),
    };
  }
}
