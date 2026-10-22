/**
 * High-precision integer-minor-unit Money arithmetic utility.
 * Kept in a separate non-'use server' file to comply with Next.js 15 App Router requirements.
 */
export class Money {
  private readonly minorUnits: number;

  private constructor(minorUnits: number) {
    this.minorUnits = Math.round(minorUnits);
  }

  static fromMajor(majorString: string | number): Money {
    const val = typeof majorString === 'string' ? parseFloat(majorString) : majorString;
    return new Money(Math.round(val * 100));
  }

  static fromMinor(minorUnits: number): Money {
    return new Money(minorUnits);
  }

  add(other: Money): Money {
    return new Money(this.minorUnits + other.minorUnits);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.minorUnits * factor));
  }

  toMajorString(): string {
    return (this.minorUnits / 100).toFixed(2);
  }
}
