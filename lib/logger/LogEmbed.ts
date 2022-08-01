import { ColorResolvable, EmbedBuilder, EmbedData, APIEmbed } from 'discord.js';

/**
 * Handles the colorization of the embeds being sent out of the class `ModerationLogger`
 */
export class LogEmbed extends EmbedBuilder {
  /**
   * @param {ModerationLoggerLevel} level
   * @param {EmbedData | APIEmbed} [data={}]
   */
  constructor(level: ModerationLoggerLevel, data?: EmbedData | APIEmbed) {
    super(data);

    this.setColor(this.getColor(level));
    this.setTimestamp(new Date())
  }

  /**
   * Returns the color of the given level
   * @param {ModerationLoggerLevel} level
   * @returns {ColorResolvable}
   */
  private getColor(level: ModerationLoggerLevel): ColorResolvable {
    const colors: Array<ColorResolvable> = [
      '#00a35a',
      '#ffce5c',
      '#ff0000',
      '#00af9c'
    ];

    return colors[level];
  }
}
