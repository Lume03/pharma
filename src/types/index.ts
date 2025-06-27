import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import type { ValidateExtractedDataOutput } from '@/ai/flows/validate-extracted-data';

export type Product = ExtractInvoiceDataOutput['productos'][number] & {
  // Añadir los campos manuales del formulario
  envaseInmediato?: string;
  envaseMediato?: string;
  condicionesDeAlmacenamiento?: string;
  observaciones?: string;
};

export interface InvoiceData extends Omit<ExtractInvoiceDataOutput, 'productos'> {
  productos: Product[];
}

export type ValidationError = ValidateExtractedDataOutput['validationErrors'][number];

export interface InvoiceHistoryItem {
  id: string;
  fileName: string;
  processedAt: string;
  data: InvoiceData;
  errors: ValidationError[];
}
