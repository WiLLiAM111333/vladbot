import { CommandHelp } from "./CommandHelp";
import { CommandRequirements } from "./CommandRequirements";

export interface CommandConstructor extends CommandHelp, CommandRequirements {}
