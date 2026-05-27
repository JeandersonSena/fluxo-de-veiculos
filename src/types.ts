export type OrderStatus = 'Draft' | 'Waiting' | 'Completed' | 'Cancelled';

export interface Protocol {
  id: string;
  name: string;
  size: string;
  fileType: string;
  content: string; // Base64 representation or standard content string
  viewed: boolean;
  printed: boolean;
  uploadedAt: string;
}

export interface TimelineLog {
  id: string;
  timestamp: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  description: string;
  user: string;
}

export interface Order {
  id: string;
  plate: string;          // Formato Mercosul (ABC1D23 or ABC1234)
  driverName: string;     // Nome do motorista
  cargoType?: string;      // Tipo de carga (Uréia, Cloreto de Potássio, Fosfato, Fertilizante, etc.)
  weight: number;         // Em toneladas (ponto flutuante)
  carrier: string;        // Transportadora
  priority: 'normal' | 'alta';
  urgent: boolean;        // Se necessita de abertura urgente (pulsante)
  status: OrderStatus;
  cancelReason?: string;
  protocols: Protocol[];
  timeline: TimelineLog[];
  createdAt: string;
  lastUpdatedAt: string;
  createdBy: string;
}

export type UserRole = 'Logistica' | 'Portaria';

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

