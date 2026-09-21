export type PageId =
  | "home"
  | "search"
  | "movies"
  | "bollywood"
  | "free"
  | "upcoming"
  | "tv"
  | "actors"
  | "watchlist"
  | "favorites"
  | "tracker"
  | "calendar"
  | "timeline"
  | "profile"
  | "settings";

export type ThemePref = "dark" | "light" | "oled";
export type LangPref = "en" | "hi";
export type Priority = "low" | "medium" | "high";
export type ProviderStatus = "free" | "ads" | "subscription" | "rent" | "buy";
export type AccentId = "crimson" | "teal" | "sky" | "amber" | "rose";

export interface ActorRef {
  id?: number;
  name: string;
  character?: string;
  photo?: string;
}

export interface Platform {
  name: string;
  status: ProviderStatus | string;
  url?: string;
  logo?: string;
}

export interface Movie {
  id: string;
  tmdbId?: number;
  title: string;
  originalTitle?: string;
  poster: string;
  backdrop?: string;
  releaseDate?: string;
  year?: number | null;
  runtime?: number;
  genres: string[];
  language?: string;
  rating?: number;
  voteCount?: number;
  director?: string;
  writers?: string[];
  actors: ActorRef[];
  description?: string;
  tagline?: string;
  platforms: Platform[];
  isFree?: boolean;
  popularity?: number;
  trailerUrl?: string;
  trailerKey?: string;
  imdbId?: string;
  mediaType?: "movie" | "tv";
}

export interface LibEntry {
  id: string;
  tmdbId?: number | string;
  title?: string;
  poster?: string;
  year?: number | null;
  voteAvg?: number;
  inWatchlist?: boolean;
  watched?: boolean;
  watchedDate?: string | null;
  favorite?: boolean;
  myRating?: number;
  notes?: string;
  addedAt?: number;
  updatedAt?: number;
  priority?: Priority;
  category?: string;
  rewatchCount?: number;
  runtime?: number;
  genres?: string[];
  director?: string;
  sortOrder?: number;
}

export interface TrackerItem {
  id: string;
  name: string;
  watched: boolean;
  favorite: boolean;
  addedAt: number;
  rating?: number;
  notes?: string;
  watchedDate?: string;
  rewatchCount?: number;
  runtime?: number;
  genres?: string[];
  tmdbId?: number;
  poster?: string;
}

export interface TvProgram {
  channel: string;
  movieTitle: string;
  start: string;
  end?: string;
  logo?: string;
  url?: string;
  scheduleUrl?: string;
}

export interface PersonResult {
  id: number;
  name: string;
  photo?: string;
  knownFor?: string;
  biography?: string;
  birthday?: string;
  placeOfBirth?: string;
}

export interface Settings {
  theme: ThemePref;
  accent: AccentId;
  lang: LangPref;
  landingPage: PageId;
  defaultSort: string;
  preferredGenres: string[];
  preferredLanguage: string;
  preferredPlatforms: string[];
  sidebarCollapsed: boolean;
  apiKey: string;
  tvUrl: string;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  createdAt: number;
}

export interface BackupV3 {
  version: number;
  exportedAt: string;
  library: LibEntry[];
  tracker: TrackerItem[];
  searchHistory: string[];
  recentViewed: Movie[];
  settings?: Partial<Settings>;
  reminders?: Reminder[];
  categories?: string[];
  favActors?: string[];
  manualTv?: TvProgram[] | null;
}

export const STORAGE_KEYS = {
  library: "cmtu_library_v1",
  tracker: "movieTrackerData_v1",
  tmdbKey: "cv_tmdb_key",
  tvUrl: "cv_tv_url",
  manualTv: "cv_manual_tv",
  theme: "cmtu_theme",
  searchHist: "cmtu_search_hist",
  recentView: "cmtu_recent_view",
  liveMovies: "cv_live_movies",
  settings: "cmtu_settings_v2",
  reminders: "cmtu_reminders_v1",
  categories: "cmtu_categories_v1",
  favActors: "cmtu_fav_actors_v1",
  trackerToday: "cmtu_tracker_today_v1",
} as const;

export const ACCENT_HEX: Record<AccentId, string> = {
  crimson: "#e50914",
  teal: "#14b8a6",
  sky: "#38bdf8",
  amber: "#d97706",
  rose: "#e11d48",
};

export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Musical",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const OTT_PLATFORMS = [
  "Netflix",
  "Prime Video",
  "JioHotstar",
  "ZEE5",
  "SonyLIV",
  "YouTube",
] as const;
