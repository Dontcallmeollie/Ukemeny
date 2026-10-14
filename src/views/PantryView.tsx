import React, { useState } from 'react';
import {
  Box,
  Plus,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  Search,
  Bell,
  X
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PantryItem, StorageLocation } from '../types';
import { getExpiryInfo, formatNorwegianDate, addDaysToDate, estimateDefaultShelfLifeDays } from '../utils/unitConverter';
import { checkAndSendExpiryNotification } from '../utils/notifications';

export const PantryView: React.FC = () => {
  const [filterLocation, setFilterLocation] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'added'>('expiry');
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('1');
  const [newUnit, setNewUnit] = useState('stk');
  const [newCategory, setNewCategory] = useState<StorageLocation>('Kjøleskap');
  const [newExpiryDays, setNewExpiryDays] = useState<number>(7);
  const [newCustomExpiryDate, setNewCustomExpiryDate] = useState('');

  // Live queries
  const items = useLiveQuery(() => db.pantry.toArray(), []) || [];

  // Filter & Sort
  const filteredItems = items
    .filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterLocation === 'Alle') return true;
      if (filterLocation === 'Utløper snart') {
        const info = getExpiryInfo(item.expiryDate);
        return info.status === 'expired' || info.status === 'warning';
      }
      return item.category === filterLocation;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'no');
      }
      if (sortBy === 'added') {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }
      // Sort by expiry: expired/soon first, no-date last
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });

  // Calculate expiring stats
  const expiringItems = items.filter(i => {
    const info = getExpiryInfo(i.expiryDate);
    return info.status === 'expired' || info.status === 'warning';
  });

  const handleTriggerNotificationCheck = async () => {
    const res = await checkAndSendExpiryNotification(true);
    setNotificationToast(res.message);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const handleQuickAdjustAmount = async (item: PantryItem, delta: number) => {
    const nextAmount = Math.max(0, item.amount + delta);
    if (nextAmount === 0) {
      if (confirm(`Vil du fjerne ${item.name} fra matvarelageret?`)) {
        await db.pantry.delete(item.id);
      }
    } else {
      await db.pantry.update(item.id, {
        amount: Math.round(nextAmount * 10) / 10,
        updatedAt: Date.now()
      });
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Er du sikker på at du vil slette ${name}?`)) {
      await db.pantry.delete(id);
    }
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const amt = parseFloat(newAmount.replace(',', '.')) || 1;
    let finalExpiry = newCustomExpiryDate;
    if (!finalExpiry && newExpiryDays > 0) {
      finalExpiry = addDaysToDate(new Date(), newExpiryDays);
    }

    const now = Date.now();
    await db.pantry.add({
      id: `pantry-${now}-${Math.random().toString(36).substr(2, 4)}`,
      name: newName.trim(),
      amount: amt,
      unit: newUnit.trim(),
      category: newCategory,
      expiryDate: finalExpiry || undefined,
      addedAt: now,
      updatedAt: now
    });

    // Reset & close
    setNewName('');
    setNewAmount('1');
    setNewCustomExpiryDate('');
    setShowAddModal(false);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await db.pantry.update(editingItem.id, {
      name: editingItem.name,
      amount: editingItem.amount,
      unit: editingItem.unit,
      category: editingItem.category,
      expiryDate: editingItem.expiryDate || undefined,
      notes: editingItem.notes,
      updatedAt: Date.now()
    });

    setEditingItem(null);
  };

  return (
    <div className="pb-safe max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Top Banner & Expiry Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-900/30">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Matvarelager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items.length} varer i beholdning • Holdbarhetskontroll
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Ny vare
          </button>
        </div>

        {/* Expiry Alert Warning Banner if any items are expiring */}
        {expiringItems.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 leading-tight">
                  {expiringItems.length} vare{expiringItems.length === 1 ? '' : 'r'} går ut på dato snart!
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Bruk i dag eller frys ned for å unngå matsvinn.
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerNotificationCheck}
              className="p-2 bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-300 rounded-xl transition-colors"
              title="Send varsel til telefon"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Sort Row */}
        <div className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Søk i lageret..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'expiry' | 'name' | 'added')}
            className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium outline-none"
          >
            <option value="expiry">Utløpsdato</option>
            <option value="name">Navn (A-Å)</option>
            <option value="added">Sist lagt til</option>
          </select>
        </div>

        {/* Location Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {['Alle', 'Kjøleskap', 'Fryser', 'Tørrvare', 'Utløper snart'].map(loc => (
            <button
              key={loc}
              onClick={() => setFilterLocation(loc)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterLocation === loc
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {loc}
              {loc === 'Utløper snart' && expiringItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                  {expiringItems.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {notificationToast && (
        <div className="bg-slate-900 text-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl text-xs shadow-lg flex items-center gap-2 animate-slide-up">
          <Bell className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Pantry Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Box className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ingen varer funnet</h3>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Prøv et annet søkeord' : 'Legg til varer med «Ny vare» eller handle fra handlelisten.'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const expiryInfo = getExpiryInfo(item.expiryDate);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 transition-all"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      {item.category}
                    </span>
                  </div>

                  {/* Expiry Badge */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${expiryInfo.badgeBg}`}
                    >
                      <Clock className="w-3 h-3" />
                      {item.expiryDate ? formatNorwegianDate(item.expiryDate) : 'Ingen dato'}
                      {expiryInfo.status !== 'none' && ` (${expiryInfo.label})`}
                    </span>
                  </div>
                </div>

                {/* Amount with Stepper Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1">
                    <button
                      onClick={() => handleQuickAdjustAmount(item, -1)}
                      className="w-5 h-5 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs"
                      title="Reduser mengde"
                    >
                      -
                    </button>
                    <span className="font-bold text-xs text-slate-900 dark:text-white px-2">
                      {item.amount} {item.unit}
                    </span>
                    <button
                      onClick={() => handleQuickAdjustAmount(item, 1)}
                      className="w-5 h-5 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs"
                      title="Øk mengde"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Rediger vare"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveNewItem}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Legg til i matvarelager</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Varenavn:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => {
                    const val = e.target.value;
                    setNewName(val);
                    // auto calculate default days
                    const days = estimateDefaultShelfLifeDays(val, newCategory);
                    setNewExpiryDays(days);
                  }}
                  placeholder="F.eks. Kjøttdeig, Melk, Gulrøtter..."
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mengde:
                  </label>
                  <input
                    type="text"
                    required
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Enhet:
                  </label>
                  <select
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="stk">stk</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="dl">dl</option>
                    <option value="liter">liter</option>
                    <option value="boks">boks</option>
                    <option value="pk">pk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Plassering:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Kjøleskap', 'Fryser', 'Tørrvare'] as StorageLocation[]).map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => {
                        setNewCategory(cat);
                        const days = estimateDefaultShelfLifeDays(newName, cat);
                        setNewExpiryDays(days);
                      }}
                      className={`py-2 rounded-xl font-medium transition-all ${
                        newCategory === cat
                          ? 'bg-blue-800 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Holdbarhet / Utløpsdato:
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newCustomExpiryDate || addDaysToDate(new Date(), newExpiryDays)}
                    onChange={e => setNewCustomExpiryDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[3, 7, 14, 30, 90].map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => {
                        setNewExpiryDays(d);
                        setNewCustomExpiryDate(addDaysToDate(new Date(), d));
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] hover:bg-slate-200"
                    >
                      +{d} dager
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-xl shadow-md"
              >
                Lagre i lageret
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleUpdateItem}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Rediger råvare</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Varenavn:
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mengde:
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingItem.amount}
                    onChange={e => setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Enhet:
                  </label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Plassering:
                </label>
                <select
                  value={editingItem.category}
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value as StorageLocation })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl"
                >
                  <option value="Kjøleskap">Kjøleskap</option>
                  <option value="Fryser">Fryser</option>
                  <option value="Tørrvare">Tørrvare</option>
                  <option value="Annet">Annet</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Best før / Utløpsdato:
                </label>
                <input
                  type="date"
                  value={editingItem.expiryDate || ''}
                  onChange={e => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notater:
                </label>
                <input
                  type="text"
                  value={editingItem.notes || ''}
                  onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
                  placeholder="F.eks. åpnet pakke, frysepose 2..."
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteItem(editingItem.id, editingItem.name);
                  setEditingItem(null);
                }}
                className="px-3 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-semibold flex items-center gap-1 text-xs"
              >
                <Trash2 className="w-4 h-4" />
                Slett
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Lukk
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-xl text-xs shadow-md"
                >
                  Oppdater
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
