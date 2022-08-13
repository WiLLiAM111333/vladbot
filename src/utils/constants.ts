export namespace Constants {
  export enum Environments {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production'
  }

  export const discordSupportedMedias = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'mov',
    "webm",
    "gif",
    "svg"
  ]

  export const ANSII_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g

  export enum EmbedColors {
    RED = '#ff0000',
    GREEN = '#00d111'
  }

  export const URL_REGEX = /https?:\/\/(\w+\.)*\w+((\/|\.)([\w\?\&=\-_%@:\+#\$'\*,;~]+))*/;
  export const HOST_REGEX = /([A-Za-z0-9\-\._~:]+(%[0-9a-f][a-f0-9])*)+@((\b((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:(?<!\.)\b|\.)){4})|localhost):?(\d+)?/
  export const PE_REGEX = /%[0-9a-f][a-f0-9]/ // Percent Encoding
  export const TENOR_REGEX = /https?:\/\/(www\.)?tenor\.com\/view\/(\w+-)+\d+/
  export const MEDIA_SUFFIX_REGEX = new RegExp(`(?!${URL_REGEX.source}\\.)(${discordSupportedMedias.join('|')})$`)
}
