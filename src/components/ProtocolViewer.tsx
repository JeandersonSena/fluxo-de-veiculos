import React from 'react';
import { FileText, Printer, Check, Eye, X } from 'lucide-react';
import { Protocol } from '../types';

interface ProtocolViewerProps {
  protocol: Protocol;
  onClose: () => void;
  onMarkAsViewed: () => void;
  onMarkAsPrinted: () => void;
  driverName: string;
  plate: string;
  weight: number;
  carrier: string;
}

export default function ProtocolViewer({
  protocol,
  onClose,
  onMarkAsViewed,
  onMarkAsPrinted,
  driverName,
  plate,
  weight,
  carrier,
}: ProtocolViewerProps) {
  const isRealFile = protocol.content.startsWith('data:');

  const handleOpenInNewTab = () => {
    if (isRealFile) {
      const newTab = window.open('', '_blank');
      if (newTab) {
        if (protocol.fileType.includes('pdf')) {
          newTab.document.write(`
            <html>
              <head>
                <title>${protocol.name}</title>
                <style>
                  body, html { margin:0; padding:0; height:100%; width:100%; overflow:hidden; background-color: #2f3542; }
                  iframe, embed { width:100%; height:100%; border:none; }
                </style>
              </head>
              <body>
                <embed src="${protocol.content}" type="application/pdf" />
              </body>
            </html>
          `);
        } else {
          newTab.document.write(`
            <html>
              <head>
                <title>${protocol.name}</title>
                <style>
                  body { margin:0; padding:20px; background:#f1f5f9; display:flex; justify-content:center; align-items:center; min-height:100vh; }
                  img { max-width:100%; max-height:95vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.15); border:1px solid #cbd5e1; }
                </style>
              </head>
              <body>
                <img src="${protocol.content}" />
              </body>
            </html>
          `);
        }
        newTab.document.close();
      }
    }
  };

  // Printing logic optimized for A4 paper and compatible with browser security policies
  const handlePrint = () => {
    onMarkAsPrinted();

    if (isRealFile) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        if (protocol.fileType.includes('image')) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Imprimir Anexo - ${protocol.name}</title>
                <style>
                  body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                    background-color: #2f3542;
                    display: flex;
                    flex-direction: column;
                  }
                  .no-print {
                    background: #117A4A;
                    color: white;
                    padding: 12px 24px;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #0E6C40;
                    box-sizing: border-box;
                  }
                  .img-container {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    box-sizing: border-box;
                  }
                  img {
                    max-width: 100%;
                    max-height: 90vh;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  }
                  @media print {
                    .no-print {
                      display: none !important;
                    }
                    body, html {
                      background: white;
                      overflow: visible;
                      height: 100vh !important;
                    }
                    .img-container {
                      padding: 0 !important;
                      display: block !important;
                    }
                    img {
                      max-width: 100%;
                      max-height: 100vh;
                      display: block;
                      margin: 0 auto;
                      object-fit: contain;
                      box-shadow: none !important;
                      border: none !important;
                    }
                    @page {
                      size: A4 portrait;
                      margin: 0;
                    }
                  }
                </style>
              </head>
              <body>
                <div class="no-print">
                  <div>
                    <strong>📄 Impressão de Anexo - ${protocol.name}</strong>
                    <p style="margin:4px 0 0 0; font-size:11px; opacity:0.9;">Ajustado para formato de folha A4 em Retrato.</p>
                  </div>
                  <button onclick="window.print()" style="background:white; border:none; color:#117A4A; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">🖨️ Imprimir Agora</button>
                </div>
                <div class="img-container">
                  <img src="${protocol.content}" onload="setTimeout(function() { window.print(); }, 400);" />
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
        } else if (protocol.fileType.includes('pdf')) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Imprimir PDF - ${protocol.name}</title>
                <style>
                  body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                    background-color: #2f3542;
                    display: flex;
                    flex-direction: column;
                  }
                  .no-print {
                    background: #117A4A;
                    color: white;
                    padding: 12px 24px;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #0E6C40;
                    box-sizing: border-box;
                  }
                  embed {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    border: none;
                  }
                  @media print {
                    .no-print {
                      display: none !important;
                    }
                    body, html {
                      background: white;
                      height: 100vh !important;
                      width: 100vw !important;
                      overflow: visible;
                    }
                    embed {
                      width: 100% !important;
                      height: 100vh !important;
                    }
                    @page {
                      size: A4 portrait;
                      margin: 0;
                    }
                  }
                </style>
              </head>
              <body>
                <div class="no-print">
                  <div>
                    <strong>📄 Impressão de PDF - ${protocol.name}</strong>
                    <p style="margin:4px 0 0 0; font-size:11px; opacity:0.9;">Formato A4 Portrait. Se desejar, use também o botão de impressora nativo no canto superior do leitor abaixo.</p>
                  </div>
                  <button onclick="window.print()" style="background:white; border:none; color:#117A4A; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">🖨️ Imprimir Agora</button>
                </div>
                <embed src="${protocol.content}" type="application/pdf" />
                <script>
                  setTimeout(function() {
                    window.print();
                  }, 450);
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        return;
      }
    }

    // Default fallback
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" id="protocol-viewer-modal">
        {/* Header */}
        <div className="bg-[#117A4A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-emerald-200 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg font-mono font-sans">Visualizador de Documentos</h3>
              <p className="text-xs text-emerald-100/90 font-mono">{protocol.name} ({protocol.size})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/15 p-1.5 rounded-full transition-colors"
            title="Fechar Visualizador"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Protocol Metadata Bar - Product (Carga) field removed */}
        <div className="bg-slate-50 border-b border-neutral-200 px-6 py-3 flex flex-wrap gap-4 text-xs font-mono text-neutral-600">
          <div><span className="font-semibold text-[#1E293B]">Placa:</span> {plate}</div>
          <div><span className="font-semibold text-[#1E293B]">Motorista:</span> {driverName}</div>
          <div><span className="font-semibold text-[#1E293B]">Peso:</span> {weight.toFixed(2)} Toneladas</div>
          <div><span className="font-semibold text-[#1E293B]">Anexado em:</span> {new Date(protocol.uploadedAt).toLocaleString('pt-BR')}</div>
        </div>

        {/* Content Area Rendering (Displays the original attached document) */}
        <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-3xl flex flex-col gap-4">
            {isRealFile ? (
              <div className="flex flex-col gap-3 w-full">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs text-emerald-800 font-sans shadow-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-[#117A4A] flex-shrink-0" />
                    <span>Você está visualizando o <strong>documento original anexado</strong>.</span>
                  </div>
                  <button
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#117A4A] hover:bg-[#0E6C40] rounded-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Abrir em Tela Cheia
                  </button>
                </div>

                {protocol.fileType.includes('pdf') ? (
                  <div className="w-full bg-white shadow-lg rounded-lg border border-neutral-300 p-1 flex flex-col h-[55vh] relative">
                    <iframe 
                      src={protocol.content} 
                      className="w-full h-full border-none rounded" 
                      title={protocol.name} 
                    />
                  </div>
                ) : (
                  <div className="w-full bg-white shadow-lg rounded-lg border border-neutral-300 p-4 flex justify-center items-center min-h-[45vh]">
                    <img 
                      src={protocol.content} 
                      className="max-w-full max-h-[50vh] object-contain rounded-lg border border-neutral-100 shadow-xs" 
                      alt={protocol.name} 
                    />
                  </div>
                )}
                <p className="text-[10px] text-neutral-400 font-mono text-center">
                  💡 Anexo Original seguro: criptografia ativa em nuvem Fertipar da pesagem portuária
                </p>
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-lg border border-neutral-200 p-12 text-center max-w-md mx-auto my-4">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h4 className="font-semibold text-neutral-700 text-sm mb-1">Documento de Demonstração</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Esse registro possui um anexo administrativo: <strong className="font-mono text-neutral-600 block mt-1">{protocol.name}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions for the viewer */}
        <div className="bg-slate-50 p-4 border-t border-neutral-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-3 text-xs font-sans">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              protocol.viewed 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Eye className="h-3.5 w-3.5" />
              {protocol.viewed ? 'Visualizado' : 'Aguardando validação'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              protocol.printed 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Printer className="h-3.5 w-3.5" />
              {protocol.printed ? 'Impresso' : 'Pendente de Impressão'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAsViewed}
              disabled={protocol.viewed}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md border shadow-sm transition-all ${
                protocol.viewed
                  ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-default'
                  : 'bg-white hover:bg-slate-50 text-neutral-700 border-neutral-300 active:scale-[0.98]'
              }`}
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Validar Visualização
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md bg-[#117A4A] text-white hover:bg-[#0E6C40] shadow-sm tracking-wide transition-all active:scale-[0.98]"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Anexo Original
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 bg-transparent rounded-md transition-colors font-mono"
            >
              Voltar ao Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
