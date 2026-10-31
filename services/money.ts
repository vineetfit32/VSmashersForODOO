export function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCents(value: number): number {
  return value / 100;
}

export function roundMoney(value: number): number {
  return fromCents(cents(value));
}

export function moneyString(value: number): string {
  return roundMoney(value).toFixed(2);
}
