import {
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("tomato")
    .setDescription("Throw a tomato at someone")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Who gets the tomato?")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("pat")
    .setDescription("Give someone a pat")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Who gets the pat?")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("tomato-tally")
    .setDescription(
      "See this server's glorious tomato statistics"
    ),

  new SlashCommandBuilder()
    .setName("whoseagoodfloof")
    .setDescription(
      "Find out who's been giving and receiving all the pats"
    )
].map(command => command.toJSON());

const rest = new REST({
  version: "10"
}).setToken(process.env.DISCORD_TOKEN);

try {
  console.log(
    "Registering global Discord commands..."
  );

  await rest.put(
    Routes.applicationCommands(
      process.env.CLIENT_ID
    ),
    {
      body: commands
    }
  );

  console.log(
    "Registered /tomato, /pat, /tomato-tally, and /whoseagoodfloof globally."
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}