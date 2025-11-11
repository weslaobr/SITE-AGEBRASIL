export interface Tournament {
  id: number;
  name: string;
  organizer: string;
  game: string;
  format: string;
  prize: string;
  participants: number;
  registered?: number;
  winner?: string;
  runner_up?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'upcoming' | 'completed';
  bracket_url?: string;
  registration_url?: string;
  discord_url?: string;
  stream_url?: string;
  vod_url?: string;
  rules_url?: string;
  highlights_url?: string;
  thumbnail?: string;
}

export interface TournamentsData {
  active: Tournament[];
  upcoming: Tournament[];
  completed: Tournament[];
}