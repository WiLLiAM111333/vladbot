import { Constants } from './constants'

const { Environments } = Constants;

export class Util {
  private constructor() {
    // seriously why is this not built in to TypeScript yet
    throw new ReferenceError('Can not instantiate static class Util');
  }

  public static isProduction() {
    return process.env.NODE_ENV === Environments.PRODUCTION;
  }

  public static getCombinedStringArrayLength(arr: Array<string>): number {
    return arr.reduce((totalLength, str) => totalLength += str.length, 0);
  }
}
