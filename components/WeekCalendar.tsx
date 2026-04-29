'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { KOREAN_HOLIDAYS } from '@/lib/holidays';
import type { Schedule, CustomHoliday, UserId, Status } from '@/lib/types';

const DAY_NAMES = ['월', '화', '수', '목', '금'];
const STATUS_CYCLE: (Status | null)[] = ['together', 'lunch_solo', 'vacation', 'pass', null];

function getWeekdays(weekOffset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMon + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
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

const statusEmoji = (s: Status | null) =>
  s === 'lunch_solo' ? '🍔' : s === 'vacation' ? '🏖️' : s === 'pass' ? '❌' : s === 'together' ? '⚔️' : null;
const statusLabel = (s: Status | null) =>
  s === 'lunch_solo' ? '따로' : s === 'vacation' ? '휴가' : s === 'pass' ? 'pass' : s === 'together' ? '같이' : null;

export default function WeekCalendar({
  currentUser,
  customHolidays,
}: {
  currentUser: UserId;
  customHolidays: CustomHoliday[];
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [pageOffset, setPageOffset] = useState(0);
  const [memoEdits, setMemoEdits] = useState<Record<string, string>>({});

  const weeks = Array.from({ length: 5 }, (_, i) => getWeekdays(pageOffset * 5 + i));
  const startDate = toDateStr(weeks[0][0]);
  const endDate = toDateStr(weeks[4][4]);

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
      .channel('schedules-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, fetchSchedules)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSchedules]);

  const getSchedule = (uid: UserId, date: string) =>
    schedules.find(s => s.user_id === uid && s.date === date) ?? null;

  const toggleStatus = async (date: string) => {
    const current = getSchedule(currentUser, date)?.status ?? null;
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    if (next === null) {
      await supabase.from('schedules').delete().match({ user_id: currentUser, date });
    } else {
      const existing = getSchedule(currentUser, date);
      await supabase.from('schedules').upsert(
        { user_id: currentUser, date, status: next, memo: existing?.memo ?? null },
        { onConflict: 'user_id,date' }
      );
    }
    fetchSchedules();
  };

  const saveMemo = async (date: string, memo: string) => {
    const existing = getSchedule(currentUser, date);
    if (!existing) return;
    await supabase.from('schedules').update({ memo: memo || null }).match({ user_id: currentUser, date });
    fetchSchedules();
  };

  const memoKey = (uid: UserId, date: string) => `${uid}:${date}`;

  const getHoliday = (dateStr: string) =>
    KOREAN_HOLIDAYS.find(h => h.date === dateStr) ??
    customHolidays.find(h => h.date === dateStr) ??
    null;

  const todayStr = toDateStr(new Date());

  const rangeLabel = (() => {
    const first = weeks[0][0];
    const last = weeks[4][4];
    if (first.getMonth() === last.getMonth())
      return `${first.getFullYear()}년 ${first.getMonth() + 1}월`;
    return `${first.getMonth() + 1}월 – ${last.getMonth() + 1}월`;
  })();

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Page navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setPageOffset(p => p - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-600"
        >
          ‹ 이전
        </button>
        <span className="text-sm font-semibold text-gray-600">{rangeLabel}</span>
        <button
          onClick={() => setPageOffset(p => p + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-600"
        >
          다음 ›
        </button>
      </div>

      {weeks.map((days, wi) => {
        const firstDay = days[0];
        const monthLabel = `${firstDay.getMonth() + 1}월 ${Math.ceil(firstDay.getDate() / 7)}주`;

        return (
          <div key={wi} className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
            <div className="px-4 py-2 bg-pink-50 border-b border-pink-100">
              <span className="text-xs font-semibold text-pink-500">{monthLabel}</span>
            </div>

            <div className="grid grid-cols-5">
              {days.map((date, di) => {
                const dateStr = toDateStr(date);
                const holiday = getHoliday(dateStr);
                const isToday = dateStr === todayStr;
                const snailSched = getSchedule('snail', dateStr);
                const rockSched = getSchedule('rock', dateStr);

                const renderUser = (uid: UserId, sched: Schedule | null) => {
                  const isMe = uid === currentUser;
                  const key = memoKey(uid, dateStr);
                  const localMemo = memoEdits[key];
                  const displayMemo = localMemo !== undefined ? localMemo : (sched?.memo ?? '');

                  return (
                    <div key={uid} className={`w-full flex flex-col items-center ${isMe ? 'mb-1' : ''}`}>
                      {/* Emoji button */}
                      <button
                        onClick={() => isMe && toggleStatus(dateStr)}
                        className={[
                          'w-full flex flex-col items-center rounded-lg py-1 transition-colors',
                          isMe ? 'hover:bg-pink-100 cursor-pointer ring-1 ring-pink-200' : 'cursor-default',
                        ].join(' ')}
                      >
                        <span className="text-3xl leading-none">
                          {statusEmoji(sched?.status ?? null) ?? (uid === 'snail' ? '🐚' : '🪨')}
                        </span>
                        <span className={`text-[9px] mt-0.5 ${sched?.status ? 'text-pink-500 font-medium' : 'text-transparent select-none'}`}>
                          {statusLabel(sched?.status ?? null) ?? '·'}
                        </span>
                      </button>

                      {/* Memo */}
                      {sched?.status && sched.status !== 'vacation' && (
                        isMe ? (
                          <input
                            type="text"
                            value={displayMemo}
                            placeholder="누구랑?"
                            maxLength={10}
                            onChange={e => setMemoEdits(prev => ({ ...prev, [key]: e.target.value }))}
                            onBlur={async () => {
                              await saveMemo(dateStr, displayMemo);
                              setMemoEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
                            }}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-center text-[10px] text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-1 py-0.5 mt-0.5 focus:outline-none focus:border-pink-300 placeholder:text-gray-400"
                          />
                        ) : (
                          <div className="h-5 flex items-center justify-center w-full mt-0.5">
                            {sched.memo && (
                              <span className="text-[10px] text-gray-600 truncate px-1" title={sched.memo}>
                                {sched.memo}
                              </span>
                            )}
                          </div>
                        )
                      )}
                      {(!sched?.status || sched.status === 'vacation') && <div className="h-5" />}
                    </div>
                  );
                };

                return (
                  <div
                    key={dateStr}
                    className={[
                      'flex flex-col items-center py-3 px-1 border-r last:border-r-0 border-pink-50',
                      holiday ? 'bg-red-50' : '',
                      isToday ? 'bg-pink-50' : '',
                    ].join(' ')}
                  >
                    <span className="text-xs font-semibold text-gray-400 mb-0.5">{DAY_NAMES[di]}</span>

                    <div className="h-7 flex items-center justify-center mb-0.5">
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold">
                          {date.getDate()}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-gray-700">{date.getDate()}</span>
                      )}
                    </div>

                    <div className="h-4 flex items-center justify-center w-full mb-1">
                      {holiday && (
                        <span className="text-[9px] text-red-400 text-center leading-tight w-full truncate px-0.5" title={holiday.name}>
                          {holiday.name}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-px bg-pink-50 my-1" />

                    {renderUser('snail', snailSched)}
                    {renderUser('rock', rockSched)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex gap-4 justify-center text-sm text-gray-400 flex-wrap">
        <span>⚔️ 같이</span>
        <span>🍔 따로</span>
        <span>🏖️ 휴가</span>
        <span>❌ pass</span>
      </div>
    </div>
  );
}
