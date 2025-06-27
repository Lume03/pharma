'use server';

/**
 * @fileOverview A flow to validate extracted data from invoices using AI.
 *
 * - validateExtractedData - Validates extracted data and highlights potential errors.
 * - ValidateExtractedDataInput - The input type for the validateExtractedData function.
 * - ValidateExtractedDataOutput - The return type for the validateExtractedData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateExtractedDataInputSchema = z.object({
  supplier: z.string().describe('The name of the supplier.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  products: z.array(
    z.object({
      productName: z.string().describe('The name of the product.'),
      form: z.string().describe('The form of the product.'),
      lotNumber: z.string().describe('The lot number of the product.'),
      concentration: z.string().describe('The concentration of the product.'),
      presentation: z.string().describe('The presentation of the product.'),
      expirationDate: z.string().describe('The expiration date of the product.'),
      registrationNumber: z.string().optional().describe('The registration number of the product.'),
      quantityReceived: z.string().describe('The quantity received of the product.'),
    })
  ).describe('The list of products in the invoice.'),
});
export type ValidateExtractedDataInput = z.infer<typeof ValidateExtractedDataInputSchema>;

const ValidationErrorSchema = z.object({
  field: z.string().describe('The field that has the error.'),
  message: z.string().describe('The error message for the field.'),
});

const ValidateExtractedDataOutputSchema = z.object({
  validationErrors: z.array(ValidationErrorSchema).describe('The list of validation errors found in the extracted data.'),
});
export type ValidateExtractedDataOutput = z.infer<typeof ValidateExtractedDataOutputSchema>;

export async function validateExtractedData(input: ValidateExtractedDataInput): Promise<ValidateExtractedDataOutput> {
  return validateExtractedDataFlow(input);
}

const validateExtractedDataPrompt = ai.definePrompt({
  name: 'validateExtractedDataPrompt',
  input: {schema: ValidateExtractedDataInputSchema},
  output: {schema: ValidateExtractedDataOutputSchema},
  prompt: `You are an AI assistant specialized in validating data extracted from pharmaceutical invoices. You will receive data extracted from an invoice and your task is to identify any potential errors or missing information. Provide a list of validation errors with the field name and a descriptive error message.

Invoice Data:
Supplier: {{{supplier}}}
Invoice Number: {{{invoiceNumber}}}
Invoice Date: {{{invoiceDate}}}

Products:
{{#each products}}
Product Name: {{{productName}}}
Form: {{{form}}}
Lot Number: {{{lotNumber}}}
Concentration: {{{concentration}}}
Presentation: {{{presentation}}}
Expiration Date: {{{expirationDate}}}
Registration Number: {{{registrationNumber}}}
Quantity Received: {{{quantityReceived}}}
{{/each}}

Output Format: An array of JSON objects, where each object has a 'field' and a 'message' key. The 'field' key indicates the field with the error, and the 'message' key provides a description of the error.
`,
});

const validateExtractedDataFlow = ai.defineFlow(
  {
    name: 'validateExtractedDataFlow',
    inputSchema: ValidateExtractedDataInputSchema,
    outputSchema: ValidateExtractedDataOutputSchema,
  },
  async input => {
    const {output} = await validateExtractedDataPrompt(input);
    return output!;
  }
);
