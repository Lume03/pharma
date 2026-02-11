'use server';

/**
 * @fileOverview Extrae datos de una o varias facturas contenidas en un único archivo PDF.
 *
 * - extractInvoiceData - Extrae los datos de todas las facturas de un PDF.
 * - ExtractInvoiceDataInput - El tipo de entrada para la función extractInvoiceData.
 * - ExtractInvoiceDataOutput - El tipo de retorno para la función extractInvoiceData.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "El PDF de la factura, como un URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const InvoiceItemSchema = z.object({
  nombreDelProductoFarmaceutico: z.string().optional().describe('Nombre del producto farmacéutico.'),
  nombreDelDispositivoMedico: z.string().optional().describe('Nombre del dispositivo médico.'),
  formaFarmaceutica: z.string().optional().describe('Forma farmacéutica (p. ej., CAJA X 100 CAPS).'),
  numeroDeLote: z.string().optional().describe('Número de lote.'),
  concentracion: z.string().optional().describe('Concentración (p. ej., 875 mg + 125 mg).'),
  presentacion: z.string().optional().describe('Presentación (p. ej., CAJA X 1 VIAL + SOLV).'),
  fechaDeVencimiento: z.string().optional().describe('Fecha de vencimiento (YYYY-MM-DD).'),
  registroSanitario: z.string().optional().describe('Número de registro sanitario.'),
  cantidadRecibida: z.string().optional().describe('Cantidad recibida.'),
  condicionesDeAlmacenamiento: z.string().optional().describe('Condiciones de almacenamiento.'),
  observaciones: z.string().optional().describe('Observaciones.'),
});

const SingleInvoiceSchema = z.object({
  proveedor: z.string().optional().describe('El nombre del proveedor.'),
  numeroDeFactura: z.string().optional().describe('El número de factura.'),
  fechaDeEmision: z.string().optional().describe('La fecha de emisión de la factura (YYYY-MM-DD).'),
  productos: z.array(InvoiceItemSchema).describe('Array de productos en la factura.'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  invoices: z.array(SingleInvoiceSchema).describe("Una lista de todas las facturas encontradas en el documento."),
});


export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const extractInvoiceDataPrompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: { schema: ExtractInvoiceDataInputSchema },
  output: { schema: ExtractInvoiceDataOutputSchema },
  prompt: `Eres un asistente de IA especializado en extraer datos de facturas farmacéuticas.
Tu tarea es procesar el documento PDF proporcionado, que puede contener una o varias facturas. Debes identificar cada factura individualmente y extraer la siguiente información para cada una.

Para cada factura, extrae:
- Proveedor (proveedor):
- Número de Factura (numeroDeFactura):
- Fecha de Emisión (fechaDeEmision):
- Una lista de productos (productos), con la siguiente información para cada producto:
    - Nombre del Producto Farmacéutico (nombreDelProductoFarmaceutico)
    - Nombre del Dispositivo Médico (nombreDelDispositivoMedico) - Si está disponible
    - Forma Farmacéutica (formaFarmaceutica)
    - Número de Lote (numeroDeLote)
    - Concentración (concentracion)
    - Presentación (presentacion)
    - Fecha de Vencimiento (fechaDeVencimiento)
    - Registro Sanitario (registroSanitario) - Si está disponible
    - Cantidad Recibida (cantidadRecibida)
    - Condiciones de Almacenamiento (condicionesDeAlmacenamiento) - Si está disponible
    - Observaciones (observaciones) - Si está disponible

Aquí está el documento PDF: {{media url=invoiceDataUri}}

IMPORTANTE: Para cualquier campo que no puedas encontrar o extraer del documento, usa un string vacío ("") en lugar de null o undefined. Nunca devuelvas null.

Asegúrate de que la salida sea un único objeto JSON. Este objeto debe tener una clave llamada "invoices", que contenga un array. Cada elemento de este array será un objeto JSON que representa una factura individual extraída del PDF.
  `,
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async input => {
    const { output } = await extractInvoiceDataPrompt(input);
    return output!;
  }
);
