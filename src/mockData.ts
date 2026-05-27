import { Order } from './types';

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-2026-001',
    plate: 'BRA2E19',
    driverName: 'Carlos Roberto Silva',
    cargoType: 'Cloreto de Potássio (KCI)',
    weight: 37.5,
    carrier: 'Sul Transcontinental Ltda',
    priority: 'alta',
    urgent: true,
    status: 'Waiting',
    createdAt: '2026-05-26T18:30:00Z',
    lastUpdatedAt: '2026-05-26T18:45:00Z',
    createdBy: 'Logística Plantão A',
    protocols: [
      {
        id: 'PRT-101',
        name: 'NFE_352605_CLORETO_FERTIPAR.pdf',
        size: '342 KB',
        fileType: 'application/pdf',
        content: 'MOCK_PDF_DATA',
        viewed: false,
        printed: false,
        uploadedAt: '2026-05-26T18:35:00Z'
      },
      {
        id: 'PRT-102',
        name: 'PROTOCOLO_AUTORIZACAO_VAGAO.pdf',
        size: '185 KB',
        fileType: 'application/pdf',
        content: 'MOCK_PDF_DATA',
        viewed: false,
        printed: false,
        uploadedAt: '2026-05-26T18:35:00Z'
      }
    ],
    timeline: [
      {
        id: 'TL-1',
        timestamp: '2026-05-26T18:30:00Z',
        toStatus: 'Draft',
        description: 'Rascunho de ordem de carga gerado',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-2',
        timestamp: '2026-05-26T18:35:00Z',
        description: 'Anexado documento NFE_352605_CLORETO_FERTIPAR.pdf',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-3',
        timestamp: '2026-05-26T18:35:10Z',
        description: 'Anexado documento PROTOCOLO_AUTORIZACAO_VAGAO.pdf',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-4',
        timestamp: '2026-05-26T18:45:00Z',
        fromStatus: 'Draft',
        toStatus: 'Waiting',
        description: 'Processo iniciado pela Logística. Status alterado para "Aguardando abertura de ordem"',
        user: 'Logística Plantão A'
      }
    ]
  },
  {
    id: 'ORD-2026-002',
    plate: 'ABC1234',
    driverName: 'Marcos Almeida',
    cargoType: 'Ureia Hortícola Especial',
    weight: 28.0,
    carrier: 'TransAgrícola Rápido',
    priority: 'normal',
    urgent: false,
    status: 'Draft',
    createdAt: '2026-05-26T20:10:00Z',
    lastUpdatedAt: '2026-05-26T20:15:00Z',
    createdBy: 'Logística Plantão B',
    protocols: [
      {
        id: 'PRT-201',
        name: 'NFE_352608_UREIA.pdf',
        size: '412 KB',
        fileType: 'application/pdf',
        content: 'MOCK_PDF_DATA',
        viewed: false,
        printed: false,
        uploadedAt: '2026-05-26T20:15:00Z'
      }
    ],
    timeline: [
      {
        id: 'TL-5',
        timestamp: '2026-05-26T20:10:00Z',
        toStatus: 'Draft',
        description: 'Rascunho da ordem iniciado',
        user: 'Logística Plantão B'
      },
      {
        id: 'TL-6',
        timestamp: '2026-05-26T20:15:00Z',
        description: 'Anexado documento NFE_352608_UREIA.pdf',
        user: 'Logística Plantão B'
      }
    ]
  },
  {
    id: 'ORD-2026-003',
    plate: 'MER4C12',
    driverName: 'Rosângela Souza Martins',
    cargoType: 'Superfosfato Simples (SSP)',
    weight: 42.1,
    carrier: 'Fertilizo Transportes',
    priority: 'alta',
    urgent: false,
    status: 'Completed',
    createdAt: '2026-05-26T15:20:00Z',
    lastUpdatedAt: '2026-05-26T16:10:00Z',
    createdBy: 'Logística Plantão A',
    protocols: [
      {
        id: 'PRT-301',
        name: 'NFE_349901_SUPERFOSFATO.pdf',
        size: '512 KB',
        fileType: 'application/pdf',
        content: 'MOCK_PDF_DATA',
        viewed: true,
        printed: true,
        uploadedAt: '2026-05-26T15:21:00Z'
      }
    ],
    timeline: [
      {
        id: 'TL-7',
        timestamp: '2026-05-26T15:20:00Z',
        toStatus: 'Draft',
        description: 'Rascunho criado',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-8',
        timestamp: '2026-05-26T15:21:30Z',
        description: 'Anexado documento NFE_349901_SUPERFOSFATO.pdf',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-9',
        timestamp: '2026-05-26T15:25:00Z',
        fromStatus: 'Draft',
        toStatus: 'Waiting',
        description: 'Iniciado fluxo. Aguardando liberação na balança / faturamento',
        user: 'Logística Plantão A'
      },
      {
        id: 'TL-10',
        timestamp: '2026-05-26T15:58:00Z',
        description: 'Visualização de documento NFE_349901_SUPERFOSFATO.pdf efetuada pelo faturamento',
        user: 'Portaria & Balança Sul'
      },
      {
        id: 'TL-11',
        timestamp: '2026-05-26T15:59:00Z',
        description: 'Impressão de Protocolo efetuada pelo faturamento',
        user: 'Portaria & Balança Sul'
      },
      {
        id: 'TL-12',
        timestamp: '2026-05-26T16:10:00Z',
        fromStatus: 'Waiting',
        toStatus: 'Completed',
        description: 'Balão de pesagem consolidado. Ordem Aberta e consolidada para descarga física',
        user: 'Portaria & Balança Sul'
      }
    ]
  },
  {
    id: 'ORD-2026-004',
    plate: 'KAX9811',
    driverName: 'Sebastião Antunes',
    cargoType: 'Fosfato Monoamônico (MAP)',
    weight: 39.8,
    carrier: 'TransAgrícola Rápido',
    priority: 'normal',
    urgent: false,
    status: 'Cancelled',
    cancelReason: 'Veículo detectado com problemas mecânicos no eixo traseiro antes do portão de triagem.',
    createdAt: '2026-05-26T11:00:00Z',
    lastUpdatedAt: '2026-05-26T11:40:00Z',
    createdBy: 'Logística Plantão B',
    protocols: [
      {
        id: 'PRT-401',
        name: 'NF_34110_MAP_GERAL.pdf',
        size: '298 KB',
        fileType: 'application/pdf',
        content: 'MOCK_PDF_DATA',
        viewed: false,
        printed: false,
        uploadedAt: '2026-05-26T11:05:00Z'
      }
    ],
    timeline: [
      {
        id: 'TL-13',
        timestamp: '2026-05-26T11:00:00Z',
        toStatus: 'Draft',
        description: 'Ordem de despacho iniciada',
        user: 'Logística Plantão B'
      },
      {
        id: 'TL-14',
        timestamp: '2026-05-26T11:05:00Z',
        description: 'Anexado NF_34110_MAP_GERAL.pdf',
        user: 'Logística Plantão B'
      },
      {
        id: 'TL-15',
        timestamp: '2026-05-26T11:15:00Z',
        fromStatus: 'Draft',
        toStatus: 'Waiting',
        description: 'Enviado para triagem física',
        user: 'Logística Plantão B'
      },
      {
        id: 'TL-16',
        timestamp: '2026-05-26T11:40:00Z',
        fromStatus: 'Waiting',
        toStatus: 'Cancelled',
        description: 'Ordem Cancelada pela Logística. Motivo: Veículo detectado com problemas mecânicos no eixo traseiro antes do portão de triagem.',
        user: 'Logística Plantão B'
      }
    ]
  }
];
