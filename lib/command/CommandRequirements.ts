import { PermissionsString } from "discord.js";

export interface CommandRequirements {
  userPerms?: Array<PermissionsString>;
  clientPerms?: Array<PermissionsString>;
}
