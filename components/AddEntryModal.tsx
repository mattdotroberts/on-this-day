'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Calendar } from 'lucide-react';
import { MONTHS } from '@/lib/types';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (month: string, day: number) => Promise<void>;
  additionalCount: number;
  maxAdditional: number;
}

export const AddEntryModal = ({
  isOpen,
  onClose,
  onAdd,
  additionalCount,
  maxAdditional,
}: AddEntryModalProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[0]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = maxAdditional - additionalCount;

  // Get days in selected month (using a non-leap year for simplicity)
  const getDaysInMonth = (month: string): number => {
    const daysMap: Record<string, number> = {
      January: 31,
      February: 29, // Allow Feb 29 for leap years
      March: 31,
      April: 30,
      May: 31,
      June: 30,
      July: 31,
      August: 31,
      September: 30,
      October: 31,
      November: 30,
      December: 31,
    };
    return daysMap[month] || 31;
  };

  const daysInMonth = getDaysInMonth(selectedMonth);

  const handleSubmit = async () => {
    if (remaining <= 0) {
      setError('Maximum additional entries reached');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await onAdd(selectedMonth, selectedDay);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add entry');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-cinzel text-xl text-slate-900">Add Entry</h3>
              <p className="text-xs text-slate-500">
                {remaining} of {maxAdditional} remaining
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={isAdding}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6 font-serif-display">
            Choose a date to generate a new historical entry connected to your interests.
          </p>

          {/* Date Picker */}
          <div className="flex gap-4 mb-6">
            {/* Month Select */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  // Reset day if current day exceeds days in new month
                  const newDays = getDaysInMonth(e.target.value);
                  if (selectedDay > newDays) {
                    setSelectedDay(newDays);
                  }
                }}
                disabled={isAdding}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Day Select */}
            <div className="w-24">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Day
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                disabled={isAdding}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-amber-50 rounded-lg p-4 mb-6 text-center">
            <p className="font-cinzel text-lg text-amber-900">
              {selectedMonth} {selectedDay}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Historical event will be generated for this date
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isAdding || remaining <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Entry...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Entry
              </>
            )}
          </button>

          {remaining <= 0 && (
            <p className="text-center text-xs text-slate-500 mt-4">
              You've reached the maximum of {maxAdditional} additional entries.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
