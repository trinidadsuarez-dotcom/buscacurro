export interface TrustedJobFeed {
  name: string;
  url: string;
}

export const TRUSTED_JOB_HOSTS = new Set([
  'jobicy.com',
  'www.jobicy.com',
  'remoteok.com',
  'www.remoteok.com',
  'remotive.com',
  'www.remotive.com',
  'weworkremotely.com',
  'www.weworkremotely.com',
]);

// Public feeds documented by each provider. Keep attribution and original URLs.
export const TRUSTED_JOB_FEEDS: TrustedJobFeed[] = [
  {
    name: 'We Work Remotely · Marketing',
    url: 'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss',
  },
  {
    name: 'We Work Remotely · Diseño',
    url: 'https://weworkremotely.com/categories/remote-design-jobs.rss',
  },
  {
    name: 'Jobicy · Copywriting',
    url: 'https://jobicy.com/jobs/feed?industry=copywriting',
  },
  {
    name: 'Jobicy · Marketing digital',
    url: 'https://jobicy.com/jobs/feed?industry=marketing',
  },
  {
    name: 'Jobicy · SEO',
    url: 'https://jobicy.com/jobs/feed?industry=seo',
  },
  {
    name: 'Jobicy · Social media',
    url: 'https://jobicy.com/jobs/feed?industry=smm',
  },
  {
    name: 'Jobicy · Vídeo y audio',
    url: 'https://jobicy.com/jobs/feed?industry=video-audio-production',
  },
  {
    name: 'Jobicy · Diseño y animación',
    url: 'https://jobicy.com/jobs/feed?industry=design-multimedia&tag=animation',
  },
  {
    name: 'Remote OK · Creatividad digital',
    url: 'https://remoteok.com/remote-jobs.rss?tags=marketing,copywriting,social-media,video,animation',
  },
];

export const REMOTIVE_API_URL =
  'https://remotive.com/api/remote-jobs?search=marketing';
