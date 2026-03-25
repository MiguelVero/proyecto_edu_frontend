import { Injectable } from '@angular/core';
import { HttpRequest } from '@angular/common/http';

export interface RequestLogEntry {
  url: string;
  method: string;
  timestamp: Date;
  tokenPresent: boolean;
  status?: number;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private requestLog: RequestLogEntry[] = [];
  private errorLog: RequestLogEntry[] = [];

  logRequest(req: HttpRequest<any>, tokenPresent: boolean) {
    const entry: RequestLogEntry = {
      url: req.url,
      method: req.method,
      timestamp: new Date(),
      tokenPresent
    };

    this.requestLog.push(entry);

    // Mantener solo los últimos 50 logs
    if (this.requestLog.length > 50) {
      this.requestLog.shift();
    }

    console.log('📋 Historial de peticiones:', this.requestLog);
    return entry;
  }

  logError(req: HttpRequest<any>, error: any, status?: number) {
    const entry: RequestLogEntry = {
      url: req.url,
      method: req.method,
      timestamp: new Date(),
      tokenPresent: !!this.getTokenFromReq(req),
      status,
      error
    };

    this.errorLog.push(entry);

    // Mantener solo los últimos 20 errores
    if (this.errorLog.length > 20) {
      this.errorLog.shift();
    }

    console.error('❌ Error registrado:', entry);
    return entry;
  }

  private getTokenFromReq(req: HttpRequest<any>): string | null {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }
    return null;
  }

  getRequestLog(): RequestLogEntry[] {
    return this.requestLog;
  }

  getErrorLog(): RequestLogEntry[] {
    return this.errorLog;
  }

  getLastError(): RequestLogEntry | undefined {
    return this.errorLog[this.errorLog.length - 1];
  }

  clearLogs() {
    this.requestLog = [];
    this.errorLog = [];
  }
}