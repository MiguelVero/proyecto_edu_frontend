// ticket.service.ts - versión mejorada con descarga de imagen

import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  
  constructor() {}

  private formatearMoneda(valor: any): string {
    if (valor === null || valor === undefined) return 'S/ 0.00';
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(num)) return 'S/ 0.00';
    return `S/ ${num.toFixed(2)}`;
  }

  private formatearFecha(value: string | Date, formato: string = 'dd/MM/yyyy'): string {
    if (!value) return '';
    
    const esFechaPura = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    
    let fecha: Date;
    let usarUTC = false;
    
    if (esFechaPura) {
      const [year, month, day] = value.split('-').map(Number);
      fecha = new Date(Date.UTC(year, month - 1, day));
      usarUTC = true;
    } else {
      fecha = new Date(value);
      usarUTC = false;
    }
    
    if (isNaN(fecha.getTime())) return '';
    
    const getDia = () => usarUTC ? fecha.getUTCDate() : fecha.getDate();
    const getMes = () => usarUTC ? fecha.getUTCMonth() + 1 : fecha.getMonth() + 1;
    const getAño = () => usarUTC ? fecha.getUTCFullYear() : fecha.getFullYear();
    const getHoras = () => usarUTC ? fecha.getUTCHours() : fecha.getHours();
    const getMinutos = () => usarUTC ? fecha.getUTCMinutes() : fecha.getMinutes();
    
    const dia = getDia().toString().padStart(2, '0');
    const mes = getMes().toString().padStart(2, '0');
    const año = getAño();
    
    const formatearHoraAMPM = (): string => {
      let horas = getHoras();
      const minutos = getMinutos().toString().padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12;
      return `${horas}:${minutos} ${ampm}`;
    };
    
    switch(formato) {
      case 'dd/MM/yyyy':
        return `${dia}/${mes}/${año}`;
      case 'dd/MM/yyyy h:mm a':
        return `${dia}/${mes}/${año} ${formatearHoraAMPM()}`;
      default:
        return `${dia}/${mes}/${año}`;
    }
  }

  private formatearHora(hora: string | null | undefined): string {
    if (!hora) return '';
    const match = hora.match(/^(\d{2}):(\d{2})/);
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = match[2];
      const ampm = horas >= 12 ? 'PM' : 'AM';
      const horas12 = horas % 12 || 12;
      return `${horas12}:${minutos} ${ampm}`;
    }
    return hora;
  }

  private calcularTotalPagado(orden: any): number {
    return Number(orden.pagos?.reduce((sum: number, p: any) => sum + Number(p.monto), 0)) || 0;
  }

  generarHTMLTicket(orden: any): string {
    const total = Number(orden.total) || 0;
    const totalPagado = this.calcularTotalPagado(orden);
    const saldo = total - totalPagado;

    let historialPagosHTML = '';
    if (orden.pagos && orden.pagos.length > 0) {
      const pagosOrdenados = [...orden.pagos].sort((a, b) =>
        new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      );

      historialPagosHTML = `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 1rem; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #334155;">📋 HISTORIAL DE PAGOS</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align: left; padding: 8px 4px;">Fecha</th>
                <th style="text-align: right; padding: 8px 4px;">Monto</th>
                <th style="text-align: left; padding: 8px 4px;">Método</th>
              </tr>
            </thead>
            <tbody>
      `;

      pagosOrdenados.forEach(pago => {
        const fecha = new Date(pago.creado_en).toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        historialPagosHTML += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="text-align: left; padding: 8px 4px;">${fecha}</td>
            <td style="text-align: right; padding: 8px 4px; font-weight: 600; color: #10b981;">${this.formatearMoneda(pago.monto)}</td>
            <td style="text-align: left; padding: 8px 4px; text-transform: capitalize;">${pago.metodo_pago}</td>
          </tr>
        `;
      });
      historialPagosHTML += `</tbody></table></div>`;
    }

    const fechaLimite = orden.fecha_limite ? this.formatearFecha(orden.fecha_limite, 'dd/MM/yyyy') : 'Sin fecha';
    const horaLimite = orden.hora_limite ? this.formatearHora(orden.hora_limite) : '';
    const fechaRegistro = orden.fecha_registro ? this.formatearFecha(orden.fecha_registro, 'dd/MM/yyyy h:mm a') : new Date().toLocaleString('es-PE');

    return `
      <div id="ticket-content" style="font-family: 'Courier New', 'Monaco', monospace; padding: 30px; max-width: 450px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="font-size: 1.6rem; margin: 0; color: #1e293b; letter-spacing: -0.5px;">LABORATORIO DENTAL</h1>
          <p style="font-size: 1rem; margin: 8px 0 0 0; color: #64748b;">TICKET DE SERVICIO</p>
          <div style="width: 60px; height: 3px; background: linear-gradient(135deg, #6366f1, #8b5cf6); margin: 12px auto 0;"></div>
        </div>
        
        <div style="border-top: 2px dashed #e2e8f0; border-bottom: 2px dashed #e2e8f0; padding: 15px 0; margin-bottom: 20px;">
          <p style="margin: 8px 0; display: flex; justify-content: space-between;">
            <strong style="color: #475569;">Orden #:</strong> 
            <span style="font-weight: 600; color: #6366f1;">${orden.id_externo}</span>
          </p>
          <p style="margin: 8px 0; display: flex; justify-content: space-between;">
            <strong style="color: #475569;">Fecha:</strong> 
            <span>${fechaRegistro}</span>
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="background: #f8fafc; padding: 12px; border-radius: 12px; margin-bottom: 12px;">
            <p style="margin: 6px 0;"><strong style="color: #475569;">👨‍⚕️ Doctor:</strong> ${orden.doctor?.nombre || 'No especificado'}</p>
            <p style="margin: 6px 0;"><strong style="color: #475569;">🔧 Servicio:</strong> ${orden.servicio?.nombre || 'No especificado'}</p>
            <p style="margin: 6px 0;"><strong style="color: #475569;">👤 Cliente:</strong> ${orden.cliente_nombre || 'No especificado'}</p>
            <p style="margin: 6px 0;"><strong style="color: #475569;">⏰ Límite:</strong> ${fechaLimite} ${horaLimite}</p>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
          <p style="margin: 8px 0; display: flex; justify-content: space-between;">
            <strong style="color: #475569;">💰 TOTAL:</strong> 
            <span style="font-weight: 800; font-size: 1.2rem; color: #6366f1;">${this.formatearMoneda(total)}</span>
          </p>
          <p style="margin: 8px 0; display: flex; justify-content: space-between;">
            <strong style="color: #475569;">💵 ABONADO:</strong> 
            <span style="font-weight: 700; color: #10b981;">${this.formatearMoneda(totalPagado)}</span>
          </p>
          <p style="margin: 8px 0; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px;">
            <strong style="color: #475569;">💳 SALDO:</strong> 
            <span style="font-weight: 800; font-size: 1.1rem; color: ${saldo === 0 ? '#10b981' : '#f43f5e'};">
              ${this.formatearMoneda(saldo)}
            </span>
          </p>
        </div>
        
        ${historialPagosHTML}
        
        <div style="margin-top: 25px; text-align: center; padding-top: 20px; border-top: 2px dashed #e2e8f0;">
          <p style="font-style: italic; color: #94a3b8; font-size: 0.85rem;">
            ¡Gracias por su preferencia!
          </p>
          <p style="font-size: 0.7rem; color: #cbd5e1; margin-top: 8px;">
            LabTrack Pro - Sistema de Gestión Dental
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Vista previa mejorada con botones para descargar como imagen o PDF
   */
  abrirVistaPrevia(orden: any): void {
    const htmlTicket = this.generarHTMLTicket(orden);
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket #${orden.id_externo}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                font-family: 'Courier New', monospace;
              }
              .ticket-container {
                max-width: 100%;
                width: 500px;
                margin: 0 auto;
              }
              .button-group {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                gap: 12px;
                z-index: 1000;
                flex-wrap: wrap;
                justify-content: flex-end;
              }
              .action-button {
                padding: 12px 24px;
                border: none;
                border-radius: 12px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transition: transform 0.2s, box-shadow 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
              }
              .action-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.3);
              }
              .action-button:active {
                transform: translateY(0);
              }
              .btn-download-img {
                background: #10b981;
                color: white;
              }
              .btn-download-pdf {
                background: #6366f1;
                color: white;
              }
              .btn-print {
                background: #f59e0b;
                color: white;
              }
              .btn-close {
                background: #ef4444;
                color: white;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .button-group {
                  display: none;
                }
              }
              @media (max-width: 640px) {
                .button-group {
                  bottom: 10px;
                  right: 10px;
                  left: 10px;
                  justify-content: center;
                }
                .action-button {
                  padding: 10px 16px;
                  font-size: 12px;
                }
              }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          </head>
          <body>
            <div class="ticket-container" id="ticketContainer">
              ${htmlTicket}
            </div>
            <div class="button-group">
              <button class="action-button btn-download-img" onclick="descargarComoImagen()">
                📸 Descargar como Imagen
              </button>
              <button class="action-button btn-download-pdf" onclick="descargarComoPDF()">
                📄 Descargar como PDF
              </button>
              <button class="action-button btn-print" onclick="window.print()">
                🖨️ Imprimir
              </button>
              <button class="action-button btn-close" onclick="window.close()">
                ✖️ Cerrar
              </button>
            </div>
            <script>
              function descargarComoImagen() {
                const element = document.getElementById('ticketContainer');
                html2canvas(element, {
                  scale: 2,
                  backgroundColor: '#ffffff',
                  logging: false,
                  useCORS: true
                }).then(canvas => {
                  const link = document.createElement('a');
                  link.download = 'ticket_${orden.id_externo}.png';
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }).catch(error => {
                  console.error('Error:', error);
                  alert('Error al generar la imagen');
                });
              }
              
              function descargarComoPDF() {
                const element = document.getElementById('ticketContainer');
                html2canvas(element, {
                  scale: 2,
                  backgroundColor: '#ffffff',
                  logging: false,
                  useCORS: true
                }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const { jsPDF } = window.jspdf;
                  const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                  });
                  const imgWidth = 190;
                  const pageHeight = 297;
                  const imgHeight = (canvas.height * imgWidth) / canvas.width;
                  let position = 0;
                  
                  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                  pdf.save('ticket_${orden.id_externo}.pdf');
                }).catch(error => {
                  console.error('Error:', error);
                  alert('Error al generar el PDF');
                });
              }
            </script>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  }

  /**
   * Descargar como imagen directamente
   */
  async descargarComoImagen(orden: any): Promise<void> {
    const htmlTicket = this.generarHTMLTicket(orden);
    const element = document.createElement('div');
    element.innerHTML = htmlTicket;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    document.body.appendChild(element);
    
    const ticketElement = element.firstElementChild as HTMLElement;
    
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `ticket_${orden.id_externo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generando imagen:', error);
      throw error;
    } finally {
      document.body.removeChild(element);
    }
  }

  /**
   * Descargar como PDF directamente
   */
  async descargarComoPDF(orden: any): Promise<void> {
    const htmlTicket = this.generarHTMLTicket(orden);
    const element = document.createElement('div');
    element.innerHTML = htmlTicket;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    document.body.appendChild(element);
    
    const ticketElement = element.firstElementChild as HTMLElement;
    
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 0, imgWidth, imgHeight);
      pdf.save(`ticket_${orden.id_externo}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    } finally {
      document.body.removeChild(element);
    }
  }

  /**
   * Descargar PDF (método legacy, mantiene compatibilidad)
   */
  async descargarTicketPDF(orden: any): Promise<void> {
    return this.descargarComoPDF(orden);
  }
}