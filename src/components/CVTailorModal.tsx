/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Job, User } from '../types.js';
import { Wand2, X, Sparkles, Check, ArrowRight, ArrowLeft, Eye, FileText, CheckCircle } from 'lucide-react';

interface CVTailorModalProps {
  job: Job;
  currentUser: User;
  onClose: () => void;
  onSubmitApplication: (resume: string, coverLetter: string) => Promise<void>;
}

const LOADING_STEPS = [
  "Analizando la descripción de la oferta y requisitos clave...",
  "Extrayendo palabras clave e industria objetivo...",
  "Reestructurando tu CV para priorizar las habilidades afines...",
  "Optimizando logros y redactando con lenguaje de alto impacto...",
  "Generando carta de presentación (motivación) personalizada...",
  "Finalizando formato profesional en Markdown..."
];

export const CVTailorModal: React.FC<CVTailorModalProps> = ({
  job,
  currentUser,
  onClose,
  onSubmitApplication
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cvText, setCvText] = useState(currentUser.cvText || '');
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tailorResult, setTailorResult] = useState<{
    resumeTailored: string;
    coverLetterTailored: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cycle through loading steps to keep user engaged
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOptimizing) {
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isOptimizing]);

  const handleStartOptimization = async () => {
    if (!cvText.trim()) {
      setError("Por favor escribe o pega tu currículum antes de continuar.");
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setStep(2);
    setLoadingStepIndex(0);

    try {
      const response = await fetch('/api/gemini/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          jobTitle: job.title,
          jobCompany: job.company,
          jobDescription: job.description
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al adaptar el CV.");
      }

      const data = await response.json();
      setTailorResult(data);
      setStep(3);
    } catch (e) {
      console.error("Tailoring failed:", e);
      setError(e instanceof Error ? e.message : "Error de red al procesar tu solicitud.");
      setStep(1);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = async () => {
    if (!tailorResult) return;
    try {
      await onSubmitApplication(tailorResult.resumeTailored, tailorResult.coverLetterTailored);
      onClose();
    } catch (e) {
      setError("Error al enviar la postulación.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Wand2 className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-gray-900">
                Adaptar CV con IA Gemini
              </h3>
              <p className="text-[11px] text-gray-500">
                Postular a <span className="font-semibold text-gray-700">{job.title}</span> en <span className="font-semibold text-indigo-600">{job.company}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="bg-gray-50/50 px-6 py-2.5 border-b border-gray-100 flex justify-between items-center text-xs">
          <div className="flex items-center gap-5">
            <span className={`flex items-center gap-1.5 font-semibold ${step === 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
              Revisar CV Original
            </span>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <span className={`flex items-center gap-1.5 font-semibold ${step === 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 2 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-gray-200 text-gray-600'}`}>2</span>
              Optimización IA
            </span>
            <ArrowRight className="h-3 w-3 text-gray-300" />
            <span className={`flex items-center gap-1.5 font-semibold ${step === 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>3</span>
              Comparar y Postular
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: REVIEW ORIGINAL CV */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-indigo-50/40 border border-indigo-100/50 p-4">
                <h4 className="font-display text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                  ¿Cómo funciona la adaptación?
                </h4>
                <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                  Nuestra Inteligencia Artificial <strong>Gemini 3.5 Flash</strong> analizará los requisitos específicos de esta vacante (tecnologías clave, habilidades blandas, experiencia mínima) y reescribirá estratégicamente tu CV para alinear tus conocimientos. Además, redactará una carta de presentación profesional para aumentar tus posibilidades de entrevista.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Confirma o actualiza tu Currículum base:
                </label>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Pega aquí tu información profesional (educación, experiencia laboral, habilidades)..."
                  className="w-full h-64 rounded-xl border border-gray-200 p-4 text-xs text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-gray-50/20"
                />
              </div>
            </div>
          )}

          {/* STEP 2: LOADING SCREEN */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              
              {/* Spinner & Sparkles */}
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                <Sparkles className="absolute top-5 left-5 h-6 w-6 text-indigo-500 animate-pulse" />
              </div>

              {/* Progress tips */}
              <div className="text-center max-w-md space-y-2">
                <h4 className="font-display text-base font-bold text-gray-900">
                  Optimizando tu Perfil profesional
                </h4>
                <div className="min-h-[40px] flex items-center justify-center">
                  <p className="text-xs text-indigo-600 font-medium animate-pulse">
                    {LOADING_STEPS[loadingStepIndex]}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400">
                  La IA está reestructurando tus datos. Esto toma de 5 a 10 segundos.
                </p>
              </div>

              {/* Simulating details */}
              <div className="w-full max-w-md rounded-xl bg-gray-50 border border-gray-100 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Conexión establecida con Gemini API</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                  <div className={`h-1.5 w-1.5 rounded-full bg-indigo-500 ${loadingStepIndex >= 2 ? 'bg-emerald-500' : 'animate-ping'}`}></div>
                  <span>Alineando experiencia laboral con la industria: <span className="font-bold text-gray-700">{job.industry}</span></span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                  <div className={`h-1.5 w-1.5 rounded-full bg-indigo-500 ${loadingStepIndex >= 4 ? 'bg-emerald-500' : 'animate-ping'}`}></div>
                  <span>Buscando equivalencias en salario deseado</span>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: SIDE-BY-SIDE COMPARISON */}
          {step === 3 && tailorResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <span><strong>¡Adaptación Completa!</strong> Gemini ha alineado tu perfil con el puesto. Revisa el resultado antes de postularte.</span>
              </div>

              {/* Tabs / Panels side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CV Original */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col h-[400px]">
                  <div className="border-b border-gray-200 bg-gray-100/50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      Tu CV Base
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Sin optimizar</span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto text-[11px] text-gray-500 whitespace-pre-line font-mono">
                    {cvText}
                  </div>
                </div>

                {/* CV Adaptado por Gemini */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/10 flex flex-col h-[400px]">
                  <div className="border-b border-indigo-200 bg-indigo-50/50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                      CV Adaptado por IA
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Optimizado</span>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto text-xs text-gray-800 leading-relaxed prose prose-sm max-w-none">
                    {tailorResult.resumeTailored.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">{line}</p>
                    ))}
                  </div>
                </div>

              </div>

              {/* Cover Letter */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h4 className="font-display text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Eye className="h-4.5 w-4.5 text-indigo-600" />
                  Carta de Presentación Generada
                </h4>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed font-sans whitespace-pre-line">
                  {tailorResult.coverLetterTailored}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/50 rounded-b-2xl">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartOptimization}
                id="btn-trigger-optimize"
                className="rounded-lg bg-indigo-600 px-4.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Optimizar con Gemini
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Editar CV Base
              </button>
              <button
                type="button"
                onClick={handleApply}
                id="btn-apply-tailored"
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-100"
              >
                Enviar Postulación Adaptada
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <div className="w-full text-center text-xs text-gray-400 font-mono">
              Procesando en servidores de Google Cloud Run...
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
