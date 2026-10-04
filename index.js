import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";
import "dotenv/config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const pick = items => items[Math.floor(Math.random() * items.length)];

const gifFiles = folder =>
  fs.readdirSync(folder)
    .filter(name => name.toLowerCase().endsWith(".gif"))
    .map(name => path.join(folder, name));

const genericTomatoes = gifFiles("./assets/tomato/generic");
const genericPats = gifFiles("./assets/pat/generic");

const noctisTomatoes = gifFiles("./assets/tomato/noctis");
const noctisPats = gifFiles("./assets/pat/noctis");

const giantTomato = noctisTomatoes.find(file =>
  file.endsWith("15-giant-tomato-rare.gif")
);

const regularNoctisTomatoes = noctisTomatoes.filter(file =>
  !file.endsWith("15-giant-tomato-rare.gif")
);

const dontStopPat = noctisPats.find(file =>
  file.endsWith("09-dont-stop-rare.gif")
);

const regularNoctisPats = noctisPats.filter(file =>
  !file.endsWith("09-dont-stop-rare.gif")
);

function pickNoctisTomato() {
  if (giantTomato && Math.random() < 0.01) return giantTomato;
  return pick(regularNoctisTomatoes);
}

function pickNoctisPat() {
  if (dontStopPat && Math.random() < 0.01) return dontStopPat;
  return pick(regularNoctisPats);
}

const tomatoPhrases = [
  (thrower, target) => `${thrower} threw a tomato at ${target}! 🍅`,
  (thrower, target) => `${thrower} launched a tomato at ${target}! 🍅`,
  (thrower, target) => `${thrower} absolutely tomatoed ${target}! 🍅`,
  (thrower, target) => `${target} has been tomato'd by ${thrower}! 🍅`,
  (thrower, target) => `${thrower} sent a tomato flying at ${target}! 🍅`,
  (thrower, target) => `${target} never saw that tomato coming. 🍅`,
  (thrower, target) => `${thrower} has chosen produce-based violence against ${target}. 🍅`,
  (thrower, target) => `Direct hit! ${thrower} nailed ${target} with a tomato. 🍅`
];

const noctisTomatoPhrases = [
  (thrower, target) => `${thrower} threw a tomato at ${target}! Poor Noctis! 🍅🐺`,
  (thrower, target) => `${thrower} tomatoed ${target}. Rude! 🍅🐺`,
  (thrower, target) => `${target} has been hit by a tomato courtesy of ${thrower}! 🍅`,
  (thrower, target) => `${thrower} chose violence. ${target} chose being adorable anyway. 🍅🐺`,
  (thrower, target) => `${thrower} launched a tomato at ${target}! Awww, not Noctis! 🍅🐺`,
  (thrower, target) => `Incoming! ${target} has been tomatoed by ${thrower}! 🍅`,
  (thrower, target) => `Not the wolf! ${thrower} nailed ${target} with a tomato. 🍅🐺`,
  (thrower, target) => `${target} just took a tomato to the face courtesy of ${thrower}. 🍅`,
  (thrower, target) => `Someone protect ${target} from ${thrower} and their produce! 🍅🐺`,
  (thrower, target) => `${thrower} has committed crimes against ${target} and tomatoes everywhere. 🍅`
];

const patPhrases = [
  (giver, target) => `${giver} gave ${target} a pat! 🐾`,
  (giver, target) => `${giver} gave ${target} some well-earned pats! 🐾`,
  (giver, target) => `${giver} gently patted ${target}. 🐾`,
  (giver, target) => `${target} received some premium head pats from ${giver}! 🐾`,
  (giver, target) => `${giver} delivered emergency pats to ${target}. 🐾`,
  (giver, target) => `${target} has been officially patted by ${giver}. 🐾`,
  (giver, target) => `${giver} gave ${target} the good pats! 🐾`,
  (giver, target) => `Pat received. ${target} appears pleased. 🐾`
];

const noctisPatPhrases = [
  (giver, target) => `${giver} petted ${target}, awww! 🐾💜`,
  (giver, target) => `${giver} gave ${target} the good pats! 🐾💜`,
  (giver, target) => `${target} got head pats from ${giver}! Awww! 🐺💜`,
  (giver, target) => `${giver} found ${target}'s pat button. 🐾🐺`,
  (giver, target) => `${target} has been successfully patted by ${giver}. 💜`,
  (giver, target) => `${giver} gave ${target} some much-needed affection. Awww! 🐾`,
  (giver, target) => `The wolf has been patted. ${giver} is responsible. 🐺💜`,
  (giver, target) => `${giver} deployed emergency head pats to ${target}. 🐾`
];

async function isNoctis(interaction, target) {
  let member = null;

  try {
    member = await interaction.guild.members.fetch(target.id);
  } catch {}

  const names = [
    target.username,
    target.globalName,
    member?.displayName
  ]
    .filter(Boolean)
    .map(name => name.trim().toLowerCase());

  return names.includes("noctis");
}

client.once("ready", () => {
  console.log(`Discord Tomato Throw online as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = interaction.options.getUser("target");
  if (!target) return;

  const targetIsNoctis = await isNoctis(interaction, target);

  if (interaction.commandName === "tomato") {
    const gif = targetIsNoctis
      ? pickNoctisTomato()
      : pick(genericTomatoes);

    const phrase = targetIsNoctis
      ? pick(noctisTomatoPhrases)
      : pick(tomatoPhrases);

    await interaction.reply({
      content: phrase(interaction.user, target),
      files: [gif]
    });
  }

  if (interaction.commandName === "pat") {
    const gif = targetIsNoctis
      ? pickNoctisPat()
      : pick(genericPats);

    const phrase = targetIsNoctis
      ? pick(noctisPatPhrases)
      : pick(patPhrases);

    await interaction.reply({
      content: phrase(interaction.user, target),
      files: [gif]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
