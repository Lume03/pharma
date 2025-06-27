// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview Extracts data from uploaded invoice PDFs.
 *
 * - extractInvoiceData - Extracts invoice data from a PDF.
 * - ExtractInvoiceDataInput - The input type for the extractInvoiceData function.
 * - ExtractInvoiceDataOutput - The return type for the extractInvoiceData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "The invoice PDF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const InvoiceItemSchema = z.object({
  nombreDelProductoFarmaceutico: z.string().describe('Name of the pharmaceutical product.'),
  formaFarmaceutica: z.string().describe('Pharmaceutical form (e.g., CAJA X 100 CAPS).'),
  numeroDeLote: z.string().describe('Lot number.'),
  concentracion: z.string().describe('Concentration (e.g., 875 mg + 125 mg).'),
  presentacion: z.string().describe('Presentation (e.g., CAJA X 1 VIAL + SOLV).'),
  fechaDeVencimiento: z.string().describe('Expiration date (YYYY-MM-DD).'),
  registroSanitario: z.string().optional().describe('Sanitary registration number.'),
  cantidadRecibida: z.string().describe('Quantity received.'),
  envaseInmediato: z.string().optional().describe('Immediate packaging conditions.'),
  envaseMediato: z.string().optional().describe('Mediate packaging conditions.'),
  condicionesDeAlmacenamiento: z.string().optional().describe('Storage conditions.'),
  observaciones: z.string().optional().describe('Observations.'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  proveedor: z.string().describe('The name of the supplier.'),
  numeroDeFactura: z.string().describe('The invoice number.'),
  fechaDeEmision: z.string().describe('The invoice issue date (YYYY-MM-DD).'),
  productos: z.array(InvoiceItemSchema).describe('Array of products in the invoice.'),
});

export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const extractInvoiceDataPrompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `You are an AI assistant specialized in extracting data from pharmaceutical invoices.
  Your task is to process the invoice provided as a media file and extract the following information:

  - Supplier (proveedor):
  - Invoice Number (numeroDeFactura):
  - Issue Date (fechaDeEmision):
  - A list of products (productos), with the following information for each product:
      - Product Name (nombreDelProductoFarmaceutico)
      - Pharmaceutical Form (formaFarmaceutica)
      - Lot Number (numeroDeLote)
      - Concentration (concentracion)
      - Presentation (presentacion)
      - Expiration Date (fechaDeVencimiento)
      - Sanitary Registration (registroSanitario) - If available
      - Quantity Received (cantidadRecibida)
      - Immediate Packaging (envaseInmediato) - If available
      - Mediate Packaging (envaseMediato) - If available
      - Storage Conditions (condicionesDeAlmacenamiento) - If available
      - Observations (observaciones) - If available

  Here is the invoice: {{media url=invoiceDataUri}}

  Make sure to output the data in JSON format.
  `,
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async input => {
    const {output} = await extractInvoiceDataPrompt(input);
    return output!;
  }
);

