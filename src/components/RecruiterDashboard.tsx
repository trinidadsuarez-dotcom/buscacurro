/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Job, Application, User, ApplicationStatus } from '../types.js';
import { PlusCircle, List, UserCheck, Trash2, Calendar, MapPin, DollarSign, ShieldCheck, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface RecruiterDashboardProps {
  myJobs: Job[];
  receivedApps: Application[];
  currentUser: User;
  onPostJob: (jobData: Omit<Job, 'id' | 'postedAt' | 'isVerifiedCompany'>) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onUpdateAppStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  myJobs,
  receivedApps,
  currentUser,
  onPostJob,
  onDeleteJob,
  onUpdateAppStatus
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'post' | 'my-jobs'>('received');
  
  // Post job form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState(currentUser.name || 'Empresa de Tecnología');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(currentUser.location || 'Madrid, España');
  const [type, setType] = useState<'local' | 'remote'>('local');
  const [salaryMin, setSalaryMin] = useState(30000);
  const [salaryMax, setSalaryMax] = useState(45000);
  const [industry, setIndustry] = useState('Marketing Digital');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !description || !location) {
      setErrorMsg("Todos los campos obligatorios son requeridos.");
      return;
    }
    if (salaryMin < 0 || salaryMax < salaryMin) {
      setErrorMsg("El salario máximo debe ser igual o superior al salario mínimo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await onPostJob({
        title,
        company,
        description,
        location,
        type,
        salaryMin,
        salaryMax,
        industry,
        recruiterId: currentUser.id
      });
      setSuccessMsg("¡Oferta de trabajo publicada con éxito!");
      // Reset form
      setTitle('');
      setDescription('');
      setActiveSubTab('my-jobs');
    } catch (e) {
      setErrorMsg("Error al publicar la oferta de trabajo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabels: Record<ApplicationStatus, string> = {
    'Applied': 'Postulado',
    'Screening': 'Filtro Inicial',
    'Interview': 'Entrevista',
    'Offered': 'Ofrecido',
    'Rejected': 'Rechazado'
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Tabs */}
      <div className="flex border-b border-gray-100 bg-white p-1 rounded-xl shadow-xs">
        {[
          { id: 'received', label: 'Candidaturas Recibidas', count: receivedApps.length, icon: UserCheck },
          { id: 'post', label: 'Publicar Vacante', count: null, icon: PlusCircle },
          { id: 'my-jobs', label: 'Mis Vacantes Activas', count: myJobs.length, icon: List }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              id={`recruiter-tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB: RECEIVED APPLICATIONS */}
      {activeSubTab === 'received' && (
        <div className="space-y-4">
          <h3 className="font-display text-sm font-bold text-gray-900">Seguimiento y Gestión de Postulantes</h3>
          
          {receivedApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900">Sin postulaciones aún</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Las candidaturas de usuarios que apliquen a tus vacantes con su currículum adaptado por Gemini se mostrarán aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {receivedApps.map((app) => (
                <div
                  key={app.id}
                  id={`recruiter-app-card-${app.id}`}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs space-y-4"
                >
                  {/* Candidate metadata header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-gray-900">{app.candidateName}</span>
                        {/* Verified profile badge */}
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Perfil Verificado
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Postuló a: <span className="font-semibold text-indigo-600">{app.jobTitle}</span></p>
                    </div>

                    {/* Status updater */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600">Estado:</span>
                      <select
                        value={app.status}
                        onChange={(e) => onUpdateAppStatus(app.id, e.target.value as ApplicationStatus)}
                        id={`select-status-${app.id}`}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs font-bold text-indigo-700 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="Applied">Recibido / Postulado</option>
                        <option value="Screening">Filtro Inicial / Screening</option>
                        <option value="Interview">Programar Entrevista</option>
                        <option value="Offered">Enviar Oferta Formal 🎉</option>
                        <option value="Rejected">Rechazar / Cerrar</option>
                      </select>
                    </div>
                  </div>

                  {/* Tailored contents */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* CV Adaptado */}
                    <div className="rounded-lg border border-gray-100 bg-gray-50/40 p-3.5 flex flex-col h-[220px]">
                      <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 border-b border-gray-100 pb-2 mb-2">
                        <FileText className="h-3.5 w-3.5" />
                        CV Optimizado por IA (Gemini 3.5 Flash)
                      </span>
                      <div className="flex-1 overflow-y-auto text-xs text-gray-700 font-mono whitespace-pre-line leading-relaxed">
                        {app.resumeTailored}
                      </div>
                    </div>

                    {/* Carta de Motivacion */}
                    <div className="rounded-lg border border-gray-100 bg-gray-50/40 p-3.5 flex flex-col h-[220px]">
                      <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 border-b border-gray-100 pb-2 mb-2">
                        <FileText className="h-3.5 w-3.5" />
                        Carta de Presentación del Candidato
                      </span>
                      <div className="flex-1 overflow-y-auto text-xs text-gray-700 font-sans whitespace-pre-line leading-relaxed">
                        {app.coverLetterTailored}
                      </div>
                    </div>

                  </div>

                  {/* Submission date tag */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1">
                    <span>Recibido: {new Date(app.appliedAt).toLocaleString('es-ES')}</span>
                    <span className="text-indigo-600 flex items-center gap-1 bg-indigo-50/50 px-2.5 py-0.5 rounded-full font-semibold">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Estado actual: {statusLabels[app.status]}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: POST JOB VACANCY */}
      {activeSubTab === 'post' && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-display text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 mb-5">Publicar Nueva Vacante de Empleo</h3>
          
          <form onSubmit={handleSubmitJob} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Título de la Vacante *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Desarrollador Backend Node.js"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Empresa contratante *</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ej: Tech Innovators"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación del Puesto *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Madrid, España"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Modalidad *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="local">Presencial / Híbrido (Local)</option>
                  <option value="remote">Trabajo Remoto (100% Online)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sector / Industria *</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Marketing Digital">Marketing Digital</option>
                  <option value="Redacción Web">Copywriting / Redacción Web</option>
                  <option value="Social Media Manager">Social Media Manager</option>
                  <option value="Community Manager">Community Manager</option>
                  <option value="Producción Audiovisual">Producción Audiovisual</option>
                  <option value="Producción de Animación">Animación 2D / 3D</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rango Salarial Mínimo (Anual en EUR)</label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  placeholder="Ej: 30000"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rango Salarial Máximo (Anual en EUR)</label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(Number(e.target.value))}
                  placeholder="Ej: 50000"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Descripción del Cargo * (Requerimientos, Beneficios, Tareas)</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe los requisitos técnicos, las responsabilidades principales, tecnologías necesarias, años de experiencia deseados, etc. Esto ayudará a Gemini a adaptar el CV de los candidatos de forma impecable."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none leading-relaxed"
              />
            </div>

            <div className="border-t border-gray-50 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-vacancy"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Publicando...' : 'Publicar Oferta de Empleo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB: MY JOB POSTINGS */}
      {activeSubTab === 'my-jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-gray-900">Mis Ofertas Publicadas ({myJobs.length})</h3>
            {successMsg && <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded font-semibold">{successMsg}</span>}
          </div>

          {myJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <List className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-semibold text-gray-900">Aún no has publicado vacantes</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Utiliza la pestaña "Publicar Vacante" para dar de alta ofertas de empleo en la base de datos de TrabajoLocal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {myJobs.map(job => (
                <div
                  key={job.id}
                  id={`my-posted-job-${job.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-gray-900 text-sm">{job.title}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location} ({job.type === 'remote' ? 'Remoto' : 'Local'})
                      </span>
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" />
                        {job.salaryMin}€ - {job.salaryMax}€
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.postedAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onDeleteJob(job.id)}
                      id={`btn-delete-job-${job.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                      title="Eliminar esta oferta de empleo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
