import React, { useState, useRef } from 'react';
import { Upload, FileCode, Check, AlertCircle, Sparkles, Trash2, Clock, ShieldCheck } from 'lucide-react';
import { Order, OrderStatus, Protocol, TimelineLog } from '../types';

interface OrderFormProps {
  onSave: (order: Partial<Order>) => void;
  orderToEdit?: Order | null;
  onCancelEdit?: () => void;
}

export default function OrderForm({ onSave, orderToEdit, onCancelEdit }: OrderFormProps) {
  const [plate, setPlate] = useState(orderToEdit?.plate || '');
  const [driverName, setDriverName] = useState(orderToEdit?.driverName || '');
  const [weight, setWeight] = useState(orderToEdit?.weight?.toString() || '');
  const [carrier, setCarrier] = useState(orderToEdit?.carrier || '');
  const [priority, setPriority] = useState<'normal' | 'alta'>(orderToEdit?.priority || 'normal');
  const [urgent, setUrgent] = useState(orderToEdit?.urgent || false);
  const [protocols, setProtocols] = useState<Protocol[]>(orderToEdit?.protocols || []);
  const [plateError, setPlateError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format/validate Plate (Mercosul or Old Format, letters and numbers, NO special chars)
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 7) {
      val = val.substring(0, 7);
    }
    setPlate(val);

    // Validate Mercosul pattern (AAA1B23) or old format (AAA1234)
    if (val.length === 0) {
      setPlateError('A placa do motorista é obrigatória.');
    } else if (val.length < 7) {
      setPlateError('A placa de veículo brasileira deve conter exatamente 7 caracteres.');
    } else {
      // General Mercosul/Brazilian plate check (7 alphanumeric)
      const isPlateValid = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(val);
      if (!isPlateValid) {
        setPlateError('Formato inválido. Utilize o formato Mercosul (ex: BRA2E19) ou Antigo (ex: ABC1234).');
      } else {
        setPlateError('');
      }
    }
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWeight(val);
    const parsed = parseFloat(val);
    if (!val) {
      setWeightError('O peso em toneladas é obrigatório.');
    } else if (isNaN(parsed) || parsed <= 0) {
      setWeightError('Digite um valor numérico decimal maior que zero.');
    } else {
      setWeightError('');
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processUploadedFiles = (files: FileList) => {
    setFileError('');
    const promises: Promise<Protocol | null>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit file size to 850 KB to prevent exceeding 1MB Cloud Firestore document ceiling
      if (file.size > 870420) { 
        setFileError(`O arquivo "${file.name}" excede o limite de 850 KB para sincronização direta em nuvem.`);
        continue;
      }

      promises.push(new Promise<Protocol | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const contentStr = e.target?.result as string || '';
          resolve({
            id: `PRT-MAN-${Math.floor(Math.random() * 900000 + 100000)}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            fileType: file.type || 'application/pdf',
            content: contentStr,
            viewed: false,
            printed: false,
            uploadedAt: new Date().toISOString()
          });
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      }));
    }

    if (promises.length > 0) {
      Promise.all(promises).then((results) => {
        const validResults = results.filter((p): p is Protocol => p !== null);
        if (validResults.length > 0) {
          setProtocols(prev => [...prev, ...validResults]);
        }
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFiles(e.target.files);
    }
  };

  // Click to generate automated official invoice
  const generateOfficialNFe = () => {
    const randomNum = Math.floor(Math.random() * 90000 + 10000);
    const mockNFe: Protocol = {
      id: `PRT-AUT-${randomNum}`,
      name: `NFE_${randomNum}_${plate || 'VEICULO'}_FERTIPAR.pdf`,
      size: `${(Math.random() * 200 + 150).toFixed(0)} KB`,
      fileType: 'application/pdf',
      content: 'MOCK_OFFICIAL_NFE_DATA',
      viewed: false,
      printed: false,
      uploadedAt: new Date().toISOString()
    };
    setProtocols(prev => [...prev, mockNFe]);
  };

  const removeProtocol = (idToRem: string) => {
    setProtocols(prev => prev.filter(p => p.id !== idToRem));
  };

  const handleSubmit = (status: OrderStatus) => {
    // Form level validation
    let hasError = false;
    
    if (!plate) {
      setPlateError('A placa do motorista é obrigatória.');
      hasError = true;
    }
    
    const parsedWeight = parseFloat(weight);
    if (!weight || isNaN(parsedWeight) || parsedWeight <= 0) {
      setWeightError('Digite um valor numérico decimal maior que zero.');
      hasError = true;
    }

    if (plateError) hasError = true;

    if (hasError) return;

    onSave({
      id: orderToEdit?.id,
      plate,
      driverName: driverName || 'Motorista Não Identificado',
      weight: parsedWeight,
      carrier: carrier || 'Particular / Próprio',
      priority,
      urgent: urgent || priority === 'alta',
      status, // Save as either 'Draft' or promote straight to 'Waiting' via 'Iniciar Processo'
      protocols,
    });

    // Reset except if editing
    if (!orderToEdit) {
      setPlate('');
      setDriverName('');
      setWeight('');
      setCarrier('');
      setPriority('normal');
      setUrgent(false);
      setProtocols([]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden" id="order-registration-form-panel">
      {/* Panel Header */}
      <div className="bg-[#117A4A] text-white px-5 py-4 border-b border-neutral-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-200" />
          <h3 className="font-semibold text-sm uppercase tracking-wider font-mono">
            {orderToEdit ? 'Alterar Registro Logístico' : 'Nova Emissão de Carga'}
          </h3>
        </div>
        {orderToEdit && (
          <span className="bg-white/20 text-white text-[10px] uppercase font-mono px-2 py-0.5 rounded">
            Modo Edição {orderToEdit.id}
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Row 1: Vehicle and Weights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
              Placa do Veículo *
            </label>
            <input
              id="plate-input"
              type="text"
              placeholder="Ex: BRA2E19 ou ABC1234"
              value={plate}
              onChange={handlePlateChange}
              maxLength={7}
              className={`w-full px-3.5 py-2 rounded-lg border text-sm font-mono tracking-widest placeholder-neutral-400 focus:outline-none transition-colors ${
                plateError 
                  ? 'border-rose-400 focus:border-rose-600 bg-rose-50/20' 
                  : 'border-neutral-300 focus:border-[#117A4A] bg-slate-50/50'
              }`}
            />
            {plateError ? (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {plateError}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-neutral-400 font-mono">Formato Mercosul ou clássico de 7 caracteres.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
              Toneladas Úteis (Peso Estimado) *
            </label>
            <input
              id="weight-input"
              type="number"
              step="any"
              placeholder="Ex: 38.420"
              value={weight}
              onChange={handleWeightChange}
              className={`w-full px-3.5 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${
                weightError 
                  ? 'border-rose-400 focus:border-rose-600 bg-rose-50/20' 
                  : 'border-neutral-300 focus:border-[#117A4A] bg-slate-50/50'
              }`}
            />
            {weightError ? (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {weightError}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-neutral-400 font-mono">Ponto decimal para toneladas (ex: 28.5).</p>
            )}
          </div>
        </div>

        {/* Row 2: Driver & Transportadora */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
              Nome Completo do Motorista
            </label>
            <input
              id="driver-name-input"
              type="text"
              placeholder="Ex: Silvano de Souza"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 bg-slate-50/50 text-sm focus:outline-none focus:border-[#117A4A] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 font-mono">
              Empresa Transportadora
            </label>
            <input
              id="carrier-input"
              type="text"
              placeholder="Ex: FertiCargas e Logística Sul"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-neutral-300 bg-slate-50/50 text-sm focus:outline-none focus:border-[#117A4A] transition-colors"
            />
          </div>
        </div>

        {/* Row 3: Dispatch Urgency & Special Controls */}
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex flex-col justify-center bg-slate-50/80 p-4 rounded-lg border border-neutral-200">
            <span className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2 font-mono">
              Controle Especial de Fluxo
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="rounded text-[#117A4A] focus:ring-[#117A4A] h-4 w-4"
                />
                <span>Urgência de Balança *</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={priority === 'alta'}
                  onChange={(e) => {
                    const nextVal = e.target.checked ? 'alta' : 'normal';
                    setPriority(nextVal);
                    if (e.target.checked) setUrgent(true);
                  }}
                  className="rounded text-[#117A4A] focus:ring-[#117A4A] h-4 w-4"
                />
                <span>Prioridade Alta</span>
              </label>
            </div>
            <p className="text-[10px] text-[#0E6C40] mt-1.5 font-mono">
              * Ativa indicador pulsante vermelho na visualização de fila da triagem.
            </p>
          </div>
        </div>

        {/* Multi-Attachment Drag and Drop Zone */}
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider font-mono">
              Protocolos & NF-e Anexadas ({protocols.length})
            </label>
            
            {/* Action to auto generate NF-e layout */}
            <button
              type="button"
              onClick={generateOfficialNFe}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#117A4A] hover:text-[#0E6C40] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-all cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-[#117A4A] animate-bounce" />
              Auto-Gerar Protocolo NF-e Oficial
            </button>
          </div>

          {/* Drag & Drop Window Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center transition-colors cursor-pointer select-none ${
              dragActive 
                ? 'border-[#117A4A] bg-emerald-50/30' 
                : 'border-neutral-300 hover:border-neutral-400 bg-slate-50/20'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.xml"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="h-8 w-8 text-[#117A4A] mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-neutral-700">
              Arraste e solte arquivos aqui de NF-e/PDFs, ou <span className="text-[#117A4A] underline font-semibold">clique para selecionar</span>
            </p>
            <p className="text-[10px] text-neutral-400 mt-1">
              Formatos aceitos: PDF, NF-e, Imagens XML/Pista (Múltiplos simultâneos)
            </p>
          </div>

          {fileError && (
            <p className="mt-2 text-xs font-mono text-rose-600 flex items-center gap-1 bg-rose-50 border border-rose-200 p-2 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
              <span>{fileError}</span>
            </p>
          )}

          {/* Attached Files list */}
          {protocols.length > 0 && (
            <div className="mt-3 divide-y divide-neutral-100 bg-slate-50 rounded-lg border border-neutral-200 overflow-hidden max-h-[160px] overflow-y-auto">
              {protocols.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-mono text-neutral-700 truncate" title={p.name}>
                      {p.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 flex-shrink-0">({p.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProtocol(p.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Remover documento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action button bar */}
        <div className="bg-slate-50 -mx-6 -mb-6 p-4 border-t border-neutral-200 flex flex-wrap justify-between items-center gap-3">
          {orderToEdit ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:bg-slate-100 rounded-lg border border-neutral-200 transition-colors"
            >
              Descartar Edição
            </button>
          ) : (
            <span className="text-[11px] text-neutral-500 font-mono italic">
              * Campos com asteriscos são mandatórios
            </span>
          )}

          <div className="flex items-center gap-2">
            {/* Draft status action */}
            <button
              type="button"
              onClick={() => handleSubmit('Draft')}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-slate-50 hover:text-neutral-900 transition-all active:scale-[0.98] shadow-xs"
            >
              Salvar como Rascunho
            </button>

            {/* Finit State Machine action: change to Waiting instantly */}
            <button
              type="button"
              onClick={() => handleSubmit('Waiting')}
              className="px-5 py-2 text-xs font-bold text-white bg-[#117A4A] hover:bg-[#0E6C40] rounded-lg transition-all active:scale-[0.98] shadow-md shadow-emerald-900/10 inline-flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Iniciar Processo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
