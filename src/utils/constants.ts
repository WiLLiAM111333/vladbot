export namespace Constants {
  export enum Environments {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production'
  }

  export const discordSupportedMedias = [
    'jpg',
    'jpeg',
    'png',
    'mp4',
    'mp3',
    'webp',
    'mov',
    "webm"
  ]

  export const ANSII_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

  export enum EmbedColors {
    RED = '#ff0000',
    GREEN = '#00d111'
  }
}
