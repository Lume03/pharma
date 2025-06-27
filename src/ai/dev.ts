import { config } from 'dotenv';
config();

import '@/ai/flows/validate-extracted-data.ts';
import '@/ai/flows/extract-invoice-data.ts';