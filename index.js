import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";
import "dotenv/config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function isNoctis(user, member) {
  const names = [
    user?.username,
    user?.globalName,
    member?.displayName
  ]
    .filter(Boolean)
    .map(name => name.trim().toLowerCase());

  return names.includes("noctis");
}

function randomExistingFile(paths) {
  const existing = paths.filter(path => fs.existsSync(path));
  if (existing.length === 0) return null;
  return existing[Math.floor(Math.random() * existing.length)];
}

const noctisTomatoes = [
  "./assets/noctis/tomato-reaction.gif",
  "./assets/noctis/tomato-return-fire.gif"
];

client.once("ready", () => {
  console.log(`Discord Tomato Throw online as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "tomato") {
    const target = interaction.options.getUser("target", true);
    const member = interaction.options.getMember("target");

    let gif = "./assets/tomato.gif";

    if (isNoctis(target, member)) {
      gif = randomExistingFile(noctisTomatoes) ?? gif;
    }

    await interaction.reply({
      content: `${interaction.user} threw a tomato at ${target} 🍅`,
      files: [gif]
    });
    return;
  }

  if (interaction.commandName === "pat") {
    const target = interaction.options.getUser("target", true);
    const member = interaction.options.getMember("target");
    const noctis = isNoctis(target, member);

    const gif = noctis
      ? "./assets/noctis/pat.gif"
      : "./assets/pat.gif";

    const content = noctis
      ? `${interaction.user} petted ${target}, awww! 🐾`
      : `${interaction.user} gave ${target} a pat 🐾`;

    await interaction.reply({
      content,
      files: [gif]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
