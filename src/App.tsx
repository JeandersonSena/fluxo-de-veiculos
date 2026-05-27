/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  FileText, 
  Search, 
  X, 
  AlertTriangle, 
  Printer, 
  Check, 
  CheckCircle, 
  Clock, 
  UserSquare2, 
  RefreshCw, 
  Plus, 
  Layers, 
  BadgeAlert, 
  TrendingUp, 
  Anchor, 
  Trash2, 
  Eye, 
  Undo,
  BookOpen,
  Calendar,
  ChevronDown,
  Sunrise
} from 'lucide-react';
import { Order, OrderStatus, Protocol, UserRole, TimelineLog, SystemLog } from './types';
import { INITIAL_ORDERS } from './mockData';
import OrderForm from './components/OrderForm';
import AuditTimeline from './components/AuditTimeline';
import ProtocolViewer from './components/ProtocolViewer';

// Real-time Cloud database integration (Firebase Firestore)
import { db, ensureSignedIn, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

// Helper to extract local YYYY-MM-DD from timestamp
const getLocalDateString = (isoString?: string) => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

// Helper to format date into Portuguese representation
const formatDateBR = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Helper to calculate next sequential operational date
const getNextDayString = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to build simulated or live operational timestamp
const getOperationalTimestamp = (simulatedDate: string) => {
  const now = new Date();
  const timeStr = now.toISOString().split('T')[1]; // HH:MM:SS.SSSZ
  return `${simulatedDate}T${timeStr}`;
};

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentSystemDate, setCurrentSystemDate] = useState('2026-05-26');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Hoje');
  const [isNewDayModalOpen, setIsNewDayModalOpen] = useState(false);
  const [inputNewDayDate, setInputNewDayDate] = useState('');
  const [activeRole, setActiveRole] = useState<UserRole>('Logistica');
  const [searchPlate, setSearchPlate] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // System clear database popup & log store
  const [isClearDbModalOpen, setIsClearDbModalOpen] = useState(false);
  const [clearDbConfirmationCode, setClearDbConfirmationCode] = useState('');
  const [clearDbOption, setClearDbOption] = useState<'all' | 'selected'>('all');
  const [clearDbError, setClearDbError] = useState('');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [showSystemLogsSection, setShowSystemLogsSection] = useState(false);
  const [operationSuccessMessage, setOperationSuccessMessage] = useState<string | null>(null);

  // Loader and synchronization states
  const [loading, setLoading] = useState(true);

  // Registration editing state
  const [isRegistering, setIsRegistering] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // active protocol viewer state
  const [activeProtocol, setActiveProtocol] = useState<{ orderId: string; protocol: Protocol } | null>(null);

  // Warning Toast if docs are not checked
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Setup / Subscription model for cloud real-time synch
  useEffect(() => {
    let isSubscribed = true;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeConfig: (() => void) | null = null;
    let unsubscribeLogs: (() => void) | null = null;

    async function initFirebaseSync() {
      await ensureSignedIn();
      if (!isSubscribed) return;

      // 1. Subscribe to system wide operational date
      const configDocRef = doc(db, 'system', 'config');
      try {
        unsubscribeConfig = onSnapshot(configDocRef, async (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.currentSystemDate) {
              setCurrentSystemDate(data.currentSystemDate);
            }
          } else {
            try {
              await setDoc(configDocRef, { currentSystemDate: '2026-05-26' });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'system/config');
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'system/config');
        });
      } catch (err) {
        console.error("Operational date configuration subscribe error", err);
      }

      // 2. Subscribe to vehicle orders
      const ordersColRef = collection(db, 'orders');
      try {
        unsubscribeOrders = onSnapshot(ordersColRef, async (snapshot) => {
          if (!isSubscribed) return;
          const list: Order[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Order);
          });
          // Sort by descending creation so newest orders show up first
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setOrders(list);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'orders');
        });
      } catch (err) {
        console.error("Orders collection subscribe error", err);
      }

      // 3. Subscribe to system wide audit logs
      const logsDocRef = doc(db, 'system', 'logs');
      try {
        unsubscribeLogs = onSnapshot(logsDocRef, (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.logs) {
              setSystemLogs(data.logs);
            }
          } else {
            setSystemLogs([]);
          }
        }, (error) => {
          console.error("System logs subscribe error", error);
        });
      } catch (err) {
        console.error("System logs subscribe error", err);
      }
    }

    initFirebaseSync();

    return () => {
      isSubscribed = false;
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  // Sync selected order detailed row with the freshest list values
  useEffect(() => {
    if (selectedOrder) {
      const fresh = orders.find(o => o.id === selectedOrder.id);
      if (fresh) {
        setSelectedOrder(fresh);
      } else {
        setSelectedOrder(null);
      }
    }
  }, [orders]);

  // State FINITE machine & update handlers with Firestore sync
  const handleSaveOrder = async (formFields: Partial<Order>) => {
    const now = getOperationalTimestamp(currentSystemDate);
    const currentUser = activeRole === 'Logistica' ? 'Operador de Logística Plantão' : 'Portaria & Balança Sul';

    if (formFields.id) {
      // Editing Mode
      const ord = orders.find(o => o.id === formFields.id);
      if (!ord) return;

      const statusTransition = ord.status !== formFields.status;
      
      // Generate customized timeline action
      const newLogs: TimelineLog[] = [];
      if (statusTransition) {
        newLogs.push({
          id: `TL-GEN-${Math.floor(Math.random() * 100000)}`,
          timestamp: now,
          fromStatus: ord.status,
          toStatus: formFields.status,
          description: `Status alterado de "${translateStatus(ord.status)}" para "${translateStatus(formFields.status!)}" via edição.`,
          user: currentUser
        });
      } else {
        newLogs.push({
          id: `TL-GEN-${Math.floor(Math.random() * 100000)}`,
          timestamp: now,
          description: `Dados cadastrais da carga atualizados.`,
          user: currentUser
        });
      }

      const updatedOrder: Order = {
        ...ord,
        plate: formFields.plate!,
        driverName: formFields.driverName!,
        cargoType: formFields.cargoType || ord.cargoType || 'Fertilizante',
        weight: formFields.weight!,
        carrier: formFields.carrier!,
        priority: formFields.priority!,
        urgent: formFields.urgent!,
        status: formFields.status!,
        lastUpdatedAt: now,
        protocols: formFields.protocols || ord.protocols,
        timeline: [...ord.timeline, ...newLogs]
      };

      try {
        await setDoc(doc(db, 'orders', formFields.id), updatedOrder);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `orders/${formFields.id}`);
      }
      setIsRegistering(false);
      setOrderToEdit(null);
    } else {
      // Creating a New Order
      const newId = `ORD-2026-${Math.floor(Math.random() * 900 + 100)}`;
      
      const creationLogs: TimelineLog[] = [
        {
          id: `TL-C1`,
          timestamp: now,
          toStatus: 'Draft',
          description: 'Ordem de triagem criada no sistema.',
          user: currentUser
        }
      ];

      if (formFields.status === 'Waiting') {
        creationLogs.push({
          id: `TL-C2`,
          timestamp: now,
          fromStatus: 'Draft',
          toStatus: 'Waiting',
          description: 'Processo iniciado automaticamente pela Logística.',
          user: currentUser
        });
      }

      const newOrder: Order = {
        id: newId,
        plate: formFields.plate!,
        driverName: formFields.driverName!,
        cargoType: formFields.cargoType || 'Fertilizante',
        weight: formFields.weight!,
        carrier: formFields.carrier!,
        priority: formFields.priority || 'normal',
        urgent: formFields.urgent || false,
        status: formFields.status || 'Draft',
        protocols: formFields.protocols || [],
        timeline: creationLogs,
        createdAt: now,
        lastUpdatedAt: now,
        createdBy: currentUser
      };

      try {
        await setDoc(doc(db, 'orders', newId), newOrder);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `orders/${newId}`);
      }
      setIsRegistering(false);
    }
  };

  // Change order to Cancelled (Logistics Sovereign right)
  const triggerCancelOrder = (ord: Order) => {
    setCancelModalOrder(ord);
    setCancellationReason('');
    setCancelError('');
  };

  const confirmCancellation = async () => {
    if (!cancelModalOrder) return;
    if (!cancellationReason.trim()) {
      setCancelError('Escreva uma justificativa válida para registrar o cancelamento.');
      return;
    }

    const now = getOperationalTimestamp(currentSystemDate);
    const currentUser = activeRole === 'Logistica' ? 'Supervisor Logística' : 'Faturamento';

    const updatedOrder = {
      ...cancelModalOrder,
      status: 'Cancelled' as const,
      cancelReason: cancellationReason,
      lastUpdatedAt: now,
      timeline: [
        ...cancelModalOrder.timeline,
        {
          id: `TL-CAN-${Math.floor(Math.random() * 100000)}`,
          timestamp: now,
          fromStatus: cancelModalOrder.status,
          toStatus: 'Cancelled',
          description: `Cancelamento de processo efetuado. Justificativa: ${cancellationReason}`,
          user: currentUser
        }
      ]
    };

    try {
      await setDoc(doc(db, 'orders', cancelModalOrder.id), updatedOrder);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${cancelModalOrder.id}`);
    }

    setCancelModalOrder(null);
    setCancellationReason('');
  };

  // Helper to add administrative logs dynamically
  const addSystemLog = async (action: string, details: string) => {
    const now = getOperationalTimestamp(currentSystemDate);
    const currentUser = activeRole === 'Logistica' ? 'Operador de Logística' : 'Portaria & Balança Sul';
    const newLog: SystemLog = {
      id: `SLOG-${Math.floor(Math.random() * 1000000)}`,
      timestamp: now,
      action,
      user: currentUser,
      details
    };
    try {
      const logsRef = doc(db, 'system', 'logs');
      await setDoc(logsRef, {
        logs: [newLog, ...systemLogs].slice(0, 150) // Store last 150 logs in history
      });
    } catch (err) {
      console.error("Erro ao gravar log de sistema", err);
    }
  };

  // Open the clearing dialog instead of using window.confirm
  const handleClearDatabase = () => {
    setClearDbConfirmationCode('');
    setClearDbError('');
    // Set default choice based on whether an order is currently selected
    if (selectedOrder) {
      setClearDbOption('selected');
    } else {
      setClearDbOption('all');
    }
    setIsClearDbModalOpen(true);
  };

  // Execute database clearance of all records
  const executeClearDatabaseAll = async () => {
    try {
      setLoading(true);
      const ordersDeletedCount = orders.length;
      
      // Delete every single document in the 'orders' collection
      for (const ord of orders) {
        await deleteDoc(doc(db, 'orders', ord.id));
      }
      
      // Save global security audit log
      await addSystemLog(
        'RESTAURAÇÃO COMPLETA: LIMPEZA DE DADOS',
        `Apagado definitivamente todo o histórico de placas e triagens. Total de ${ordersDeletedCount} registros limpos.`
      );

      setSelectedOrder(null);
      setIsRegistering(false);
      setOrderToEdit(null);
      setOperationSuccessMessage('Banco de dados operacional foi totalmente zerado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clear_database_all');
    } finally {
      setLoading(false);
      setIsClearDbModalOpen(false);
      setClearDbConfirmationCode('');
    }
  };

  // Delete only the selected order
  const executeClearDatabaseSelected = async () => {
    if (!selectedOrder) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'orders', selectedOrder.id));
      
      // Save global security audit log
      await addSystemLog(
        'EXCLUSÃO SELECIONADA',
        `Excluído controle ${selectedOrder.id} (Placa ${selectedOrder.plate}, Motorista ${selectedOrder.driverName || 'Não Identificado'}, peso ${selectedOrder.weight.toFixed(2)} TON).`
      );

      setSelectedOrder(null);
      setIsRegistering(false);
      setOrderToEdit(null);
      setOperationSuccessMessage(`Registro ${selectedOrder.id} foi apagado com sucesso!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clear_database_selected');
    } finally {
      setLoading(false);
      setIsClearDbModalOpen(false);
      setClearDbConfirmationCode('');
    }
  };

  // Turn ending transition: advance active systems and migrate in-progress orders
  const handleProceedToNewDay = async (chosenDate: string) => {
    if (!chosenDate || chosenDate.trim() === '') return;

    try {
      // 1. Advance the operational system date in Firestore config
      await setDoc(doc(db, 'system', 'config'), { currentSystemDate: chosenDate });

      // 2. Carry over unfinished in-progress orders (Draft / Waiting) to the new day automatically
      const migratedTimestamp = getOperationalTimestamp(chosenDate);
      const ordersToMigrate = orders.filter(ord => ord.status === 'Draft' || ord.status === 'Waiting');
      
      for (const ord of ordersToMigrate) {
        const migratedOrder = {
          ...ord,
          createdAt: migratedTimestamp,
          lastUpdatedAt: migratedTimestamp,
          timeline: [
            ...ord.timeline,
            {
              id: `TL-NEWDAY-${Math.floor(Math.random() * 100000)}`,
              timestamp: migratedTimestamp,
              description: `Ordem migrada automaticamente para o dia ${formatDateBR(chosenDate)} na virada de turno operacional.`,
              user: 'Sistema Automático de Despacho (SAD)'
            }
          ]
        };
        await setDoc(doc(db, 'orders', ord.id), migratedOrder);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'new_day_migration');
    }
    
    // 3. Keep selected filter pointing to 'Hoje' so view focus moves to the fresh today's desk
    setSelectedDateFilter('Hoje');
    
    // 4. Close modal and reset selected order
    setSelectedOrder(null);
    setIsNewDayModalOpen(false);
  };

  // Physical Weighing Gate approval - checking if all attachments viewed, printed & verified
  const openWeighingGateOrder = async (orderId: string) => {
    const ordObj = orders.find(o => o.id === orderId);
    if (!ordObj) return;

    // RULE: require physical printer or visual PDF before releasing weighing gate!
    const size = ordObj.protocols.length;
    if (size > 0) {
      const allVerified = ordObj.protocols.every(p => p.viewed && p.printed);
      if (!allVerified) {
        setWarningMessage(
          `AVISO DE TRIAGEM: Para abrir a Ordem ${orderId}, a Portaria exige a visualização documental E impressão fiscal rápida de TODOS os protocolos anexados (${size} arquivos). Abra os anexos abaixo e execute as ações.`
        );
        return;
      }
    }

    // Success transition
    const now = getOperationalTimestamp(currentSystemDate);
    const currentUser = 'Portaria & Balança Sul';

    const updatedOrder = {
      ...ordObj,
      status: 'Completed' as const,
      lastUpdatedAt: now,
      timeline: [
        ...ordObj.timeline,
        {
          id: `TL-COM-${Math.floor(Math.random() * 100000)}`,
          timestamp: now,
          fromStatus: ordObj.status,
          toStatus: 'Completed',
          description: 'Validação de entrada física concluída. Portão de Pesagem Aberto / Ordem Concluída.',
          user: currentUser
        }
      ]
    };

    try {
      await setDoc(doc(db, 'orders', orderId), updatedOrder);
      setWarningMessage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  // Protocols markers modifications from view/print events
  const handleMarkProtocolViewed = async (orderId: string, protocolId: string) => {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const now = getOperationalTimestamp(currentSystemDate);
    const updatedProtocols = ord.protocols.map((p) => {
      if (p.id === protocolId) {
        return { ...p, viewed: true };
      }
      return p;
    });

    // Add to chronological log
    const targetDocName = ord.protocols.find(p => p.id === protocolId)?.name || 'Documento';
    const logEntry: TimelineLog = {
      id: `TL-PRT-V-${Math.floor(Math.random() * 100000)}`,
      timestamp: now,
      description: `Visualização documental concluída para: ${targetDocName}`,
      user: activeRole === 'Logistica' ? 'Apoio Logístico' : 'Triador Faturamento'
    };

    const updatedOrder = {
      ...ord,
      protocols: updatedProtocols,
      timeline: [...ord.timeline, logEntry]
    };

    try {
      await setDoc(doc(db, 'orders', orderId), updatedOrder);
      
      // update protocol inside viewer state as well
      if (activeProtocol && activeProtocol.protocol.id === protocolId) {
        setActiveProtocol(prev => prev ? {
          ...prev,
          protocol: { ...prev.protocol, viewed: true }
        } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleMarkProtocolPrinted = async (orderId: string, protocolId: string) => {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const now = getOperationalTimestamp(currentSystemDate);
    const updatedProtocols = ord.protocols.map((p) => {
      if (p.id === protocolId) {
        return { ...p, printed: true };
      }
      return p;
    });

    // Add print operation log
    const targetDocName = ord.protocols.find(p => p.id === protocolId)?.name || 'Documento';
    const logEntry: TimelineLog = {
      id: `TL-PRT-P-${Math.floor(Math.random() * 100000)}`,
      timestamp: now,
      description: `Impressão de Protocolo efetuada pelo faturamento: ${targetDocName}`,
      user: 'Apoio Faturamento / Impressora Térmica'
    };

    const updatedOrder = {
      ...ord,
      protocols: updatedProtocols,
      timeline: [...ord.timeline, logEntry]
    };

    try {
      await setDoc(doc(db, 'orders', orderId), updatedOrder);

      // update state in modal active viewer
      if (activeProtocol && activeProtocol.protocol.id === protocolId) {
        setActiveProtocol(prev => prev ? {
          ...prev,
          protocol: { ...prev.protocol, printed: true }
        } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const startEditOrder = (ord: Order) => {
    setOrderToEdit(ord);
    setIsRegistering(true);
  };

  // Helper translations for statuses
  const translateStatus = (status: OrderStatus) => {
    switch (status) {
      case 'Draft': return 'Rascunho';
      case 'Waiting': return 'Portaria (Pendente)';
      case 'Completed': return 'Concluído';
      case 'Cancelled': return 'Cancelado';
    }
  };

  const getStatusBadgeStyles = (status: OrderStatus) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Waiting': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  // Computations
  const availableDates = Array.from(
    new Set(orders.map(o => getLocalDateString(o.createdAt)))
  ).filter(Boolean).sort().reverse() as string[]; // descending order (newest first)

  const targetDate = selectedDateFilter === 'Hoje' ? currentSystemDate : selectedDateFilter;

  const dateFiltered = orders.filter((ord) => {
    if (selectedDateFilter === 'All') return true;
    return getLocalDateString(ord.createdAt) === targetDate;
  });

  const totalTonnes = dateFiltered
    .filter(o => o.status === 'Completed')
    .reduce((acc, curr) => acc + curr.weight, 0);

  const pendingCount = dateFiltered.filter(o => o.status === 'Waiting').length;
  const urgentCount = dateFiltered.filter(o => o.status === 'Waiting' && o.urgent).length;
  const completedCount = dateFiltered.filter(o => o.status === 'Completed').length;
  const draftCount = dateFiltered.filter(o => o.status === 'Draft').length;

  // Filter lists based on Search Query and Status Tabs
  const filteredOrders = dateFiltered.filter((ord) => {
    const matchesSearch = ord.plate.toLowerCase().includes(searchPlate.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'All' || ord.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Truck className="h-10 w-10 text-[#117A4A] animate-bounce" />
          <h3 className="font-semibold text-[#1E293B] font-mono text-sm text-center">Carregando Banco de Dados Operacional...</h3>
          <p className="text-xs text-neutral-400 font-sans text-center">Sincronizando com Firestore corporativo Fertipar em nuvem</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-800 flex flex-col font-sans" id="desk-applet-root">
      
      {/* 1. Brand Top Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="bg-[#117A4A] text-white p-2.5 rounded-lg flex items-center justify-center shadow-sm">
              <Truck className="h-6 w-6 stroke-[1.8] text-white-50 flex-shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#117A4A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                  Grupo Fertipar
                </span>
                <span className="text-[10px] font-mono text-slate-400">v4.2.1-Pista</span>
              </div>
              <h1 className="text-xl font-display font-semibold text-[#1E293B] tracking-tight">
                Marcação e Fluxo de Veículos
              </h1>
            </div>
          </div>

          {/* Unified Desk Perspective / Role Switching Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-neutral-200">
            <button
              onClick={() => {
                setActiveRole('Logistica');
                setIsRegistering(false);
                setOrderToEdit(null);
                setWarningMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg transition-all ${
                activeRole === 'Logistica'
                  ? 'bg-[#117A4A] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              id="role-switch-logistics"
            >
              <UserSquare2 className="h-4 w-4" />
              1. Marcação (Patio de Triagem)
            </button>
            <button
              onClick={() => {
                setActiveRole('Portaria');
                setIsRegistering(false);
                setOrderToEdit(null);
                setWarningMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg transition-all ${
                activeRole === 'Portaria'
                  ? 'bg-[#117A4A] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              id="role-switch-gatehouse"
            >
              <Anchor className="h-4 w-4" />
              2. Logistica
            </button>
          </div>

          {/* Clear database action */}
          <button 
            onClick={handleClearDatabase}
            title="Zerar todo o Banco de Dados"
            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold ml-2"
          >
            <Trash2 className="h-4 w-4" />
            Zerar Banco
          </button>
        </div>
      </header>

      {/* 2. Triagem Statistics Banner Metrics Bar */}
      <section className="bg-slate-100 border-b border-neutral-200/80 py-6 px-6" id="stats-banner-date-controls">
        <div className="max-w-[1600px] mx-auto mb-5 bg-white p-4 rounded-xl border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          {/* Active Operating status & new day action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100 font-sans text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Dia de Operação: <strong>{formatDateBR(currentSystemDate)}</strong></span>
            </div>
            
            <button
              onClick={() => {
                setInputNewDayDate(getNextDayString(currentSystemDate));
                setIsNewDayModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-semibold rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              title="Iniciar nova rotina de dia operacional"
            >
              <Sunrise className="h-3.5 w-3.5 text-emerald-400" />
              Virada de Turno / Novo Dia
            </button>
          </div>

          {/* Historical filter picker */}
          <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              Filtrar por Período:
            </span>
            <div className="relative">
              <select
                value={selectedDateFilter}
                onChange={(e) => {
                  setSelectedDateFilter(e.target.value);
                  setSelectedOrder(null); // Deselect row to prevent timeline mismatch
                }}
                className="appearance-none bg-[#F8FAFC] border border-neutral-300 rounded-lg pl-3 pr-9 py-1.5 text-xs font-semibold text-neutral-700 outline-none focus:border-[#117A4A] focus:bg-white cursor-pointer select-none"
              >
                <option value="Hoje">Hoje ({formatDateBR(currentSystemDate)})</option>
                {availableDates
                  .filter((date) => date !== currentSystemDate)
                  .map((date) => (
                    <option key={date} value={date}>
                      Dia Anterior ({formatDateBR(date)})
                    </option>
                  ))}
                <option value="All">Histórico Completo (Consultar Tudo)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card Meta 1 */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                {selectedDateFilter === 'Hoje' ? 'Volumetria Concluída (Hoje)' : selectedDateFilter === 'All' ? 'Volumetria Concluída (Total)' : `Volumetria em ` + formatDateBR(selectedDateFilter)}
              </p>
              <p className="text-2xl font-display font-semibold text-[#1E293B] mt-1">
                {totalTonnes.toFixed(2)} <span className="text-xs font-mono text-neutral-400">TO</span>
              </p>
            </div>
            <div className="h-10 w-10 bh-slate-50 rounded-full flex items-center justify-center p-2 text-emerald-600 bg-emerald-50">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* Card Meta 2 */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                {selectedDateFilter === 'Hoje' ? 'Fila Pendente (Hoje)' : selectedDateFilter === 'All' ? 'Fila Pendente (Total)' : `Pendentes em ` + formatDateBR(selectedDateFilter)}
              </p>
              <p className="text-2xl font-display font-semibold text-[#1E293B] mt-1">
                {pendingCount} <span className="text-xs font-sans font-normal text-neutral-400">veículos</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full flex items-center justify-center p-2 text-amber-600 bg-amber-50">
              <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          {/* Card Meta 3 */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                {selectedDateFilter === 'Hoje' ? 'Triagens Concluídas (Hoje)' : selectedDateFilter === 'All' ? 'Triagens Concluídas (Total)' : `Concluídos em ` + formatDateBR(selectedDateFilter)}
              </p>
              <p className="text-2xl font-display font-semibold text-[#117A4A] mt-1">
                {completedCount} <span className="text-xs font-mono text-neutral-400">Ordens</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full flex items-center justify-center p-2 text-[#0E6C40] bg-emerald-50/70 justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          {/* Card Meta 4: Pulsing priority monitor */}
          <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
            urgentCount > 0 
              ? 'bg-rose-50 border-rose-300 animate-pulse-urgent' 
              : 'bg-white border-neutral-200'
          }`}>
            <div>
              <p className="text-[10px] font-mono tracking-wider text-rose-700 font-bold uppercase">
                {selectedDateFilter === 'Hoje' ? 'Aberturas Críticas Urgentes' : selectedDateFilter === 'All' ? 'Urgentes em Aberto' : `Urgências em ` + formatDateBR(selectedDateFilter)}
              </p>
              <p className="text-2xl font-display font-bold text-rose-950 mt-1">
                {urgentCount} <span className="text-xs font-sans font-normal text-rose-600">urgências</span>
              </p>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center p-2 ${
              urgentCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-neutral-400'
            }`}>
              <BadgeAlert className={`h-5 w-5 ${urgentCount > 0 ? 'animate-bounce' : ''}`} />
            </div>
          </div>

        </div>
      </section>

      {/* 3. Action warning notifications */}
      {warningMessage && (
        <div className="bg-amber-50 border-y border-amber-300 text-amber-900 px-6 py-4">
          <div className="max-w-[1600px] mx-auto flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold">{warningMessage}</p>
            </div>
            <button 
              onClick={() => setWarningMessage(null)}
              className="text-amber-800 hover:text-amber-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {operationSuccessMessage && (
        <div className="bg-emerald-50 border-y border-emerald-300 text-emerald-950 px-6 py-4">
          <div className="max-w-[1600px] mx-auto flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold">{operationSuccessMessage}</p>
            </div>
            <button 
              onClick={() => setOperationSuccessMessage(null)}
              className="text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Core Body Section */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Column Left (Main dispatch workspace) - 8 span */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* If Role is LOGISTICS and User clicked "Nova Emissao" or is Editing */}
          {activeRole === 'Logistica' && isRegistering ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display font-semibold text-neutral-900">
                  {orderToEdit ? 'Modificação de Cadastro de Veículo' : 'Configuração de Nova Carga'}
                </h2>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setOrderToEdit(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  <Undo className="h-3.5 w-3.5" />
                  Voltar para a Fila principal
                </button>
              </div>
              <OrderForm 
                onSave={handleSaveOrder} 
                orderToEdit={orderToEdit}
                onCancelEdit={() => {
                  setIsRegistering(false);
                  setOrderToEdit(null);
                }}
              />
            </div>
          ) : (
            
            /* Main Vehicle List and Filer Desk */
            <div className="bg-white rounded-lg border border-neutral-200 shadow-xs flex flex-col overflow-hidden" id="main-desk-registry">
              
              {/* Header inside table workspace */}
              <div className="p-5 border-b border-neutral-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search Bar Plate */}
                <div className="relative w-full md:max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-neutral-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar por Placa (Mercosul)..."
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-[#117A4A] tracking-wider"
                    id="universal-search-input"
                  />
                  {searchPlate && (
                    <button 
                      onClick={() => setSearchPlate('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter segments visual tabs */}
                <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
                  <button
                    onClick={() => setSelectedStatusFilter('All')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      selectedStatusFilter === 'All'
                        ? 'bg-[#117A4A] text-white'
                        : 'bg-white hover:bg-slate-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    Todos
                    <span className="bg-black/10 text-neutral-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {orders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('Waiting')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      selectedStatusFilter === 'Waiting'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    Aguardando Portaria
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {pendingCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('Draft')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      selectedStatusFilter === 'Draft'
                        ? 'bg-slate-700 text-white'
                        : 'bg-white hover:bg-slate-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    Rascunho
                    <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {draftCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('Completed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      selectedStatusFilter === 'Completed'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white hover:bg-slate-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    Concluído
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {completedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStatusFilter('Cancelled')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      selectedStatusFilter === 'Cancelled'
                        ? 'bg-rose-700 text-white'
                        : 'bg-white hover:bg-slate-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    Cancelados
                    <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {orders.filter(o => o.status === 'Cancelled').length}
                    </span>
                  </button>
                </div>

                {/* Create action strictly for Logistics Role */}
                {activeRole === 'Logistica' && (
                  <button
                    onClick={() => {
                      setOrderToEdit(null);
                      setIsRegistering(true);
                    }}
                    className="px-4 py-2 bg-[#117A4A] text-white text-xs font-bold rounded-lg hover:bg-[#0E6C40] transition-colors inline-flex items-center gap-1.5 shadow-sm ml-auto cursor-pointer"
                    id="btn-new-load"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Emissão
                  </button>
                )}
              </div>

              {/* Table of Orders */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-slate-50 text-[11px] font-mono tracking-wider text-neutral-500 uppercase">
                      <th className="py-3 px-4">CONTROLE</th>
                      <th className="py-3 px-4">VEÍCULO (PLACA)</th>
                      <th className="py-3 px-4">MOTORISTA / CARRIER</th>
                      <th className="py-3 px-4">PESO (TON)</th>
                      <th className="py-3 px-4">ANEXOS</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-center">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-neutral-500 bg-slate-50/20">
                          <Truck className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                          Nenhum veículo encontrado com os filtros atuais na pista de triagem.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => {
                        const isUrgentWaiting = ord.status === 'Waiting' && ord.urgent;
                        const isSelected = selectedOrder?.id === ord.id;
                        
                        return (
                          <tr 
                            key={ord.id}
                            className={`group text-xs transition-colors hover:bg-slate-50/50 cursor-pointer ${
                              isSelected ? 'bg-emerald-50/45 hover:bg-emerald-50/60' : ''
                            } ${isUrgentWaiting ? 'bg-rose-50/20' : ''}`}
                            onClick={() => {
                              setSelectedOrder(ord);
                              setWarningMessage(null);
                            }}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-neutral-400">
                              {ord.id}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-sm bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[#1E293B] inline-block tracking-wider w-fit">
                                  {ord.plate}
                                </span>
                                {isUrgentWaiting && (
                                  <span className="text-[9px] text-rose-600 font-bold mt-1 inline-flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping"></span>
                                    CHAMADO URGENTE
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-neutral-900">{ord.driverName}</span>
                                <span className="text-[10px] text-neutral-500">{ord.carrier}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-neutral-800 font-semibold text-right max-w-[60px]">
                              {ord.weight.toFixed(3)} t
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 text-neutral-500 font-mono text-[10px]">
                                <FileText className="h-3.5 w-3.5 text-neutral-400" />
                                <span>{ord.protocols.length} arq.</span>
                                
                                {/* Quick verification counter */}
                                {ord.protocols.length > 0 && (
                                  <span className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] ${
                                    ord.protocols.every(p => p.viewed && p.printed)
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {ord.protocols.filter(p => p.viewed && p.printed).length}/{ord.protocols.length} OK
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border capitalize ${
                                getStatusBadgeStyles(ord.status)
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  ord.status === 'Waiting' ? 'bg-amber-500' :
                                  ord.status === 'Completed' ? 'bg-emerald-500' :
                                  ord.status === 'Cancelled' ? 'bg-rose-500' : 'bg-slate-400'
                                }`}></span>
                                {translateStatus(ord.status)}
                              </span>
                            </td>

                            {/* Actions Column */}
                            <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-1.5">
                                
                                {activeRole === 'Logistica' ? (
                                  /* LOGISTICS ACTIONS BLOCK */
                                  <>
                                    {/* Edit draft or edit before completion */}
                                    {ord.status !== 'Completed' && ord.status !== 'Cancelled' && (
                                      <button
                                        onClick={() => startEditOrder(ord)}
                                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                                        title="Editar Ficha de Carga"
                                      >
                                        Editar
                                      </button>
                                    )}

                                    {/* Sovereign cancellation button */}
                                    {ord.status !== 'Cancelled' && ord.status !== 'Completed' && (
                                      <button
                                        onClick={() => triggerCancelOrder(ord)}
                                        className="px-2 py-1 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-200 transition-colors"
                                        title="Cancelar Ordem Imediatamente"
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                    
                                    {(ord.status === 'Completed' || ord.status === 'Cancelled') && (
                                      <span className="text-[10px] text-neutral-400 italic">Histórico</span>
                                    )}
                                  </>
                                ) : (
                                  /* GATEHOUSE / BILLING PORTARIA ACTIONS BLOCK */
                                  <>
                                    {/* Action to change status to Wait to Closed (Completed) */}
                                    {ord.status === 'Waiting' ? (
                                      <button
                                        onClick={() => openWeighingGateOrder(ord.id)}
                                        className={`px-3 py-1 text-[11px] font-bold rounded shadow-xs focus:outline-none transition-all active:scale-[0.98] ${
                                          ord.protocols.every(p => p.viewed && p.printed)
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                        }`}
                                        title={
                                          ord.protocols.every(p => p.viewed && p.printed)
                                            ? 'Autorizar Pesagem de Entrada'
                                            : 'É necessário visualizar e imprimir todos os protocolos anexados'
                                        }
                                      >
                                        Ordem Aberta
                                      </button>
                                    ) : ord.status === 'Completed' ? (
                                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1 text-[11px]">
                                        <Check className="h-3.5 w-3.5 stroke-[3]" /> Peso OK
                                      </span>
                                    ) : ord.status === 'Cancelled' ? (
                                      <span className="text-rose-600 text-[11px] italic">Cancelado</span>
                                    ) : (
                                      <span className="text-slate-500 text-[11px] italic">Rascunho</span>
                                    )}
                                  </>
                                )}

                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Congestion Alert Label at Table Footer */}
              <div className="bg-slate-50 p-4 border-t border-neutral-200 text-xs font-mono text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span>Placas analisadas em tempo real na portaria sob os parâmetros oficiais da Fertipar.</span>
                <span className="text-neutral-600 font-semibold bg-white border border-neutral-200 px-3 py-1 rounded">
                  Fila de Espera Atual: <strong className="text-amber-700 font-bold">{pendingCount} veículos</strong> na pista de triagem.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Column Right (Detail panel & chronological trace) - 4 span */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {selectedOrder ? (
            /* Selected detailed record panel */
            <div className="space-y-6">
              
              {/* Order quick overview card */}
              <div className="bg-white rounded-lg border border-neutral-200 shadow-xs overflow-hidden">
                <div className="bg-[#1E293B] text-white px-5 py-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Detalhamento da Ordem</span>
                    <h3 className="font-mono font-bold text-base text-white">{selectedOrder.id}</h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border capitalize ${
                    getStatusBadgeStyles(selectedOrder.status)
                  }`}>
                    {translateStatus(selectedOrder.status)}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Big Grid Info layout */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-slate-50 p-2.5 rounded border border-neutral-100">
                      <span className="block text-[10px] text-neutral-400 font-bold uppercase">PLACA</span>
                      <span className="text-sm font-bold text-neutral-800">{selectedOrder.plate}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-neutral-100">
                      <span className="block text-[10px] text-neutral-400 font-bold uppercase">PESO ESTIMADO</span>
                      <span className="text-sm font-bold text-neutral-800">{selectedOrder.weight.toFixed(3)} TO</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 font-sans bg-slate-50/50 p-3.5 rounded-lg border border-neutral-200">
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] block uppercase font-bold">Driver (Motorista):</span>
                      <span className="font-semibold text-neutral-800 text-sm">{selectedOrder.driverName}</span>
                    </div>
                    <hr className="border-neutral-200/60" />
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] block uppercase font-bold">Carrier / Transportadora:</span>
                      <span className="font-semibold text-neutral-800">{selectedOrder.carrier}</span>
                    </div>
                  </div>

                  {/* Justification block if cancelled */}
                  {selectedOrder.status === 'Cancelled' && selectedOrder.cancelReason && (
                    <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-xs">
                      <div className="flex gap-1.5 items-center text-rose-800 font-bold font-mono text-[10px] uppercase mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                        Motivo do Cancelamento:
                      </div>
                      <p className="text-[#991B1B] leading-relaxed text-[11px] font-sans">
                        {selectedOrder.cancelReason}
                      </p>
                    </div>
                  )}

                  {/* PDF files checker validation block */}
                  <div className="space-y-2 border-t border-neutral-100 pt-4">
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                      Protocolos Oficiais / NF-e e Validação
                    </h4>
                    
                    {selectedOrder.protocols.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic">Nenhum protocolo ou NF-e anexado a esta ordem.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOrder.protocols.map((p) => {
                          const bothDone = p.viewed && p.printed;
                          return (
                            <div 
                              key={p.id}
                              onClick={() => {
                                // Automatically open the protocol modal viewer
                                setActiveProtocol({
                                  orderId: selectedOrder.id,
                                  protocol: p
                                });
                                // Automatically mark as viewed upon opening
                                handleMarkProtocolViewed(selectedOrder.id, p.id);
                              }}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs font-mono hover:-translate-y-[1px] hover:shadow-xs ${
                                bothDone 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                                  : 'bg-amber-50/75 border-amber-200 text-amber-950'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold truncate" title={p.name}>{p.name}</p>
                                <div className="flex gap-2 text-[10px] text-neutral-500 mt-1">
                                  <span>{p.size}</span>
                                  <span>•</span>
                                  <span className={p.viewed ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                                    {p.viewed ? 'Visualizado OK' : 'Não visto'}
                                  </span>
                                  <span>•</span>
                                  <span className={p.printed ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                                    {p.printed ? 'Impresso OK' : 'Pend. Impressão'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-neutral-400 hover:text-neutral-700 self-center">
                                <Eye className="h-4 w-4 text-[#117A4A]" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Flow control button directly available inside details section */}
                  {selectedOrder.status === 'Waiting' && activeRole === 'Portaria' && (
                    <div className="pt-3 border-t border-neutral-100">
                      <button
                        onClick={() => openWeighingGateOrder(selectedOrder.id)}
                        className={`w-full py-2.5 text-xs font-bold rounded-lg shadow-sm focus:outline-none transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 ${
                          selectedOrder.protocols.every(p => p.viewed && p.printed)
                            ? 'bg-[#117A4A] hover:bg-[#0E6C40] text-white'
                            : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Aprovar Documentação & Abrir Ordem
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Chronological Audit timeline representation */}
              <AuditTimeline timeline={selectedOrder.timeline} />

            </div>
          ) : (
            <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-xs text-neutral-400 shadow-sm">
              <BookOpen className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              Nenhum veículo selecionado para inspeção cadastral.
              <p className="mt-1 text-[11px] text-neutral-500">Clique em qualquer linha da tabela para analisar protocolos e log de auditoria detalhado.</p>
            </div>
          )}

        </div>

      </main>

      {/* 5. Collapsible System-Wide Audits Records (Zeroing alerts and removals) */}
      <section className="bg-slate-50 border-t border-neutral-200 py-6 px-6 font-mono" id="system-audit-footer-section">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="text-xs font-bold uppercase text-neutral-700 tracking-wider">
                Auditoria Geral do Banco de Dados
              </h3>
            </div>
            <button
              onClick={() => setShowSystemLogsSection(!showSystemLogsSection)}
              className="text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3.5 py-1.5 cursor-pointer hover:bg-slate-100 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-[#117A4A]" />
              {showSystemLogsSection ? 'Ocultar Logs' : `Visualizar Logs (${systemLogs.length})`}
            </button>
          </div>

          {showSystemLogsSection && (
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 text-[11px] text-neutral-500 border-b border-slate-200 flex items-center gap-2 font-sans">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Registros imutáveis de limpezas de banco e exclusão de triagens em tempo real.</span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[300px] overflow-y-auto text-xs py-1">
                {systemLogs.length === 0 ? (
                  <p className="p-8 text-center text-neutral-400 italic">Nenhum evento administrativo de alteração gravado até o momento.</p>
                ) : (
                  systemLogs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-slate-50/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="bg-slate-100 text-slate-700 font-mono text-[9px] px-2 py-0.5 rounded border border-slate-200 font-bold uppercase tracking-wider whitespace-nowrap mt-0.5">
                          {log.action}
                        </span>
                        <div>
                          <p className="text-neutral-700 font-sans leading-relaxed">{log.details}</p>
                          <p className="text-[10px] text-neutral-400 mt-1">ID Auditor: {log.id}</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end text-[10px] font-mono text-neutral-400">
                        <span className="font-semibold text-emerald-800">Por: {log.user}</span>
                        <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Generic persistent footer copyright */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 font-mono">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Grupo Fertipar S/A. Todos os direitos reservados. Desk de Controle de Acesso e Pesagem.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-600 cursor-pointer">Normas de Portaria</span>
            <span>•</span>
            <span className="hover:text-neutral-600 cursor-pointer">Suporte TI</span>
          </div>
        </div>
      </footer>

      {/* 7. Sovereign Cancellation Explanation Drawer Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-155">
            <div className="text-rose-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
              <h3 className="font-semibold text-lg font-mono text-[#1E293B]">Cancelar Admissão de Carga</h3>
            </div>
            
            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Você está cancelando definitivamente o fluxo do veículo com placa{' '}
              <strong className="font-mono text-neutral-800 font-bold">{cancelModalOrder.plate}</strong>. 
              Esta ação é imutável e será registrada permanentemente nos servidores de auditoria interna.
            </p>

            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
              Justificativa / Motivo Técnico *
            </label>
            <textarea
              id="cancellation-reason-textarea"
              placeholder="Ex: Nota fiscal cancelada pela contabilidade ou veículo com problema mecânico..."
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value);
                setCancelError('');
              }}
              rows={3}
              className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:outline-none focus:border-rose-600 bg-slate-50/50"
            />
            {cancelError ? (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {cancelError}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 bg-transparent rounded"
              >
                Voltar
              </button>
              <button
                onClick={confirmCancellation}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-all active:scale-[0.98] shadow-sm shadow-rose-900/10"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Overlay Protocol Document Viewer */}
      {activeProtocol && selectedOrder && (
        <ProtocolViewer
          protocol={activeProtocol.protocol}
          driverName={selectedOrder.driverName}
          plate={selectedOrder.plate}
          weight={selectedOrder.weight}
          carrier={selectedOrder.carrier}
          onClose={() => setActiveProtocol(null)}
          onMarkAsViewed={() => handleMarkProtocolViewed(selectedOrder.id, activeProtocol.protocol.id)}
          onMarkAsPrinted={() => handleMarkProtocolPrinted(selectedOrder.id, activeProtocol.protocol.id)}
        />
      )}

      {/* 9. Modal Overlay: Virada de Turno / Novo Dia */}
      {isNewDayModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="new-day-modal">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-emerald-700 mb-4 flex items-center gap-2">
              <Sunrise className="h-6 w-6 stroke-[1.8]" />
              <h3 className="font-semibold text-lg font-mono text-[#1E293B]">Virada de Turno & Novo Ciclo</h3>
            </div>
            
            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              A rotina de <strong>Virada de Turno</strong> encerra formalmente as atividades do dia operacional atual (<strong>{formatDateBR(currentSystemDate)}</strong>). 
              Esta ação prepara o Desk de triagem de acordo com os seguintes procedimentos automatizados:
            </p>

            <ul className="text-xs text-neutral-600 space-y-2.5 mb-5 bg-[#F8FAFC] p-3.5 rounded-lg border border-neutral-200">
               <li className="flex gap-2 items-start">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Preservação Histórica:</strong> Todos os lançamentos concluídos e cancelados serão arquivados hermeticamente sob a data de <strong>{formatDateBR(currentSystemDate)}</strong> e poderão ser consultados a qualquer momento pelo filtro de período.
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Migração de Fila Ativa:</strong> Veículos que ainda estão em andamento ou rascunho (<strong>Waiting</strong> ou <strong>Draft</strong>) serão transferidos automaticamente para o cronograma do novo dia, evitando ter que redigitar os dados.
                </span>
              </li>
              <li className="flex gap-2 items-start">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Zeramento de Painel:</strong> O painel principal começará do zero para as novas pesagens e triagens que entrarem hoje.
                </span>
              </li>
            </ul>

            <div className="mb-5">
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-mono">
                Data do Novo Dia Operacional (Formato AAAA-MM-DD):
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={inputNewDayDate}
                  onChange={(e) => setInputNewDayDate(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setInputNewDayDate(getNextDayString(currentSystemDate))}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-neutral-300 rounded-lg text-xs font-mono font-semibold cursor-pointer"
                  title="Sugerir dia seguinte sequencial"
                >
                  D +1
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewDayModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 bg-transparent rounded cursor-pointer"
              >
                Voltar ao Painel
              </button>
              <button
                type="button"
                onClick={() => handleProceedToNewDay(inputNewDayDate)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all active:scale-[0.98] shadow-sm shadow-emerald-950/10 inline-flex items-center gap-1.5 cursor-pointer"
                disabled={!inputNewDayDate}
              >
                Confirmar Virada de Turno S/A
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Security Database Zeroing / Deletion Hub Modal (By-passing native prompt iframe blockade) */}
      {isClearDbModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="clear-database-modal">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center gap-3">
              <Trash2 className="h-6 w-6 text-rose-200" />
              <div>
                <h3 className="font-semibold text-base font-mono">Central de Limpeza e Exclusão</h3>
                <p className="text-xs text-rose-100">Controles de segurança da base de dados e auditoria legal</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Você pode optar por esvaziar totalmente a pista de triagem ou excluir apenas o registro selecionado na tabela. 
                De acordo com as diretrizes do Grupo Fertipar, <strong>todas as exclusões geram logs de auditoria</strong> imutáveis.
              </p>

              {/* Radio options selector */}
              <div className="bg-slate-50 border border-neutral-200 rounded-lg p-3.5 space-y-3">
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Opções Disponíveis:</span>
                
                {/* Selected Order only */}
                <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer select-none text-xs transition-colors ${
                  !selectedOrder 
                    ? 'opacity-50 cursor-not-allowed bg-slate-100/50 border-neutral-200 text-neutral-400' 
                    : clearDbOption === 'selected'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-white hover:bg-slate-100 border-neutral-300 text-neutral-700'
                }`}>
                  <input
                    type="radio"
                    name="clear-option"
                    disabled={!selectedOrder}
                    checked={clearDbOption === 'selected' && !!selectedOrder}
                    onChange={() => setClearDbOption('selected')}
                    className="mt-0.5 rounded text-rose-700 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold">Excluir Apenas o Registro Selecionado</span>
                    {selectedOrder ? (
                      <p className="text-[10px] text-rose-700 font-mono mt-1">
                        Caminhão Placa <strong className="underline">{selectedOrder.plate}</strong> (ID: {selectedOrder.id}, Motorista: {selectedOrder.driverName || 'Não Identificado'})
                      </p>
                    ) : (
                      <p className="text-[10px] italic mt-1">Nenhum controle selecionado na tabela principal.</p>
                    )}
                  </div>
                </label>

                {/* Clear all */}
                <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer select-none text-xs transition-colors ${
                  clearDbOption === 'all'
                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                    : 'bg-white hover:bg-slate-100 border-neutral-300 text-neutral-700'
                }`}>
                  <input
                    type="radio"
                    name="clear-option"
                    checked={clearDbOption === 'all'}
                    onChange={() => setClearDbOption('all')}
                    className="mt-0.5 rounded text-rose-700 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-semibold text-rose-800">🔴 Zerar Todo o Sistema (Apagar tudo definitivamente)</span>
                    <p className="text-[10px] text-[#991B1B] mt-0.5 font-mono">
                      Apaga todo o histórico de placas, triagens e ordens da nuvem ({orders.length} cadastros).
                    </p>
                  </div>
                </label>
              </div>

              {/* Confirmation barriers input constraint */}
              <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-4">
                <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 font-mono">
                  Confirmar exclusão (Digite a palavra <strong className="underline">ZERAR</strong>):
                </label>
                <input
                  type="text"
                  placeholder="Ex: ZERAR"
                  value={clearDbConfirmationCode}
                  onChange={(e) => {
                    setClearDbConfirmationCode(e.target.value.toUpperCase());
                    setClearDbError('');
                  }}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-lg border border-rose-300 bg-white text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-neutral-300 tracking-widest text-center font-bold"
                />
                {clearDbError && (
                  <p className="mt-2 text-xs text-rose-700 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {clearDbError}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-neutral-200">
              <span className="text-[10px] font-mono text-neutral-400">Auditoria ativa 🔒</span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsClearDbModalOpen(false);
                    setClearDbConfirmationCode('');
                  }}
                  className="px-4 py-2 border border-neutral-300 text-neutral-600 bg-white hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (clearDbConfirmationCode !== 'ZERAR') {
                      setClearDbError('Validação falhou. É obrigatório digitar ZERAR no campo para realizar a ação.');
                      return;
                    }
                    if (clearDbOption === 'all') {
                      await executeClearDatabaseAll();
                    } else {
                      await executeClearDatabaseSelected();
                    }
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all active:scale-[0.98] shadow-sm shadow-rose-900/10 cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
