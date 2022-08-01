export class DiscordFormatter {
  private constructor() {
    // seriously why is this not built in to TypeScript yet
    throw new ReferenceError('Can not instantiate static class DiscordFormatter');
  }

  public static bold(str: string | number): string {
    return `**${str}**`;
  }

  public static cursive(str: string | number): string {
    return `*${str}*`;
  }

  public static cursiveBold(str: string | number): string {
    return `***${str}***`;
  }

  public static underline(str: string | number): string {
    return `__${str}__`;
  }

  public static strikeThrough(str: string | number): string {
    return `~~${str}~~`;
  }

  public static inlineCodeBlock(str: string | number): string {
    return `\`${str}\``;
  }

  public static codeBlock(str: string | number, lang?: string): string {
    return `\`\`\`${lang}\n${str}\n\`\`\``;
  }

  public static blockQuote(str: string | number): string {
    return `> ${str}`;
  }

  public static multiLineBlockQuote(str: string | number): string {
    return `>>> ${str}`;
  }

  public static spoiler(str: string | number): string {
    return `||${str}||`;
  }

  /**
   * ONLY WORKS ON MESSAGEEMBED
   */
  public static link(name: string, link: string): string {
    return `[${name}](${link})`
  }
}
