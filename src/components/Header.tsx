/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Notification } from '../types.js';
import { Briefcase, Bell, CheckCircle, ShieldAlert, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  notifications: Notification[];
  onOpenNotifications: () => void;
  onLogout: () => void;
  onToggleRole: () => void;
  onVerifyProfile: () => void;
  isVerifying: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications,
  onOpenNotifications,
  onLogout,
  onToggleRole,
  onVerifyProfile,
  isVerifying
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-100">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
              Trabajo<span className="text-indigo-600">Local</span>
            </h1>
            <p className="hidden text-[10px] font-mono text-gray-400 sm:block">ESPACIO DE CONFIANZA</p>
          </div>
        </div>

        {/* User Stats & Navigation Actions */}
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Quick Demo Switch Role */}
            <button
              onClick={onToggleRole}
              id="btn-switch-role"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              title="Alternar entre vista candidato o reclutador"
            >
              <RefreshCw className="h-3 w-3 text-indigo-500 animate-pulse" />
              <span className="hidden sm:inline">Modo:</span> 
              <span className="text-indigo-600">{currentUser.role === 'candidate' ? 'Candidato' : 'Reclutador'}</span>
            </button>

            {/* Profile Verification Badge */}
            {currentUser.role === 'candidate' && (
              currentUser.isVerified ? (
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Perfil Verificado</span>
                </div>
              ) : (
                <button
                  onClick={onVerifyProfile}
                  id="btn-verify-header"
                  disabled={isVerifying}
                  className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  title="Verifica tu perfil para generar confianza"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span>{isVerifying ? 'Verificando...' : 'Verificar Perfil'}</span>
                </button>
              )
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              id="btn-notifications"
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Bell className="h-5.5 w-5.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 border-l border-gray-100 pl-3 sm:pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-gray-900 leading-3">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{currentUser.email}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <UserIcon className="h-4.5 w-4.5" />
              </div>
              <button
                onClick={onLogout}
                id="btn-logout"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

          </div>
        ) : (
          <div className="text-xs font-medium text-gray-500">
            Conectando...
          </div>
        )}
      </div>
    </header>
  );
};
