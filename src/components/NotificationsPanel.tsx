/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Notification } from '../types.js';
import { Bell, CheckCheck, X, AlertCircle, CheckCircle2, Info, Mail } from 'lucide-react';

interface NotificationsPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead
}) => {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-gray-100 bg-white shadow-xl flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600 animate-bounce" />
          <h3 className="font-display text-sm font-bold text-gray-900">
            Centro de Notificaciones
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={onMarkAllAsRead}
              id="btn-mark-all-read"
              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-950"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Notifications List content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-2">
            <Bell className="h-8 w-8 text-gray-200" />
            <p className="text-xs font-semibold">No tienes notificaciones todavía</p>
            <p className="text-[10px] max-w-xs leading-tight">Cualquier cambio en tus postulaciones u ofertas generará una alerta aquí en tiempo real.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = notif.type === 'success' 
              ? CheckCircle2 
              : notif.type === 'alert' 
                ? AlertCircle 
                : Info;
                
            const typeColor = notif.type === 'success'
              ? 'text-emerald-500 bg-emerald-50'
              : notif.type === 'alert'
                ? 'text-red-500 bg-red-50'
                : 'text-indigo-500 bg-indigo-50';

            return (
              <div
                key={notif.id}
                onClick={() => { if (!notif.read) onMarkAsRead(notif.id); }}
                id={`notif-item-${notif.id}`}
                className={`relative flex gap-3 rounded-xl border p-4 transition-all cursor-pointer ${
                  notif.read 
                    ? 'border-gray-50 bg-gray-50/20' 
                    : 'border-indigo-100 bg-indigo-50/5 hover:border-indigo-200 shadow-xs'
                }`}
              >
                {/* Unread circle badge */}
                {!notif.read && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                )}

                {/* Left icon category */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeColor}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Content info */}
                <div className="space-y-1.5 flex-1 pr-3">
                  <p className="text-xs text-gray-800 leading-relaxed font-sans font-medium" dangerouslySetInnerHTML={{ __html: notif.message }} />
                  
                  {/* Metadata & Email Sent Simulator indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[9px] text-gray-400 font-mono">
                    <span>{new Date(notif.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {notif.emailSentTo && (
                      <span className="inline-flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                        <Mail className="h-3 w-3" />
                        Correo enviado a {notif.emailSentTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Simulated mailbox log box footer */}
      <div className="border-t border-gray-100 bg-gray-50/70 p-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
          <Mail className="h-3.5 w-3.5 text-gray-400" />
          Servidor de Notificaciones SMTP
        </h4>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Cada vez que un reclutador actualiza tu candidatura o te verificas, se simula una transmisión de correo real. El estado de entrega se registra en la bitácora anterior para una auditabilidad del 100%.
        </p>
      </div>

    </div>
  );
};
