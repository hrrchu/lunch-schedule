'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import WeekCalendar from '@/components/WeekCalendar';
import HolidayManager from '@/components/HolidayManager';
import type { UserId, CustomHoliday } from '@/lib/types';

const USERS: { id: UserId; emoji: string }[] = [
  { id: 'snail', emoji: '🐚' },
  { id: 'rock', emoji: '🪨' },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserId | null>(null);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('lunch-user') as UserId | null;
    if (saved === 'snail' || saved === 'rock') {
      setCurrentUser(saved);
    }
  }, []);

  const selectUser = (uid: UserId) => {
    setCurrentUser(uid);
    localStorage.setItem('lunch-user', uid);
  };

  const fetchHolidays = useCallback(async () => {
    const { data } = await supabase.from('custom_holidays').select('*');
    if (data) setCustomHolidays(data as CustomHoliday[]);
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return (
    <main className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-pink-800">점심 체크 🍱</h1>
          <p className="text-sm text-pink-400 mt-1">점심 약속 & 휴가 공유</p>
        </div>

        {/* User selector */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-sky-500 font-medium">나는?</span>
          {USERS.map(u => (
            <button
              key={u.id}
              onClick={() => selectUser(u.id)}
              className={[
                'w-12 h-12 rounded-xl text-3xl flex items-center justify-center shadow-sm border transition-all',
                currentUser === u.id
                  ? 'bg-sky-400 border-sky-300 shadow-sky-100 shadow-md scale-110'
                  : 'bg-white border-sky-100 hover:bg-sky-50 hover:scale-105',
              ].join(' ')}
            >
              {u.emoji}
            </button>
          ))}
        </div>

        {currentUser ? (
          <>
            <WeekCalendar currentUser={currentUser} customHolidays={customHolidays} />
            <HolidayManager holidays={customHolidays} onChange={fetchHolidays} />
          </>
        ) : (
          <div className="text-center text-pink-300 mt-16 text-sm">
            위에서 나를 선택해 주세요 👆
          </div>
        )}
      </div>
    </main>
  );
}
