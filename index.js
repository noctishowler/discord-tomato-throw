import { Client, GatewayIntentBits, Events } from "discord.js";
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
  if (giantTomato && Math.random() < 0.01) {
    return giantTomato;
  }

  return pick(regularNoctisTomatoes);
}

function pickNoctisPat() {
  if (dontStopPat && Math.random() < 0.01) {
    return dontStopPat;
  }

  return pick(regularNoctisPats);
}

function tomatoPhrase(gif, thrower, target, noctis) {
  const name = path.basename(gif);

  if (!noctis) {
    const phrases = {
      "tomato-lens-splat.gif":
        `Direct hit! ${thrower} nailed ${target} with a tomato.`,

      "tomato-camera-miss.gif":
        `${thrower} threw a tomato at ${target}... and completely missed.`
    };

    return phrases[name] ?? `${thrower} threw a tomato at ${target}.`;
  }

  const phrases = {
    "01-direct-hit.gif":
      `Direct hit! ${thrower} nailed ${target} square in the face.`,

    "02-dodge.gif":
      `${thrower} threw a tomato at ${target}, but Noctis dodged it!`,

    "03-bad-dodge.gif":
      `${target} tried to dodge ${thrower}'s tomato. Tried.`,

    "04-catch-and-eat.gif":
      `${target} caught ${thrower}'s tomato... and ate it.`,

    "05-return-fire.gif":
      `${thrower} threw a tomato at ${target}. Noctis returned fire!`,

    "07-barrage.gif":
      `${thrower} started a tomato barrage against ${target}!`,

    "08-cherry-tomato.gif":
      `${thrower} hit ${target} with a tiny cherry tomato.`,

    "09-incoming.gif":
      `INCOMING! ${thrower} sent a tomato flying at ${target}!`,

    "10-wrong-direction.gif":
      `${thrower} threw a tomato at ${target}... in completely the wrong direction.`,

    "11-angry.gif":
      `${thrower} tomatoed ${target}. Noctis is NOT amused.`,

    "12-awoo-interrupted.gif":
      `Awo-*splat*`,

    "13-victory-catch.gif":
      `${target} caught ${thrower}'s tomato like a champion!`,

    "14-shake-it-off.gif":
      `${target} got tomatoed by ${thrower}, then shook it off.`,

    "15-giant-tomato-rare.gif":
      `LOOK OUT GIANT TOMATO!!!`
  };

  return phrases[name] ?? `${thrower} threw a tomato at ${target}.`;
}

function patPhrase(gif, giver, target, noctis) {
  const name = path.basename(gif);

  if (!noctis) {
    const phrases = {
      "furry-pat.gif":
        `${giver} gave ${target} a pat!`,

      "furry-viewer-pat.gif":
        `${giver} reached in and gave ${target} a pat!`
    };

    return phrases[name] ?? `${giver} gave ${target} a pat!`;
  }

  const phrases = {
    "01-happy-pat.gif":
      `${giver} gave ${target} a pat. Happy wolf!`,

    "02-head-pat.gif":
      `${giver} gave ${target} some proper head pats!`,

    "03-rapid-pat.gif":
      `${giver} deployed rapid pats on ${target}!`,

    "04-shy-pat.gif":
      `${giver} gave ${target} a pat... now Noctis is all shy.`,

    "05-more-pats.gif":
      `${target} would like ${giver} to continue the pats, please.`,

    "06-the-spot.gif":
      `${giver} found THE SPOT on ${target}.`,

    "07-surprise-pat.gif":
      `${giver} surprised ${target} with a pat!`,

    "08-too-many-pats.gif":
      `${giver} may have given ${target} a few too many pats.`,

    "09-dont-stop-rare.gif":
      `DON'T STOP!`
  };

  return phrases[name] ?? `${giver} gave ${target} a pat!`;
}

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

client.once(Events.ClientReady, readyClient => {
  console.log(`Discord Tomato Throw online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = interaction.options.getUser("target");
  if (!target) return;

  const targetIsNoctis = await isNoctis(interaction, target);

  if (interaction.commandName === "tomato") {
    const gif = targetIsNoctis
      ? pickNoctisTomato()
      : pick(genericTomatoes);

    await interaction.reply({
      content: tomatoPhrase(
        gif,
        interaction.user,
        target,
        targetIsNoctis
      ),
      files: [gif]
    });

    return;
  }

  if (interaction.commandName === "pat") {
    const gif = targetIsNoctis
      ? pickNoctisPat()
      : pick(genericPats);

    await interaction.reply({
      content: patPhrase(
        gif,
        interaction.user,
        target,
        targetIsNoctis
      ),
      files: [gif]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);