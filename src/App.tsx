/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Job, Application, Notification, ApplicationStatus } from './types.ts';
import { Header } from './components/Header.tsx';
import { JobCard } from './components/JobCard.tsx';
import { JobFilters } from './components/JobFilters.tsx';
import { CVTailorModal } from './components/CVTailorModal.tsx';
import { ApplicationTracker } from './components/ApplicationTracker.tsx';
import { RecruiterDashboard } from './components/RecruiterDashboard.tsx';
import { NotificationsPanel } from './components/NotificationsPanel.tsx';
import { JobWebImporterModal } from './components/JobWebImporterModal.tsx';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Globe, 
  Sparkles, 
  Search, 
  UserCheck, 
  Send, 
  CheckCircle, 
  ArrowRight, 
  Mail, 
  FileText,
  Bookmark,
  ShieldCheck,
  User as UserIcon,
  Unlock,
  Building,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Session States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('trinidadsuarez@gmail.com');
  const [authName, setAuthName] = useState('Trinidad Suárez');
  const [authRole, setAuthRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Core Data States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Filter States
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('Todas');
  const [selectedType, setSelectedType] = useState('Todos');
  const [salaryMin, setSalaryMin] = useState(0);

  // Navigation Tabs for Candidate
  const [candidateTab, setCandidateTab] = useState<'jobs' | 'tracker' | 'profile'>('jobs');

  // UI Control States
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isJobsLoading, setIsJobsLoading] = useState(false);

  // Profile Manager States (for local candidate profile)
  const [profileName, setProfileName] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileIndustry, setProfileIndustry] = useState('');
  const [profileCVText, setProfileCVText] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // 1. AUTO-LOGIN user Trinidad Suárez on initial mount
  useEffect(() => {
    handleLogin('trinidadsuarez@gmail.com', 'Trinidad Suárez', 'candidate');
  }, []);

  // 2. Fetch jobs when filters change
  useEffect(() => {
    fetchJobs();
  }, [searchLocation, selectedIndustry, selectedType, salaryMin]);

  // 3. Polling and Sync Data: Runs every 4 seconds to simulate real-time notifications & statuses
  useEffect(() => {
    if (!currentUser) return;

    fetchNotifications();
    fetchApplications();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchApplications();
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.role]);

  // Sync Profile input states with logged in user profile
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileLocation(currentUser.location);
      setProfileIndustry(currentUser.industry);
      setProfileCVText(currentUser.cvText || '');
    }
  }, [currentUser]);

  // Fetch Jobs from Server
  const fetchJobs = async () => {
    setIsJobsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedIndustry !== 'Todas') queryParams.append('industry', selectedIndustry);
      if (searchLocation.trim() !== '') queryParams.append('location', searchLocation);
      if (selectedType !== 'Todos') queryParams.append('type', selectedType);
      if (salaryMin > 0) queryParams.append('salaryMin', salaryMin.toString());

      const res = await fetch(`/api/jobs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        // Default select first job if none selected
        if (data.length > 0 && !selectedJob) {
          setSelectedJob(data[0]);
        }
      }
    } catch (e) {
      console.error("Error fetching jobs:", e);
    } finally {
      setIsJobsLoading(false);
    }
  };

  // Fetch Applications
  const fetchApplications = async () => {
    if (!currentUser) return;
    try {
      const paramName = currentUser.role === 'candidate' ? 'candidateId' : 'recruiterId';
      const res = await fetch(`/api/applications?${paramName}=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  // Login handler
  const handleLogin = async (email: string, name?: string, role?: 'candidate' | 'recruiter') => {
    setIsAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role })
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setSelectedJob(null);
      }
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setApplications([]);
    setNotifications([]);
  };

  // Quick switch role
  const handleToggleRole = () => {
    if (!currentUser) return;
    const nextRole = currentUser.role === 'candidate' ? 'recruiter' : 'candidate';
    const nextEmail = nextRole === 'candidate' ? 'trinidadsuarez@gmail.com' : 'carlos.talent@innodigital.es';
    const nextName = nextRole === 'candidate' ? 'Trinidad Suárez' : 'Carlos Reclutador';
    
    handleLogin(nextEmail, nextName, nextRole);
    if (nextRole === 'candidate') {
      setCandidateTab('jobs');
    }
  };

  // Verify Candidate Profile
  const handleVerifyProfile = async () => {
    if (!currentUser) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/user/${currentUser.id}/verify`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated);
        fetchNotifications();
      }
    } catch (e) {
      console.error("Verification failed:", e);
    } finally {
      setIsVerifying(false);
    }
  };

  // Update Profile details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/user/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          location: profileLocation,
          industry: profileIndustry,
          cvText: profileCVText
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated);
        setProfileSuccessMsg("¡Perfil actualizado correctamente!");
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error("Failed to update profile:", e);
    }
  };

  // Recruiter: Post new vacancy job
  const handlePostJob = async (jobData: Omit<Job, 'id' | 'postedAt' | 'isVerifiedCompany'>) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        fetchJobs();
      } else {
        throw new Error("No se pudo publicar la vacante.");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Recruiter: Delete job
  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit optimized application
  const handleApplyToJob = async (resume: string, coverLetter: string) => {
    if (!currentUser || !selectedJob) return;
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          candidateId: currentUser.id,
          resumeTailored: resume,
          coverLetterTailored: coverLetter
        })
      });

      if (res.ok) {
        fetchApplications();
        fetchNotifications();
        setCandidateTab('tracker');
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error("Submission failed:", e);
      throw e;
    }
  };

  // Recruiter: Update Application state (Applied -> Screening -> Interview -> Offered -> Rejected)
  const handleUpdateAppStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchApplications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark single notification as read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Currency utility helper
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Check if candidate has already applied to active selected job
  const hasAppliedToSelected = selectedJob 
    ? applications.some(app => app.jobId === selectedJob.id && app.candidateId === currentUser?.id)
    : false;

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans antialiased text-gray-800 flex flex-col">
      
      {/* 1. TOP NAVIGATION HEADER */}
      <Header
        currentUser={currentUser}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onLogout={handleLogout}
        onToggleRole={handleToggleRole}
        onVerifyProfile={handleVerifyProfile}
        isVerifying={isVerifying}
      />

      {/* 2. AUTHENTICATION LOGIN FALLBACK IF NOT LOGGED IN */}
      {!currentUser ? (
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Briefcase className="h-6 w-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-gray-900">Acceso a TrabajoLocal</h2>
              <p className="text-xs text-gray-500">Ingresa tu correo para comenzar a localizar ofertas o publicar vacantes</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Perfil Rol</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none font-bold"
                  >
                    <option value="candidate">Candidato (Busca Empleo)</option>
                    <option value="recruiter">Reclutador (Publica Vacantes)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => handleLogin(authEmail, authName, authRole)}
                id="btn-login-submit"
                disabled={isAuthLoading || !authEmail}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isAuthLoading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </div>

            {/* Quick Demo Access triggers */}
            <div className="border-t border-gray-100 pt-5 space-y-2.5">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Acceso rápido para demostración</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setAuthEmail('trinidadsuarez@gmail.com');
                    setAuthName('Trinidad Suárez');
                    setAuthRole('candidate');
                    handleLogin('trinidadsuarez@gmail.com', 'Trinidad Suárez', 'candidate');
                  }}
                  id="btn-quick-candidate"
                  className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2 text-center hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-bold text-gray-800">Trinidad Suárez</span>
                  <span className="text-[9px] text-gray-500">Candidato Demo</span>
                </button>
                <button
                  onClick={() => {
                    setAuthEmail('carlos.talent@innodigital.es');
                    setAuthName('Carlos Reclutador');
                    setAuthRole('recruiter');
                    handleLogin('carlos.talent@innodigital.es', 'Carlos Reclutador', 'recruiter');
                  }}
                  id="btn-quick-recruiter"
                  className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2 text-center hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  <Building className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-bold text-gray-800">Carlos Reclutador</span>
                  <span className="text-[9px] text-gray-500">Talent Manager</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* 3. MAIN WORKSPACE FOR CONNECTED USERS */
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          
          {/* CANDIDATE VIEW WORKSPACE */}
          {currentUser.role === 'candidate' ? (
            <div className="space-y-6">
              
              {/* Candidate Tab selectors */}
              <div className="flex border-b border-gray-200 gap-6">
                {[
                  { id: 'jobs', label: 'Localizar Ofertas', icon: Search },
                  { id: 'tracker', label: 'Seguimiento de Postulaciones', icon: Bookmark },
                  { id: 'profile', label: 'Mi Perfil y CV', icon: UserIcon }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = candidateTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCandidateTab(tab.id as any)}
                      id={`cand-tab-${tab.id}`}
                      className={`flex items-center gap-2 py-3 border-b-2 font-display text-sm font-bold transition-all -mb-[2px] ${
                        isActive
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-400 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      {tab.id === 'tracker' && applications.length > 0 && (
                        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          {applications.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* VIEW: JOB SEARCH & DETAILS PANEL */}
              {candidateTab === 'jobs' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Filters */}
                  <div className="lg:col-span-3 space-y-4">
                    <JobFilters
                      location={searchLocation}
                      onChangeLocation={setSearchLocation}
                      selectedIndustry={selectedIndustry}
                      onChangeIndustry={setSelectedIndustry}
                      selectedType={selectedType}
                      onChangeType={setSelectedType}
                      salaryMin={salaryMin}
                      onChangeSalaryMin={setSalaryMin}
                    />

                    {/* Global Importer Banner CTA */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="font-display text-xs font-bold text-indigo-950">Buscador Global e Importador</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        ¿Quieres postular a una vacante que viste en Internet? Impórtala usando APIs públicas, canales RSS o Web Scraping inteligente con IA.
                      </p>
                      <button 
                        onClick={() => setIsImporterOpen(true)}
                        id="btn-trigger-importer"
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Buscar/Scrapear Ofertas</span>
                      </button>
                    </div>
                  </div>

                  {/* Middle Column: Jobs Listing Feed */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-gray-900">Ofertas disponibles ({jobs.length})</h3>
                      <span className="text-xs text-gray-400 font-mono">Búsqueda rápida</span>
                    </div>

                    {isJobsLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                      </div>
                    ) : jobs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400">
                        No se encontraron ofertas que coincidan con los filtros aplicados.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
                        {jobs.map(job => (
                          <JobCard
                            key={job.id}
                            job={job}
                            isSelected={selectedJob?.id === job.id}
                            onSelect={() => setSelectedJob(job)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Active Job Details Panel */}
                  <div className="lg:col-span-5">
                    {selectedJob ? (
                      <div className="sticky top-24 rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
                        
                        {/* Title Section */}
                        <div className="border-b border-gray-50 pb-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{selectedJob.company}</span>
                            {selectedJob.isVerifiedCompany && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                Empresa Verificada
                              </span>
                            )}
                          </div>
                          <h2 className="font-display text-lg font-bold text-gray-900 leading-snug">
                            {selectedJob.url ? (
                              <a 
                                href={selectedJob.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 hover:text-indigo-600 hover:underline transition-colors"
                                title="Ver publicación original (abre en nueva pestaña)"
                              >
                                <span>{selectedJob.title}</span>
                                <ExternalLink className="h-4 w-4 text-indigo-500 shrink-0 inline" />
                              </a>
                            ) : (
                              <span>{selectedJob.title}</span>
                            )}
                          </h2>
                          
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              {selectedJob.location}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                              {formatSalary(selectedJob.salaryMin)} - {formatSalary(selectedJob.salaryMax)}
                            </span>
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 uppercase">
                              {selectedJob.industry}
                            </span>
                          </div>
                        </div>

                        {/* Detailed description */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Descripción del puesto</h4>
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                            {selectedJob.description}
                          </p>
                        </div>

                        {/* Action section (CV Adapt and Apply) */}
                        <div className="pt-3 border-t border-gray-50">
                          {hasAppliedToSelected ? (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center space-y-2">
                              <CheckCircle className="mx-auto h-5 w-5 text-emerald-500" />
                              <h4 className="text-xs font-bold text-emerald-900">¡Ya te has postulado a esta vacante!</h4>
                              <p className="text-[11px] text-emerald-700">Puedes seguir el estado de tu solicitud en tiempo real en la pestaña de Seguimiento.</p>
                              <button
                                onClick={() => setCandidateTab('tracker')}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline mt-1.5"
                              >
                                Ir al Seguimiento de Postulaciones <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50/40 p-4.5 border border-indigo-100/30">
                                <Sparkles className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-indigo-950">Adaptación Inteligente de CV</h4>
                                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                                    Utilizaremos <strong>IA Gemini 3.5 Flash</strong> para reorganizar y optimizar tu CV base para alinearlo con las palabras clave específicas de esta descripción. ¡Aumenta tu compatibilidad!
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => setIsAdaptModalOpen(true)}
                                id="btn-open-adaptor"
                                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                              >
                                <Sparkles className="h-4 w-4" />
                                Postularse Adaptando CV con IA
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
                        <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-sm font-semibold text-gray-900">Selecciona una vacante</h3>
                        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                          Haz clic en cualquier oferta de empleo de la lista central para leer los detalles completos, ver el rango salarial y postularte con CV personalizado.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* VIEW: APPLICATION TRACKING BOARD */}
              {candidateTab === 'tracker' && (
                <ApplicationTracker applications={applications} />
              )}

              {/* VIEW: PROFILE & CV MANAGER */}
              {candidateTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Profile info editor */}
                  <div className="md:col-span-1 rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                    <h3 className="font-display text-sm font-bold text-gray-900 border-b border-gray-50 pb-3">Información de Perfil</h3>
                    
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      {profileSuccessMsg && (
                        <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          {profileSuccessMsg}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación Actual</label>
                        <input
                          type="text"
                          required
                          value={profileLocation}
                          onChange={(e) => setProfileLocation(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Sector Principal</label>
                        <select
                          value={profileIndustry}
                          onChange={(e) => setProfileIndustry(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        >
                          <option value="Tecnología">Tecnología / Software</option>
                          <option value="Marketing">Marketing / Publicidad</option>
                          <option value="Finanzas">Finanzas / Banca</option>
                          <option value="Diseño">Diseño / UI-UX</option>
                          <option value="Ventas">Ventas / Comercial</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        id="btn-save-profile"
                        className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Guardar Cambios
                      </button>
                    </form>

                    {/* Verification status section */}
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-xs font-bold text-gray-700 mb-2">Estado de Verificación</h4>
                      {currentUser.isVerified ? (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                            Perfil Verificado 🎖️
                          </div>
                          <p className="text-[10px] text-emerald-700 leading-normal">
                            Tu identidad y perfil han sido validados con éxito. Los reclutadores verán el sello de verificación oficial en tus postulaciones.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-2">
                          <h4 className="text-xs font-bold text-amber-900">Verificación Pendiente</h4>
                          <p className="text-[10px] text-amber-700 leading-normal">
                            Sube una copia de tu currículum y pulsa verificar para activar tu insignia de autenticidad en el sistema.
                          </p>
                          <button
                            onClick={handleVerifyProfile}
                            id="btn-verify-profile-tab"
                            disabled={isVerifying}
                            className="w-full rounded-lg bg-amber-600 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                          >
                            {isVerifying ? 'Verificando...' : 'Completar Verificación'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CV text editor */}
                  <div className="md:col-span-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col space-y-4">
                    <div className="border-b border-gray-50 pb-3 flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-gray-900 flex items-center gap-1">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        Mi Currículum Base (Fichero de Entrada)
                      </h3>
                      <span className="text-[10px] font-mono text-gray-400">PDF / Texto plano</span>
                    </div>

                    <div className="flex-1 flex flex-col space-y-2">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Este currículum sirve de base para todas las adaptaciones. Mantén actualizados tus logros, estudios y cargos anteriores para obtener resultados óptimos de la Inteligencia Artificial.
                      </p>
                      <textarea
                        value={profileCVText}
                        onChange={(e) => setProfileCVText(e.target.value)}
                        className="w-full flex-1 min-h-[300px] rounded-xl border border-gray-200 p-4 text-xs font-mono text-gray-800 bg-gray-50/20 focus:border-indigo-500 focus:outline-none"
                        placeholder="Escribe o pega aquí tu CV en formato texto..."
                      />
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleUpdateProfile}
                          id="btn-save-cv"
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                        >
                          Guardar Currículum Base
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          ) : (
            /* RECRUITER VIEW WORKSPACE */
            <RecruiterDashboard
              myJobs={jobs.filter(j => j.recruiterId === currentUser.id)}
              receivedApps={applications}
              currentUser={currentUser}
              onPostJob={handlePostJob}
              onDeleteJob={handleDeleteJob}
              onUpdateAppStatus={handleUpdateAppStatus}
            />
          )}

        </main>
      )}

      {/* 4. MODAL: CV ADAPTATION WIZARD */}
      {isAdaptModalOpen && selectedJob && currentUser && (
        <CVTailorModal
          job={selectedJob}
          currentUser={currentUser}
          onClose={() => setIsAdaptModalOpen(false)}
          onSubmitApplication={handleApplyToJob}
        />
      )}

      {/* 4.5. MODAL: JOB IMPORT WIZARD */}
      {isImporterOpen && currentUser && (
        <JobWebImporterModal
          currentUser={currentUser}
          onClose={() => setIsImporterOpen(false)}
          onImportSuccess={() => {
            fetchJobs(); // reload jobs in background
          }}
        />
      )}

      {/* 5. SIDEBAR: NOTIFICATIONS CENTER */}
      {isNotificationsOpen && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onMarkAsRead={handleMarkNotificationRead}
        />
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-100 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-400 space-y-1">
          <p>© 2026 TrabajoLocal. Desarrollado con tecnología de optimización de perfiles en tiempo real.</p>
          <p className="font-mono text-[10px]">Modelamiento server-side vía Gemini 3.5 Flash | Sin uso de Cloud SQL</p>
        </div>
      </footer>

    </div>
  );
}
