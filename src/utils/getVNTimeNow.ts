export function getVNTimeNow() {
  const now = new Date();
  // +7 tiếng (giờ Việt Nam)
  now.setHours(now.getHours() + 7);
  return now;
}