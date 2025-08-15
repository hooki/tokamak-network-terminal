/**
 * Safely format a timestamp to ISO string
 * @param timestamp - The timestamp to format (can be bigint, number, or string)
 * @returns ISO string if timestamp is valid (> 0), otherwise "Not set"
 */
export function formatTimestamp(timestamp: bigint | number | string): string {
  const numTimestamp = Number(timestamp);
  return numTimestamp > 0
    ? new Date(numTimestamp * 1000).toISOString()
    : 'Not set';
}

/**
 * Convert timestamp to human readable date
 * @param timestamp - The timestamp to convert
 * @returns Human readable date string or "Not set"
 */
export function formatTimestampToDate(
  timestamp: bigint | number | string
): string {
  const numTimestamp = Number(timestamp);
  if (numTimestamp <= 0) return 'Not set';

  const date = new Date(numTimestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}
