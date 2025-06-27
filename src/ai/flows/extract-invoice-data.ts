'use server';

/**
 * @fileOverview Extrae datos de las facturas en PDF subidas.
 *
 * - extractInvoiceData - Extrae los datos de la factura de un PDF.
 * - ExtractInvoiceDataInput - El tipo de entrada para la función extractInvoiceData.
 * - ExtractInvoiceDataOutput - El tipo de retorno para la función extractInvoiceData.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "El PDF de la factura, como un URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const InvoiceItemSchema = z.object({
  nombreDelProductoFarmaceutico: z.string().describe('Nombre del producto farmacéutico.'),
  nombreDelDispositivoMedico: z.string().optional().describe('Nombre del dispositivo médico.'),
  formaFarmaceutica: z.string().describe('Forma farmacéutica (p. ej., CAJA X 100 CAPS).'),
  numeroDeLote: z.string().describe('Número de lote.'),
  concentracion: z.string().describe('Concentración (p. ej., 875 mg + 125 mg).'),
  presentacion: z.string().describe('Presentación (p. ej., CAJA X 1 VIAL + SOLV).'),
  fechaDeVencimiento: z.string().describe('Fecha de vencimiento (YYYY-MM-DD).'),
  registroSanitario: z.string().optional().describe('Número de registro sanitario.'),
  cantidadRecibida: z.string().describe('Cantidad recibida.'),
  envaseInmediato: z.string().optional().describe('Condiciones del envase inmediato.'),
  envaseMediato: z.string().optional().describe('Condiciones del envase mediato.'),
  condicionesDeAlmacenamiento: z.string().optional().describe('Condiciones de almacenamiento.'),
  observaciones: z.string().optional().describe('Observaciones.'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  proveedor: z.string().describe('El nombre del proveedor.'),
  numeroDeFactura: z.string().describe('El número de factura.'),
  fechaDeEmision: z.string().describe('La fecha de emisión de la factura (YYYY-MM-DD).'),
  productos: z.array(InvoiceItemSchema).describe('Array de productos en la factura.'),
});

export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const extractInvoiceDataPrompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `Eres un asistente de IA especializado en extraer datos de facturas farmacéuticas.
  Tu tarea es procesar la factura proporcionada como archivo multimedia y extraer la siguiente información:

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
      - Envase Inmediato (envaseInmediato) - Si está disponible
      - Envase Mediato (envaseMediato) - Si está disponible
      - Condiciones de Almacenamiento (condicionesDeAlmacenamiento) - Si está disponible
      - Observaciones (observaciones) - Si está disponible

  Aquí está la factura: {{media url=invoiceDataUri}}

  Asegúrate de que la salida de los datos sea en formato JSON.
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
