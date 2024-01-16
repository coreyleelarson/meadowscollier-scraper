export interface Article {
  content?: string;
  date?: string;
  summary?: string;
  title?: string;
  url?: string;
  redirectedUrl?: string;
  [key: `author${number}`]: string;
  [key: `relatedAttorney${number}`]: string;
}
