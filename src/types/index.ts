export interface Product {
  nombreDelProductoFarmaceutico: string;
  nombreDelDispositivoMedico?: string;
  formaFarmaceutica: string;
  numeroDeLote: string;
  concentracion: string;
  presentacion: string;
  fechaDeVencimiento: string;
  registroSanitario?: string;
  cantidadRecibida: string;
  // Añadir los campos manuales del formulario
  envaseInmediato?: string;
  envaseMediato?: string;
  condicionesDeAlmacenamiento?: string;
  observaciones?: string;
}

export interface InvoiceData {
  proveedor: string;
  numeroDeFactura: string;
  fechaDeEmision: string;
  productos: Product[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ProcessedInvoice {
  data: InvoiceData;
  errors: ValidationError[];
}

export interface InvoiceHistoryItem {
  id: string;
  fileName: string;
  processedAt: string;
  invoices: ProcessedInvoice[];
}
