#!/usr/bin/env node

import { Command } from "commander";
import { registerInit } from "./init.js";
import { registerRun } from "./run.js";
import { registerShow } from "./show.js";

const program = new Command();

program
  .name("agentcontract")
  .description("Executable spec for AI agent behavior contracts")
  .version("0.1.0");

registerInit(program);
registerRun(program);
registerShow(program);

program.parse();
