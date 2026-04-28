export type UserId = 'snail' | 'rock';
export type Status = 'lunch_solo' | 'vacation' | 'pass';

export interface Schedule {
  id: string;
  user_id: UserId;
  date: string;
  status: Status;
}

export interface CustomHoliday {
  id: string;
  date: string;
  name: string;
}

export interface Holiday {
  date: string;
  name: string;
}
