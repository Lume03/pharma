'use server';

/**
 * @fileOverview Un flujo para validar datos extraídos de facturas usando IA.
 *
 * - validateExtractedData - Valida los datos extraídos y resalta posibles errores.
 * - ValidateExtractedDataInput - El tipo de entrada para la función validateExtractedData.
 * - ValidateExtractedDataOutput - El tipo de retorno para la función validateExtractedData.
 */

import { ai, withKeyRotation } from '@/ai/genkit';
import { z } from 'genkit';

const ValidateExtractedDataInputSchema = z.object({
  supplier: z.string().describe('El nombre del proveedor.'),
  invoiceNumber: z.string().describe('El número de factura.'),
  invoiceDate: z.string().describe('La fecha de la factura.'),
  products: z.array(
    z.object({
      productName: z.string().describe('El nombre del producto.'),
      medicalDeviceName: z.string().optional().describe('El nombre del dispositivo médico.'),
      form: z.string().describe('La forma del producto.'),
      lotNumber: z.string().describe('El número de lote del producto.'),
      concentration: z.string().describe('La concentración del producto.'),
      presentation: z.string().describe('La presentación del producto.'),
      expirationDate: z.string().describe('La fecha de vencimiento del producto.'),
      registrationNumber: z.string().optional().describe('El número de registro del producto.'),
      quantityReceived: z.string().describe('La cantidad recibida del producto.'),
    })
  ).describe('La lista de productos en la factura.'),
});
export type ValidateExtractedDataInput = z.infer<typeof ValidateExtractedDataInputSchema>;

const ValidationErrorSchema = z.object({
  field: z.string().describe('El campo que tiene el error.'),
  message: z.string().describe('El mensaje de error para el campo.'),
});

const ValidateExtractedDataOutputSchema = z.object({
  validationErrors: z.array(ValidationErrorSchema).describe('La lista de errores de validación encontrados en los datos extraídos.'),
});
export type ValidateExtractedDataOutput = z.infer<typeof ValidateExtractedDataOutputSchema>;

export async function validateExtractedData(input: ValidateExtractedDataInput): Promise<ValidateExtractedDataOutput> {
  return withKeyRotation(async (aiInstance) => {
    const prompt = aiInstance.definePrompt({
      name: 'validateExtractedDataPrompt',
      input: { schema: ValidateExtractedDataInputSchema },
      output: { schema: ValidateExtractedDataOutputSchema },
      prompt: `Eres un asistente de IA especializado en validar datos extraídos de facturas farmacéuticas. Recibirás datos extraídos de una factura y tu tarea es identificar cualquier posible error o información faltante. Proporciona una lista de errores de validación con el nombre del campo y un mensaje de error descriptivo.

Datos de la Factura:
Proveedor: {{{supplier}}}
Número de Factura: {{{invoiceNumber}}}
Fecha de la Factura: {{{invoiceDate}}}

Productos:
{{#each products}}
Nombre del Producto: {{{productName}}}
Nombre del Dispositivo Médico: {{{medicalDeviceName}}}
Forma: {{{form}}}
Número de Lote: {{{lotNumber}}}
Concentración: {{{concentration}}}
Presentación: {{{presentation}}}
Fecha de Vencimiento: {{{expirationDate}}}
Número de Registro: {{{registrationNumber}}}
Cantidad Recibida: {{{quantityReceived}}}
{{/each}}

Formato de Salida: Un array de objetos JSON, donde cada objeto tiene una clave 'field' y 'message'. La clave 'field' indica el campo con el error, y la clave 'message' proporciona una descripción del error.
`,
    });

    const { output } = await prompt(input);
    return output!;
  });
}
