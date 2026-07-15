export function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const targetTitleKeywords = [
  'marketing', 'growth', 'seo', 'sem', 'paid media', 'media buyer', 'trafficker',
  'copywriter', 'copywriting', 'content writer', 'content creator', 'content strategist',
  'redactor', 'redaccion', 'social media', 'community manager',
  'video editor', 'editor de video', 'videographer', 'filmmaker', 'audiovisual',
  'animador', 'animacion', 'animator', 'animation', 'motion designer', 'motion graphics',
  '2d artist', '3d artist', 'character artist', 'storyboard', 'vfx', 'postproduction',
  'postproduccion', 'creative producer', 'productor audiovisual',
];

export function isTargetJobTitle(title: string): boolean {
  const cleanTitle = normalizeSearchText(title);
  return targetTitleKeywords.some(keyword => cleanTitle.includes(keyword));
}
