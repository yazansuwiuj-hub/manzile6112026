import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const cleaned = timeStr.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr; // Return as-is if it doesn't match HH:MM
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  
  const period = hours >= 12 ? "مساءً" : "صباحاً";
  
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
}

export function formatTimeRangeTo12Hour(timeRangeStr: string): string {
  if (!timeRangeStr) return "";
  // Check if it contains a separator like ' - ' or ' إلى ' or ' to '
  const separatorMatch = timeRangeStr.match(/(\s*-\s*|\s*إلى\s*|\s*to\s*)/i);
  if (!separatorMatch) {
    return formatTimeTo12Hour(timeRangeStr);
  }
  const separator = separatorMatch[1];
  const parts = timeRangeStr.split(separator);
  if (parts.length >= 2) {
    const fromTime = formatTimeTo12Hour(parts[0]);
    const toTime = formatTimeTo12Hour(parts[1]);
    return `${fromTime} - ${toTime}`;
  }
  return timeRangeStr;
}
