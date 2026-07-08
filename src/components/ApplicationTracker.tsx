/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Application } from '../types.js';
import { Calendar, CheckCircle2, Circle, AlertCircle, FileText, ArrowRight, Eye, Mail, Info } from 'lucide-react';

interface ApplicationTrackerProps {
  applications: Application[];
}

const PIPELINE_STEPS = [
  { key: 'Applied', label: 'Postulado', desc: 'Envío de CV adaptado' },
  { key: 'Screening', label: 'Filtro Inicial', desc: 'Revisión por reclutadores' },
  { key: 'Interview', label: 'Entrevista', desc: 'Contacto de talento' },
  { key: 'Offered', label: 'Oferta Recibida', desc: 'Propuesta formal' }
];

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ applications }) => {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-sm font-semibold text-gray-900">Aún no te has postulado</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Encuentra ofertas en tu área local o remotas, optimiza tu CV con IA Gemini y realiza un seguimiento en tiempo real desde este panel.
        </p>
      </div>
    );
  }

  // Get current step index for the progress bar
  const getStepIndex = (status: string) => {
    if (status === 'Rejected') return -1;
    return PIPELINE_STEPS.findIndex(s => s.key === status);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Applications list (left side) */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="font-display text-sm font-bold text-gray-900 mb-3">Mis Postulaciones ({applications.length})</h3>
        
        <div className="space-y-3">
          {applications.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            const stepIdx = getStepIndex(app.status);
            
            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                id={`app-track-card-${app.id}`}
                className={`rounded-xl border p-4.5 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/10 shadow-sm ring-1 ring-indigo-600' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{app.companyName}</h4>
                    <h3 className="text-sm font-bold text-gray-900 mt-0.5">{app.jobTitle}</h3>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    app.status === 'Offered' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : app.status === 'Rejected'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : app.status === 'Interview'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  }`}>
                    {app.status === 'Applied' && 'Postulado'}
                    {app.status === 'Screening' && 'En Filtro'}
                    {app.status === 'Interview' && 'Entrevista'}
                    {app.status === 'Offered' && '¡Oferta! 🎉'}
                    {app.status === 'Rejected' && 'Finalizado'}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Postulado el {new Date(app.appliedAt).toLocaleDateString('es-ES')}</span>
                  </div>
                  <span className="font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                    Ver detalles <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline & Details view (right side) */}
      <div className="lg:col-span-2">
        {selectedApp ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="border-b border-gray-50 pb-4">
              <span className="text-xs font-bold text-indigo-600">{selectedApp.companyName}</span>
              <h2 className="font-display text-lg font-bold text-gray-900">{selectedApp.jobTitle}</h2>
              <p className="text-xs text-gray-400 mt-1">ID de Solicitud: <span className="font-mono">{selectedApp.id}</span></p>
            </div>

            {/* Pipeline Step Map */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-4 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-500" />
                Línea de Tiempo del Estado de Postulación
              </h4>

              {selectedApp.status === 'Rejected' ? (
                <div className="rounded-xl bg-red-50/50 border border-red-100 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-red-900">Postulación Finalizada</h5>
                    <p className="text-xs text-red-700 mt-1">
                      El proceso para este puesto ha finalizado. ¡No te desanimes! Muchas empresas buscan talentos como tú, aprovecha nuestra IA para adaptar tu currículum a otras vacantes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 relative">
                  {/* Connecting Line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-100 -z-0"></div>
                  
                  {PIPELINE_STEPS.map((step, idx) => {
                    const currentIdx = getStepIndex(selectedApp.status);
                    const isCompleted = idx < currentIdx || selectedApp.status === 'Offered';
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                          isCompleted
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : isCurrent
                              ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50'
                              : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4.5 w-4.5" />
                          ) : (
                            <Circle className="h-3 w-3 fill-current" />
                          )}
                        </div>
                        <span className={`text-[11px] font-bold mt-2 ${isCurrent ? 'text-indigo-600' : 'text-gray-900'}`}>{step.label}</span>
                        <span className="text-[9px] text-gray-400 hidden sm:block mt-0.5 max-w-[100px] leading-tight">{step.desc}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Email notification simulator */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4.5">
              <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-indigo-500" />
                Notificación por Correo Electrónico (Simulada)
              </h4>
              <div className="rounded-lg border border-gray-200 bg-white p-3.5 space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-2 text-[10px] text-gray-400 font-mono">
                  <span>De: TrabajoLocal Notificaciones &lt;no-reply@trabajolocal.es&gt;</span>
                  <span>Enviado con éxito</span>
                </div>
                <p className="font-semibold text-gray-900">Actualización sobre tu postulación para "{selectedApp.jobTitle}"</p>
                <p className="text-gray-600 leading-relaxed text-[11px] mt-1">
                  Hola. Te notificamos que el reclutador ha actualizado tu estado a <strong>
                    {selectedApp.status === 'Applied' && 'Postulado'}
                    {selectedApp.status === 'Screening' && 'Filtro Inicial'}
                    {selectedApp.status === 'Interview' && 'Entrevista Agendada'}
                    {selectedApp.status === 'Offered' && 'Oferta de Empleo Formal'}
                    {selectedApp.status === 'Rejected' && 'Proceso de Selección Cerrado'}
                  </strong> para la vacante en {selectedApp.companyName}. Por favor mantente atento a tu correo o inicia sesión para agendar pasos de entrevista.
                </p>
              </div>
            </div>

            {/* Tailored CV review */}
            {selectedApp.resumeTailored && (
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  CV Adaptado Enviado a esta Empresa
                </h4>
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 text-xs text-gray-700 font-mono max-h-[250px] overflow-y-auto whitespace-pre-line leading-relaxed">
                  {selectedApp.resumeTailored}
                </div>
              </div>
            )}

            {/* Cover letter review */}
            {selectedApp.coverLetterTailored && (
              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Carta de Presentación Adjuntada
                </h4>
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 text-xs text-gray-700 leading-relaxed font-sans max-h-[200px] overflow-y-auto">
                  {selectedApp.coverLetterTailored}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center h-full flex flex-col justify-center items-center">
            <Eye className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">Selecciona una postulación</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Haz clic en cualquier postulación de la lista izquierda para ver su línea de tiempo, los correos enviados, el CV optimizado por Gemini y los estados.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
