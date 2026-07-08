/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Job } from '../types.js';
import { 
  X, 
  Sparkles, 
  Globe, 
  Radio, 
  Search, 
  Cpu, 
  AlertCircle, 
  Check, 
  ArrowRight, 
  HelpCircle,
  Clock,
  ExternalLink,
  Briefcase,
  Layers
} from 'lucide-react';

interface JobWebImporterModalProps {
  currentUser: User;
  onClose: () => void;
  onImportSuccess: () => void;
}

const PRESET_FEEDS = [
  { name: 'We Work Remotely (Programación)', url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss' },
  { name: 'RemoteOK (Todas)', url: 'https://remoteok.com/remote-jobs.rss' },
  { name: 'We Work Remotely (Diseño)', url: 'https://weworkremotely.com/categories/remote-design-jobs.rss' }
];

export const JobWebImporterModal: React.FC<JobWebImporterModalProps> = ({
  currentUser,
  onClose,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'rss' | 'scrape'>('api');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [importedJobs, setImportedJobs] = useState<Job[]>([]);

  // Tab State Values
  const [apiQuery, setApiQuery] = useState('react');
  const [rssUrl, setRssUrl] = useState('https://weworkremotely.com/categories/remote-programming-jobs.rss');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [showRawContentInput, setShowRawContentInput] = useState(false);

  const triggerImport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessCount(null);
    setImportedJobs([]);

    // Configure loader steps
    let steps: string[] = [];
    if (activeTab === 'api') {
      steps = [
        "Consultando API Pública de Remotive...",
        "Parseando datos JSON recibidos...",
        "Filtrando vacantes duplicadas...",
        "Guardando nuevas ofertas en la base de datos de PostgreSQL..."
      ];
    } else if (activeTab === 'rss') {
      steps = [
        "Conectando al servidor del feed RSS...",
        "Descargando XML de ofertas...",
        "Enviando XML a la IA de Gemini para análisis y traducción...",
        "Estructurando e insertando en la base de datos..."
      ];
    } else {
      steps = [
        "Conectando al portal web...",
        "Extrayendo HTML y limpiando scripts...",
        "Enviando contenido depurado a Gemini 3.5-Flash...",
        "Extrayendo título, empresa, sueldo y requisitos con IA...",
        "Guardando vacante estructurada en la base de datos..."
      ];
    }

    let currentStepIdx = 0;
    setLoadingStep(steps[currentStepIdx]);

    const stepInterval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 2000);

    try {
      const body: any = {
        mode: activeTab,
        userId: currentUser.id
      };

      if (activeTab === 'api') {
        body.query = apiQuery;
      } else if (activeTab === 'rss') {
        body.rssUrl = rssUrl;
      } else if (activeTab === 'scrape') {
        body.scrapeUrl = scrapeUrl;
        if (showRawContentInput && rawContent.trim() !== '') {
          body.rawContent = rawContent;
        }
      }

      const response = await fetch('/api/jobs/import-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || "Ocurrió un error inesperado al importar.");
      }

      const resData = await response.json();

      if (activeTab === 'scrape') {
        if (resData.job) {
          setImportedJobs([resData.job]);
          setSuccessCount(1);
        } else {
          setSuccessCount(0);
        }
      } else {
        setImportedJobs(resData.jobs || []);
        setSuccessCount(resData.count || 0);
      }

      onImportSuccess();

    } catch (e) {
      clearInterval(stepInterval);
      console.error("Import failed:", e);
      setError(e instanceof Error ? e.message : "Error de comunicación con el servidor. Verifica las configuraciones.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 border border-indigo-100">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">Importador de Empleo de Internet</h2>
              <p className="text-xs text-gray-400">Pasa vacantes de APIs, RSS feeds o portales web directamente a tu base de datos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab selector */}
        {!isLoading && !successCount && (
          <div className="flex border-b border-gray-100 mt-4 gap-2">
            {[
              { id: 'api', label: 'APIs Públicas', icon: Search, desc: 'Búsqueda directa en Remotive' },
              { id: 'rss', label: 'RSS Feeds', icon: Radio, desc: 'Importar desde feeds XML' },
              { id: 'scrape', label: 'Web Scraping (IA)', icon: Cpu, desc: 'Escanear URL con Gemini' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setError(null);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 border-b-2 text-center transition-all ${
                    isActive 
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' 
                      : 'border-transparent text-gray-400 hover:text-gray-900 hover:bg-gray-50/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold font-display">{tab.label}</span>
                  <span className="text-[9px] opacity-75">{tab.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal body content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          {isLoading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-5">
              <div className="relative">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-indigo-500 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Procesando Importación</h4>
                <p className="text-sm font-bold text-gray-700 font-display animate-pulse">{loadingStep}</p>
                <p className="text-xs text-gray-400 max-w-sm">Este proceso es en tiempo real y puede demorar unos segundos debido a la conexión externa e interpretación con la IA.</p>
              </div>
            </div>
          ) : successCount !== null ? (
            /* Success State */
            <div className="space-y-4 text-center">
              <div className="inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600 border border-emerald-100">
                <Check className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-gray-900">¡Importación Completada!</h3>
                <p className="text-xs text-gray-500">
                  {successCount > 0 
                    ? `Hemos localizado e importado con éxito ${successCount} nueva(s) oferta(s) de trabajo en la base de datos local.` 
                    : "No se encontraron nuevas ofertas o ya existían en tu base de datos."}
                </p>
              </div>

              {importedJobs.length > 0 && (
                <div className="text-left border border-gray-100 rounded-xl bg-gray-50 p-3 space-y-2 max-h-[40vh] overflow-y-auto">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Vacantes Incorporadas:</span>
                  {importedJobs.map((j, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-2.5 border border-gray-100 flex items-center justify-between hover:shadow-xs transition-shadow">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">{j.title}</h4>
                        <p className="text-[10px] text-gray-500">{j.company} • <span className="italic">{j.location}</span></p>
                      </div>
                      <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 capitalize">
                        {j.industry}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => {
                    setSuccessCount(null);
                    setImportedJobs([]);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Importar más ofertas
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Cerrar e ir a la Bolsa de Trabajo
                </button>
              </div>
            </div>
          ) : (
            /* Forms Input State */
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 flex gap-2.5 text-red-700">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold block">Error al procesar la importación</span>
                    <p className="text-[11px] leading-relaxed opacity-90">{error}</p>
                  </div>
                </div>
              )}

              {/* API Tab Form */}
              {activeTab === 'api' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3.5 space-y-1">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> Conexión con Remotive API
                    </span>
                    <p className="text-[11px] text-blue-600 leading-relaxed">
                      Remotive es un portal de empleo global líder en tecnología. Este módulo hace una llamada HTTP directa a su API oficial pública y descarga las últimas 8 vacantes correspondientes a tu búsqueda, insertándolas en PostgreSQL (con base simulada en db.json) con todos sus datos.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">Término de Búsqueda (Tecnología, Rol, Empresa)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiQuery}
                        onChange={(e) => setApiQuery(e.target.value)}
                        placeholder="Ej. react, python, marketing, senior..."
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={triggerImport}
                        className="rounded-lg bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                      >
                        Buscar e Importar
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400">Prueba con palabras clave en inglés para máxima compatibilidad con Remotive (ej. "react", "django", "frontend").</span>
                  </div>
                </div>
              )}

              {/* RSS Feeds Tab Form */}
              {activeTab === 'rss' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-3.5 space-y-1">
                    <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                      <Radio className="h-3.5 w-3.5 animate-pulse text-purple-600" /> Lector RSS Inteligente con IA
                    </span>
                    <p className="text-[11px] text-purple-600 leading-relaxed">
                      Introduce la URL de cualquier RSS feed de empleo (o selecciona uno de nuestros presets). El backend descargará el feed XML y utilizará Gemini para estructurar, resumir y traducir las ofertas al español de forma automática.
                    </p>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider font-mono">Predeterminados</span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_FEEDS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRssUrl(preset.url)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            rssUrl === preset.url 
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">URL de Feed RSS</label>
                    <input
                      type="url"
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      placeholder="https://servidor.com/feed-empleo.xml"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono text-gray-600"
                    />
                  </div>

                  <button
                    onClick={triggerImport}
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Escanear e Importar RSS con Gemini
                  </button>
                </div>
              )}

              {/* Web Scraping Tab Form */}
              {activeTab === 'scrape' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 space-y-1">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" /> Web Scraper Asistido por Gemini
                    </span>
                    <p className="text-[11px] text-amber-600 leading-relaxed">
                      ¿Has visto una oferta interesante en Internet? Introduce su URL. El backend intentará realizar un crawling, limpiar el código HTML y Gemini extraerá con precisión de cirujano el título, la empresa, el sueldo, la ubicación y el texto de la descripción.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 block">URL de la Oferta de Trabajo</label>
                    <input
                      type="url"
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      placeholder="https://portalempleo.com/oferta/desarrollador-web-senior-123"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-gray-400">Puedes ingresar enlaces de portales públicos de empleo, blogs corporativos de talento o cualquier URL que contenga la descripción.</span>
                  </div>

                  {/* Fallback Paste Toggle */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowRawContentInput(!showRawContentInput)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>{showRawContentInput ? "Ocultar" : "Mostrar"} copia de seguridad por bloqueo (Copy-Paste)</span>
                    </button>

                    {showRawContentInput && (
                      <div className="mt-2 space-y-1.5 animate-fadeIn">
                        <span className="block text-[10px] text-gray-500 leading-relaxed">
                          Si crees que el sitio web puede bloquear raspadores automáticos por Cloudflare, puedes copiar y pegar el texto completo que ves en pantalla en el siguiente cuadro para que Gemini lo procese de igual forma:
                        </span>
                        <textarea
                          value={rawContent}
                          onChange={(e) => setRawContent(e.target.value)}
                          placeholder="Pega el texto de la oferta, requerimientos o HTML copiado de la web aquí..."
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-mono text-gray-600"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={triggerImport}
                    disabled={!scrapeUrl}
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Iniciar Scraping con IA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Transacciones persistentes en base de datos local
          </span>
          <span>TrabajoLocal Engine v1.2</span>
        </div>

      </div>
    </div>
  );
};
