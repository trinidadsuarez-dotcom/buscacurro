/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Job } from '../types.js';
import { MapPin, DollarSign, Calendar, ShieldCheck, ArrowUpRight, Globe } from 'lucide-react';

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, isSelected, onSelect }) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const postedText = daysAgo === 0 
    ? 'Publicado hoy' 
    : daysAgo === 1 
      ? 'Publicado ayer' 
      : `Publicado hace ${daysAgo} días`;

  // Format currency
  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div
      onClick={onSelect}
      id={`job-card-${job.id}`}
      className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50/20 shadow-sm shadow-indigo-100/50 ring-1 ring-indigo-600'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Company and Verification Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            {job.company}
            {job.isVerifiedCompany && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100" title="Empresa Verificada">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Empresa Verificada
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium text-gray-400 font-mono">
            {postedText}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2.5 font-display text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-start justify-between gap-2">
          <span>{job.title}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </h3>

        {/* Industry Tag */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {job.industry}
          </span>
          {job.source && (
            <span className="text-[9px] font-semibold text-gray-400">
              Fuente: {job.source}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            job.type === 'remote' ? 'bg-sky-50 text-sky-700' : 'bg-gray-50 text-gray-700'
          }`}>
            {job.type === 'remote' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {job.type === 'remote' ? 'Remoto' : 'Local'}
          </span>
        </div>

        {/* Short Description snippet */}
        <p className="mt-3 line-clamp-2 text-xs text-gray-500 leading-relaxed">
          {job.description}
        </p>
      </div>

      {/* Footer Info (Salary & Location) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-50 pt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1 text-gray-700 font-medium">
          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {job.salaryMax > 0
              ? `${formatSalary(job.salaryMin)} - ${formatSalary(job.salaryMax)}`
              : 'Salario no indicado'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>{job.location}</span>
        </div>
      </div>
    </div>
  );
};
