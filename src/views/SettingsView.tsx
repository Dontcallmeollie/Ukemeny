import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  Bell,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, exportDatabaseToJSON, importDatabaseFromJSON, resetDatabaseToDefault } from '../db';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification,
  checkAndSendExpiryNotification
} from '../utils/notifications';

interface SettingsViewProps {
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentTheme, onThemeChange }) => {
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  const settings = useLiveQuery(() => db.settings.get('global-settings'), []);
  const notifPerm = getNotificationPermissionStatus();

  const handleToggleAutoTransfer = async () => {
    if (!settings) return;
    await db.settings.update(settings.id, {
      autoTransferToPantry: !settings.autoTransferToPantry
    });
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      setNotificationStatusMsg('Varslinger er nå aktivert! Du vil bli varslet om varer som utløper.');
      await sendTestNotification();
    } else {
      setNotificationStatusMsg('Varslingstillatelse ble avslått i nettleseren.');
    }
    setTimeout(() => setNotificationStatusMsg(null), 5000);
  };

  const handleSendTestAlert = async () => {
    const success = await sendTestNotification();
    if (success) {
      setNotificationStatusMsg('Testvarsel ble sendt!');
    } else {
      setNotificationStatusMsg('Kunne ikke sende varsel. Sjekk tillatelsene i nettleseren.');
    }
    setTimeout(() => setNotificationStatusMsg(null), 4000);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportDatabaseToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabaseFromJSON(content);
      if (success) {
        alert('Sikkerhetskopi ble importert!');
        window.location.reload();
      } else {
        alert('Kunne ikke importere sikkerhetskopien. Sjekk at filen er en gyldig JSON-fil fra MatApp.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (confirm('Er du sikker på at du vil tilbakestille alle data til standard eksempelmiddager og lager? Dette overskriver dine egne endringer.')) {
      await resetDatabaseToDefault();
      alert('Databasen er tilbakestilt til standarddata!');
      window.location.reload();
    }
  };

  return (
    <div className="pb-safe max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          Innstillinger & App-info
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tilpass utseende, offline-synkronisering og varsler
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Utseende & Tema
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onThemeChange('light')}
            className={`py-2.5 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
              currentTheme === 'light'
                ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-4 h-4" />
            Lyst
          </button>

          <button
            onClick={() => onThemeChange('dark')}
            className={`py-2.5 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
              currentTheme === 'dark'
                ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-4 h-4" />
            Mørkt
          </button>

          <button
            onClick={() => onThemeChange('system')}
            className={`py-2.5 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
              currentTheme === 'system'
                ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Laptop className="w-4 h-4" />
            System
          </button>
        </div>
      </div>

      {/* Synchronization Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Handlemann & Lager-synk
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
              Automatisk overføring til matvarelager
            </h4>
            <p className="text-[11px] text-slate-500">
              Varer som hukes av i handlelisten legges automatisk til i beholdningen med estimert utløpsdato.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
            <input
              type="checkbox"
              checked={settings?.autoTransferToPantry ?? true}
              onChange={handleToggleAutoTransfer}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-800"></div>
          </label>
        </div>
      </div>

      {/* Push Notifications Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-blue-700" />
            Holdbarhetsvarsling
          </h3>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              notifPerm.permission === 'granted'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                : notifPerm.permission === 'denied'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {notifPerm.permission === 'granted'
              ? 'Aktivert'
              : notifPerm.permission === 'denied'
              ? 'Blokkert'
              : 'Ikke aktivert'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Motta daglige påminnelser på Android-telefonen når matvarer i lageret er i ferd med å gå ut på dato innenfor de neste 2–3 dagene.
        </p>

        {notificationStatusMsg && (
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{notificationStatusMsg}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {notifPerm.permission !== 'granted' ? (
            <button
              onClick={handleEnableNotifications}
              className="flex-1 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Tillat varsler på telefonen
            </button>
          ) : (
            <button
              onClick={handleSendTestAlert}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Send testvarsel nå
            </button>
          )}

          <button
            onClick={() => checkAndSendExpiryNotification(true)}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            title="Sjekk lageret nå"
          >
            Sjekk lager
          </button>
        </div>
      </div>

      {/* Offline & Data Backup (Export / Import / Reset) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          Offline-først & Sikkerhetskopi
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          All data lagres lokalt i nettleserens <strong>IndexedDB</strong>. Ingen server er involvert. Ta en sikkerhetskopi som kan flyttes til andre enheter.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportBackup}
            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-700" />
            Eksporter (JSON)
          </button>

          <label className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-indigo-600" />
            Importer fil
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleResetData}
            className="w-full py-2 text-rose-500 hover:text-rose-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tilbakestill til standard eksempelmiddager
          </button>
        </div>
      </div>

      {/* Android Installation Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4 border border-blue-200 dark:border-blue-800/60 space-y-2">
        <h3 className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Installere på Android (PWA)
        </h3>
        <div className="text-xs text-blue-900/80 dark:text-blue-300 space-y-1.5 leading-relaxed">
          <p>
            1. Åpne denne siden i <strong>Google Chrome</strong> eller <strong>Samsung Internet</strong> på din Android-telefon.
          </p>
          <p>
            2. Trykk på menyikonet (<strong>tre prikker ⋮</strong>) og velg <strong>«Installer app»</strong> eller <strong>«Legg til på startskjermen»</strong>.
          </p>
          <p>
            3. Appen legges til som en fullverdig mobilapp med eget ikon, fullskjerm uten nettleserlinje, og fungerer <strong>100% offline</strong>!
          </p>
        </div>
      </div>
    </div>
  );
};
