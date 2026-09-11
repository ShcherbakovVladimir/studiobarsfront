export type UsageTone = 'low' | 'medium' | 'high';

export function getUsageTone(percent: number): UsageTone {
  if (percent < 30) return 'low';
  if (percent < 70) return 'medium';
  return 'high';
}

export function usageTextClass(tone: UsageTone): string {
  if (tone === 'low') return 'text-green-600 dark:text-green-400';
  if (tone === 'medium') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function usageBgClass(tone: UsageTone): string {
  if (tone === 'low') return 'bg-green-100 dark:bg-green-900/20';
  if (tone === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/20';
  return 'bg-red-100 dark:bg-red-900/20';
}
