export interface CommandHelp {
  name: string;
  category: string;
  description?: string;
  aliases?: Array<string>;
  cooldown?: number;
  args: Array<[string, string]>;
}
