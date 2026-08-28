// Matches backend/agreements/services.py's to_epoch_day() — both sides
// of an on-time comparison (recordPayment's dueDate/paymentDate
// witnesses) need the same day-number encoding.
export function toEpochDay(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 86_400_000);
}

export function todayEpochDay(): number {
  return Math.floor(Date.now() / 86_400_000);
}
