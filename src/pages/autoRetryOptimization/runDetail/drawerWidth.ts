export const RUN_RECORD_DRAWER_MIN_WIDTH = 520;
export const RUN_RECORD_DRAWER_LEFT_GAP = 120;
export const RUN_RECORD_DRAWER_STORAGE_KEY = 'runDetailStorageLogDrawerWidth';

export function clampRunRecordDrawerWidth(width: number, viewportWidth: number) {
  const availableWidth = Math.max(0, viewportWidth - RUN_RECORD_DRAWER_LEFT_GAP);
  if (availableWidth < RUN_RECORD_DRAWER_MIN_WIDTH) {
    return availableWidth;
  }
  return Math.min(Math.max(width, RUN_RECORD_DRAWER_MIN_WIDTH), availableWidth);
}
