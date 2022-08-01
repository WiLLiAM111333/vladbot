export class Util {
  private constructor() {
    // seriously why is this not built in to TypeScript yet
    throw new ReferenceError('Can not instantiate static class Util');
  }

  public static arrayToMarkdown(arr: Array<unknown>): string {
    const lines = `+${'-'.repeat(arr.length * 6)}+`;
    return `${lines}\n|  ${arr.join('  |  ')}  |\n${lines}`
  }

  public static getCombinedStringArrayLength(arr: Array<string>): number {
    return arr.reduce((totalLength, str) => totalLength += str.length, 0);
  }
}
