/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, MapPin, DollarSign, Globe, Briefcase } from 'lucide-react';

interface JobFiltersProps {
  location: string;
  onChangeLocation: (val: string) => void;
  selectedIndustry: string;
  onChangeIndustry: (val: string) => void;
  selectedType: string;
  onChangeType: (val: string) => void;
  salaryMin: number;
  onChangeSalaryMin: (val: number) => void;
}

const INDUSTRIES = ['Todas', 'Tecnología', 'Marketing', 'Finanzas', 'Diseño', 'Soporte', 'Ventas'];

export const JobFilters: React.FC<JobFiltersProps> = ({
  location,
  onChangeLocation,
  selectedIndustry,
  onChangeIndustry,
  selectedType,
  onChangeType,
  salaryMin,
  onChangeSalaryMin
}) => {

  const formatSalaryLabel = (amount: number) => {
    if (amount === 0) return 'Cualquier salario';
    return `Mínimo: ${new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-display text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
        <Briefcase className="h-4 w-4 text-indigo-600" />
        Filtros de Búsqueda
      </h3>

      <div className="space-y-4">
        
        {/* Location Search Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            Ubicación (Área local)
          </label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => onChangeLocation(e.target.value)}
              placeholder="Ej: Madrid, Barcelona, Remoto..."
              id="filter-location-input"
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-8.5 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
            />
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* Industry dropdown */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-gray-400" />
            Industria / Sector
          </label>
          <select
            value={selectedIndustry}
            onChange={(e) => onChangeIndustry(e.target.value)}
            id="filter-industry-select"
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors"
          >
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Job Type (Local/Remote/All) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <Globe className="h-3 w-3 text-gray-400" />
            Modalidad de Trabajo
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-0.5">
            {[
              { id: 'Todos', label: 'Todos' },
              { id: 'local', label: 'Local' },
              { id: 'remote', label: 'Remoto' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeType(t.id)}
                id={`filter-type-${t.id}`}
                className={`rounded-md py-1 text-[10px] font-bold transition-all ${
                  selectedType === t.id
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Salary Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-gray-400" />
              Salario Deseado
            </label>
            <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {formatSalaryLabel(salaryMin)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="80000"
            step="5000"
            value={salaryMin}
            onChange={(e) => onChangeSalaryMin(Number(e.target.value))}
            id="filter-salary-slider"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
          />
          <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-1">
            <span>€0</span>
            <span>€40K</span>
            <span>€80K+</span>
          </div>
        </div>

        {/* Reset filters */}
        <button
          type="button"
          onClick={() => {
            onChangeLocation('');
            onChangeIndustry('Todas');
            onChangeType('Todos');
            onChangeSalaryMin(0);
          }}
          className="w-full rounded-lg border border-dashed border-gray-200 py-1.5 text-center text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          Limpiar todos los filtros
        </button>

      </div>
    </div>
  );
};
