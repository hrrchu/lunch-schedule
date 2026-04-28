'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CustomHoliday } from '@/lib/types';

export default function HolidayManager({
  holidays,
  onChange,
}: {
  holidays: CustomHoliday[];
  onChange: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const addHoliday = async () => {
    if (!date || !name.trim()) return;
    setLoading(true);
    await supabase.from('custom_holidays').insert({ date, name: name.trim() });
    setDate('');
    setName('');
    setLoading(false);
    onChange();
  };

  const deleteHoliday = async (id: string) => {
    await supabase.from('custom_holidays').delete().eq('id', id);
    onChange();
  };

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="w-full mt-5">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl shadow-sm border border-pink-100 text-pink-800 font-semibold hover:bg-pink-50 transition"
      >
        <span className="flex items-center gap-2">
          <span>🗓️</span>
          <span>대체공휴일 관리</span>
          {holidays.length > 0 && (
            <span className="text-xs bg-pink-100 text-pink-600 rounded-full px-2 py-0.5">
              {holidays.length}
            </span>
          )}
        </span>
        <span className="text-pink-300 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-2xl shadow-sm border border-pink-100 p-4">
          {/* Add form */}
          <div className="flex gap-2 mb-4">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-pink-50/50"
            />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 (예: 대체공휴일)"
              className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-pink-50/50"
              onKeyDown={e => e.key === 'Enter' && addHoliday()}
            />
            <button
              onClick={addHoliday}
              disabled={loading || !date || !name.trim()}
              className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-pink-600 transition whitespace-nowrap"
            >
              추가
            </button>
          </div>

          {/* Holiday list */}
          {sorted.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-3">
              등록된 공휴일이 없어요
            </p>
          ) : (
            <ul className="space-y-1.5">
              {sorted.map(h => (
                <li
                  key={h.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-pink-50 rounded-xl"
                >
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-red-400 mr-2">{h.date}</span>
                    {h.name}
                  </span>
                  <button
                    onClick={() => deleteHoliday(h.id)}
                    className="text-gray-300 hover:text-red-400 transition text-xl leading-none ml-2"
                    title="삭제"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
