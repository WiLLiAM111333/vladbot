import { BytePowers } from "./BytePowers";

export class ByteConverter {
  private constructor() {
    throw new ReferenceError();
  }

  private static convertBytesDown(bytes: number, to: keyof typeof BytePowers): number {
    return bytes / BytePowers[to];
  }

  private static isBetween(operand: number, x: number, y: number) {
    return operand > x && operand < y;
  }

  public static convertBytes(bytes: number): string {
    if(this.isBetween(bytes, BytePowers.KILOBYTES, BytePowers.MEGABYTES)) {
      return `${this.convertBytesDown(bytes, 'KILOBYTES').toFixed(3)}kb`;
    }

    if(this.isBetween(bytes, BytePowers.MEGABYTES, BytePowers.GIGABYTES)) {
      return `${this.convertBytesDown(bytes, 'MEGABYTES').toFixed(3)}mb`;
    }

    return `${this.convertBytesDown(bytes, 'GIGABYTES').toFixed(5)}gb`;
  }
}
