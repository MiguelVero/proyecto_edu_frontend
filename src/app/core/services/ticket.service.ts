// ticket.service.ts - versión completa con todos los métodos

import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

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
        <div style="margin-top: 15px;">
          <h3 style="font-size: 1rem; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">📋 HISTORIAL DE PAGOS</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead>
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left; padding: 4px;">Fecha</th>
                <th style="text-align: right; padding: 4px;">Monto</th>
                <th style="text-align: left; padding: 4px;">Método</th>
                </tr>
            </thead>
            <tbody>
      `;

      pagosOrdenados.forEach(pago => {
        const fecha = new Date(pago.creado_en).toLocaleString('es-PE');
        historialPagosHTML += `
          <tr style="border-bottom: 1px dotted #eee;">
            <td style="text-align: left; padding: 4px;">${fecha}</td>
            <td style="text-align: right; padding: 4px; font-weight: 600; color: #10b981;">${this.formatearMoneda(pago.monto)}</td>
            <td style="text-align: left; padding: 4px; text-transform: capitalize;">${pago.metodo_pago}</td>
          </tr>
        `;
      });
      historialPagosHTML += `</tbody></table></div>`;
    }

    const fechaLimite = orden.fecha_limite ? this.formatearFecha(orden.fecha_limite, 'dd/MM/yyyy') : 'Sin fecha';
    const horaLimite = orden.hora_limite ? this.formatearHora(orden.hora_limite) : '';
    const fechaRegistro = orden.fecha_registro ? this.formatearFecha(orden.fecha_registro, 'dd/MM/yyyy h:mm a') : new Date().toLocaleString('es-PE');

    return `
      <div style="font-family: 'Courier New', monospace; padding: 30px; max-width: 400px; margin: 0 auto; background: white; border: 1px solid #ddd; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 1.5rem; margin: 0; color: #333;">LABORATORIO DENTAL</h1>
          <p style="font-size: 1rem; margin: 5px 0 0 0; color: #666;">TICKET DE SERVICIO</p>
        </div>
        
        <div style="border-top: 2px dashed #333; border-bottom: 2px dashed #333; padding: 15px 0; margin-bottom: 15px;">
          <p style="margin: 5px 0; display: flex; justify-content: space-between;">
            <strong>Orden #:</strong> <span>${orden.id_externo}</span>
          </p>
          <p style="margin: 5px 0; display: flex; justify-content: space-between;">
            <strong>Fecha:</strong> <span>${fechaRegistro}</span>
          </p>
        </div>
        
        <div style="margin-bottom: 15px;">
          <p style="margin: 5px 0;"><strong>Doctor:</strong> ${orden.doctor?.nombre || 'No especificado'}</p>
          <p style="margin: 5px 0;"><strong>Servicio:</strong> ${orden.servicio?.nombre || 'No especificado'}</p>
          <p style="margin: 5px 0;"><strong>Cliente:</strong> ${orden.cliente_nombre || 'No especificado'}</p>
          <p style="margin: 5px 0;"><strong>Límite:</strong> ${fechaLimite} ${horaLimite}</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
          <p style="margin: 5px 0; display: flex; justify-content: space-between;">
            <strong>TOTAL:</strong> <span style="font-weight: 700; color: #6366f1;">${this.formatearMoneda(total)}</span>
          </p>
          <p style="margin: 5px 0; display: flex; justify-content: space-between;">
            <strong>ABONADO:</strong> <span style="font-weight: 700; color: #10b981;">${this.formatearMoneda(totalPagado)}</span>
          </p>
          <p style="margin: 5px 0; display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 5px;">
            <strong>SALDO:</strong> 
            <span style="font-weight: 700; color: ${saldo === 0 ? '#10b981' : '#f43f5e'};">
              ${this.formatearMoneda(saldo)}
            </span>
          </p>
        </div>
        
        ${historialPagosHTML}
        
        <div style="margin-top: 20px; text-align: center; font-style: italic; color: #666;">
          ¡Gracias por su preferencia!
        </div>
      </div>
    `;
  }

  /**
   * Genera el PDF con un pequeño delay para asegurar renderizado completo
   */
  async generarPDF(orden: any): Promise<Blob> {
    const htmlTicket = this.generarHTMLTicket(orden);
    const element = document.createElement('div');
    element.innerHTML = htmlTicket;
    document.body.appendChild(element);

    // Pequeño delay para asegurar que el DOM se renderice
    await new Promise(resolve => setTimeout(resolve, 100));

    const opt = {
      margin: 0.5,
      filename: `ticket_${orden.id_externo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      document.body.removeChild(element);
      throw new Error('html2pdf no está disponible');
    }

    const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
    document.body.removeChild(element);
    return pdfBlob;
  }

  /**
   * Abre una ventana para imprimir el ticket (sin botón flotante)
   * Útil para la vista de lista de órdenes
   */
  imprimirTicket(orden: any): void {
    const htmlTicket = this.generarHTMLTicket(orden);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket #${orden.id_externo}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                background: #f0f0f0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 0;
                  background: white;
                }
              }
            </style>
          </head>
          <body>${htmlTicket}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  /**
   * Vista previa con botón para imprimir/guardar PDF
   * Ideal para capturas de pantalla en móvil
   */
  abrirVistaPrevia(orden: any): void {
    const htmlTicket = this.generarHTMLTicket(orden);
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
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
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 16px;
                font-family: 'Courier New', monospace;
              }
              .ticket-container {
                max-width: 100%;
                width: 400px;
                margin: 0 auto;
              }
              .action-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 24px;
                background: #6366f1;
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1000;
                transition: transform 0.2s;
              }
              .action-button:active {
                transform: scale(0.95);
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .action-button {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">${htmlTicket}</div>
            <button class="action-button" onclick="window.print()">
              🖨️ Imprimir / Guardar como PDF
            </button>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  }

  /**
   * Descargar PDF directamente
   */
  async descargarTicketPDF(orden: any): Promise<void> {
    try {
      const pdfBlob = await this.generarPDF(orden);
      saveAs(pdfBlob, `ticket_${orden.id_externo}.pdf`);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      throw error;
    }
  }
}