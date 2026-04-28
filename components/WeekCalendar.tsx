'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KOREAN_HOLIDAYS } from '@/lib/holidays';
import type { Schedule, CustomHoliday, UserId, Status } from '@/lib/types';

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
const STATUS_CYCLE: (Status | null)[] = ['lunch_solo', 'vacation', null];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMon + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function WeekCalendar({
  currentUser,
  customHolidays,
}: {
  currentUser: UserId;
  customHolidays: CustomHoliday[];
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const weekDates = getWeekDates(weekOffset);
  const startDate = toDateStr(weekDates[0]);
  const endDate = toDateStr(weekDates[6]);

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    if (data) setSchedules(data as Schedule[]);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSchedules();
    const channel = supabase
      .channel(`week-${startDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        fetchSchedules
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSchedules, startDate]);

  const getStatus = (uid: UserId, date: string): Status | null =>
    schedules.find(s => s.user_id === uid && s.date === date)?.status ?? null;

  const toggleStatus = async (date: string) => {
    const current = getStatus(currentUser, date);
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

    if (next === null) {
      await supabase.from('schedules').delete().match({ user_id: currentUser, date });
    } else {
      await supabase.from('schedules').upsert(
        { user_id: currentUser, date, status: next },
        { onConflict: 'user_id,date' }
      );
    }
    fetchSchedules();
  };

  const getHoliday = (dateStr: string) =>
    KOREAN_HOLIDAYS.find(h => h.date === dateStr) ??
    customHolidays.find(h => h.date === dateStr) ??
    null;

  const todayStr = toDateStr(new Date());

  const firstDay = weekDates[0];
  const lastDay = weekDates[6];
  const monthLabel =
    firstDay.getMonth() === lastDay.getMonth()
      ? `${firstDay.getFullYear()}년 ${firstDay.getMonth() + 1}월`
      : `${firstDay.getFullYear()}년 ${firstDay.getMonth() + 1}월 – ${lastDay.getMonth() + 1}월`;

  const statusEmoji = (s: Status | null) =>
    s === 'lunch_solo' ? '🍱' : s === 'vacation' ? '🏖️' : null;

  const statusLabel = (s: Status | null) =>
    s === 'lunch_solo' ? '따로' : s === 'vacation' ? '휴가' : null;

  return (
    <div className="w-full">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-pink-100 hover:bg-pink-100 transition flex items-center justify-center text-pink-600 text-xl font-bold"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-base font-bold text-pink-800">{monthLabel}</div>
          <div className="text-xs text-pink-400 mt-0.5">
            {firstDay.getDate()}일 – {lastDay.getDate()}일
          </div>
        </div>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-pink-100 hover:bg-pink-100 transition flex items-center justify-center text-pink-600 text-xl font-bold"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const holiday = getHoliday(dateStr);
          const isToday = dateStr === todayStr;
          const isWeekend = i >= 5;
          const snailStatus = getStatus('snail', dateStr);
          const rockStatus = getStatus('rock', dateStr);

          return (
            <div
              key={dateStr}
              className={[
                'rounded-2xl pt-2 pb-2.5 px-1 flex flex-col items-center gap-1 shadow-sm border transition',
                holiday
                  ? 'bg-red-50 border-red-200'
                  : isWeekend
                  ? 'bg-rose-50/50 border-rose-100'
                  : 'bg-white border-pink-100',
                isToday ? 'ring-2 ring-pink-400 ring-offset-1' : '',
              ].join(' ')}
            >
              {/* Day name */}
              <span
                className={`text-xs font-semibold ${
                  isWeekend ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {DAY_NAMES[i]}
              </span>

              {/* Date number */}
              <span
                className={`text-sm font-bold leading-none ${
                  isToday ? 'text-pink-600' : 'text-gray-700'
                }`}
              >
                {date.getDate()}
              </span>

              {/* Holiday name */}
              {holiday ? (
                <span
                  className="text-[9px] leading-tight text-red-500 text-center w-full px-0.5 truncate"
                  title={holiday.name}
                >
                  {holiday.name}
                </span>
              ) : (
                <span className="text-[9px] leading-tight opacity-0 select-none">·</span>
              )}

              {/* Divider */}
              <div className="w-full h-px bg-pink-100 my-0.5" />

              {/* 🐚 snail row */}
              <button
                onClick={() => currentUser === 'snail' && toggleStatus(dateStr)}
                className={[
                  'w-full flex flex-col items-center rounded-xl py-1 transition-colors',
                  currentUser === 'snail'
                    ? 'hover:bg-pink-100 active:bg-pink-200 cursor-pointer ring-1 ring-pink-200'
                    : 'cursor-default opacity-80',
                ].join(' ')}
                title={currentUser === 'snail' ? '클릭해서 변경' : undefined}
              >
                <span className="text-base leading-none">
                  {statusEmoji(snailStatus) ?? '🐚'}
                </span>
                <span className={`text-[9px] mt-0.5 ${snailStatus ? 'text-pink-500 font-medium' : 'text-transparent select-none'}`}>
                  {statusLabel(snailStatus) ?? '·'}
                </span>
              </button>

              {/* 🪨 rock row */}
              <button
                onClick={() => currentUser === 'rock' && toggleStatus(dateStr)}
                className={[
                  'w-full flex flex-col items-center rounded-xl py-1 transition-colors',
                  currentUser === 'rock'
                    ? 'hover:bg-pink-100 active:bg-pink-200 cursor-pointer ring-1 ring-pink-200'
                    : 'cursor-default opacity-80',
                ].join(' ')}
                title={currentUser === 'rock' ? '클릭해서 변경' : undefined}
              >
                <span className="text-base leading-none">
                  {statusEmoji(rockStatus) ?? '🪨'}
                </span>
                <span className={`text-[9px] mt-0.5 ${rockStatus ? 'text-pink-500 font-medium' : 'text-transparent select-none'}`}>
                  {statusLabel(rockStatus) ?? '·'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center mt-5 text-sm text-gray-400">
        <span>🍱 점심따로</span>
        <span>🏖️ 휴가</span>
      </div>
    </div>
  );
}
