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
    .setName("tomatotally")
    .setDescription(
      "See this server's glorious tomato statistics"
    ),

  new SlashCommandBuilder()
    .setName("whosagoodfloof")
    .setDescription(
      "See this server's glorious floof statistics"
    ),

  new SlashCommandBuilder()
    .setName("checkfloof")
    .setDescription(
      "Check someone's personal floof stats"
    )
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Whose floof stats?")
        .setRequired(true)
    )
].map(command =>
  command.toJSON()
);

const rest =
  new REST({
    version: "10"
  }).setToken(
    process.env.DISCORD_TOKEN
  );

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
    "Registered /tomato, /pat, /tomatotally, /whosagoodfloof, and /checkfloof globally."
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}