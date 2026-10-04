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

/*
  Persistent tomato tally storage.

  Railway automatically provides RAILWAY_VOLUME_MOUNT_PATH
  when a persistent volume is attached.

  Fallbacks:
  1. Railway mounted volume
  2. DATA_DIR environment variable
  3. Local ./data folder
*/

const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  "./data";

const SCORE_FILE = path.join(DATA_DIR, "tomato-tally.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadScores() {
  try {
    if (!fs.existsSync(SCORE_FILE)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(SCORE_FILE, "utf8"));
  } catch (error) {
    console.error("Could not load tomato tally:", error);
    return {};
  }
}

let scores = loadScores();

function saveScores() {
  try {
    const tempFile = `${SCORE_FILE}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(scores, null, 2),
      "utf8"
    );

    fs.renameSync(tempFile, SCORE_FILE);
  } catch (error) {
    console.error("Could not save tomato tally:", error);
  }
}

function ensureUser(guildId, user) {
  if (!scores[guildId]) {
    scores[guildId] = {};
  }

  if (!scores[guildId][user.id]) {
    scores[guildId][user.id] = {
      name: user.globalName || user.username,
      timesHit: 0,
      timesMissed: 0,
      throwsHit: 0,
      throwsMissed: 0
    };
  }

  scores[guildId][user.id].name =
    user.globalName || user.username;

  return scores[guildId][user.id];
}

function recordTomatoResult(guildId, thrower, target, result) {
  const throwerStats = ensureUser(guildId, thrower);
  const targetStats = ensureUser(guildId, target);

  if (result === "hit") {
    throwerStats.throwsHit += 1;
    targetStats.timesHit += 1;
  } else {
    throwerStats.throwsMissed += 1;
    targetStats.timesMissed += 1;
  }

  saveScores();
}

function pickGenericTomato() {
  const hit = genericTomatoes.find(file =>
    file.endsWith("tomato-lens-splat.gif")
  );

  const miss = genericTomatoes.find(file =>
    file.endsWith("tomato-camera-miss.gif")
  );

  if (hit && miss) {
    return Math.random() < 0.8 ? hit : miss;
  }

  return hit ?? miss ?? pick(genericTomatoes);
}

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

function tomatoResult(gif, noctis) {
  const name = path.basename(gif);

  if (!noctis) {
    if (name === "tomato-lens-splat.gif") {
      return "hit";
    }

    if (name === "tomato-camera-miss.gif") {
      return "miss";
    }

    return "miss";
  }

  const hitAnimations = new Set([
    "01-direct-hit.gif",
    "03-bad-dodge.gif",
    "07-barrage.gif",
    "08-cherry-tomato.gif",
    "11-angry.gif",
    "12-awoo-interrupted.gif",
    "14-shake-it-off.gif",
    "15-giant-tomato-rare.gif"
  ]);

  const missAnimations = new Set([
    "02-dodge.gif",
    "04-catch-and-eat.gif",
    "05-return-fire.gif",
    "09-incoming.gif",
    "10-wrong-direction.gif",
    "13-victory-catch.gif"
  ]);

  if (hitAnimations.has(name)) {
    return "hit";
  }

  if (missAnimations.has(name)) {
    return "miss";
  }

  return "miss";
}

function tomatoPhrase(gif, thrower, target, noctis) {
  const name = path.basename(gif);

  if (!noctis) {
    const hitPhrases = [
      `Direct hit! ${thrower} nailed ${target} with a tomato.`,
      `${thrower} threw a tomato and hit ${target} square on.`,
      `${target} just took a tomato courtesy of ${thrower}.`,
      `${thrower} landed a perfect tomato hit on ${target}.`,
      `SPLAT! ${thrower} got ${target} with a tomato.`,
      `${thrower}'s tomato found its target: ${target}.`,
      `${target} never saw ${thrower}'s tomato coming.`,
      `Bullseye! ${thrower} hit ${target} with a tomato.`
    ];

    const missPhrases = [
      `${thrower} threw a tomato at ${target}... and completely missed.`,
      `${thrower} took a shot at ${target}, but the tomato sailed right past.`,
      `${target} dodged ${thrower}'s tomato!`,
      `${thrower} launched a tomato at ${target}. Close, but no splat.`,
      `WHIFF! ${thrower} missed ${target} with the tomato.`
    ];

    if (name === "tomato-lens-splat.gif") {
      return pick(hitPhrases);
    }

    if (name === "tomato-camera-miss.gif") {
      return pick(missPhrases);
    }

    return `${thrower} threw a tomato at ${target}.`;
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

function buildTomatoTally(guildId) {
  const guildScores = scores[guildId];

  if (!guildScores || Object.keys(guildScores).length === 0) {
    return "🍅 No tomatoes have been thrown here yet. The produce remains peaceful.";
  }

  const users = Object.entries(guildScores)
    .map(([id, stats]) => ({
      id,
      ...stats,
      activity:
        stats.timesHit +
        stats.timesMissed +
        stats.throwsHit +
        stats.throwsMissed
    }))
    .filter(user => user.activity > 0)
    .sort((a, b) => b.activity - a.activity);

  if (users.length === 0) {
    return "🍅 No tomatoes have been thrown here yet. The produce remains peaceful.";
  }

  const sections = users.map(user => {
    return [
      `🍅 <@${user.id}>`,
      `💥 Times hit: ${user.timesHit}`,
      `💨 Times missed: ${user.timesMissed}`,
      `🎯 Throws hit: ${user.throwsHit}`,
      `🥴 Throws missed: ${user.throwsMissed}`
    ].join("\n");
  });

  const highest = stat => {
    return [...users]
      .filter(user => user[stat] > 0)
      .sort((a, b) => b[stat] - a[stat])[0];
  };

  const tomatoMagnet = highest("timesHit");
  const sauceSniper = highest("throwsHit");
  const airballArtist = highest("throwsMissed");
  const cantTouchThis = highest("timesMissed");

  const awards = [];

  if (tomatoMagnet) {
    awards.push(
      `🧲🍅 **Tomato Magnet:** <@${tomatoMagnet.id}> (${tomatoMagnet.timesHit} splats)`
    );
  }

  if (sauceSniper) {
    awards.push(
      `🎯🍅 **Sauce Sniper:** <@${sauceSniper.id}> (${sauceSniper.throwsHit} hits)`
    );
  }

  if (airballArtist) {
    awards.push(
      `🌪️🍅 **Airball Artist:** <@${airballArtist.id}> (${airballArtist.throwsMissed} misses)`
    );
  }

  if (cantTouchThis) {
    awards.push(
      `🕺🍅 **Can't Touch This:** <@${cantTouchThis.id}> (${cantTouchThis.timesMissed} tomatoes escaped)`
    );
  }

  return [
    "🍅🍅🍅 **TOMATO TALLY** 🍅🍅🍅",
    "",
    sections.join("\n\n"),
    "",
    "🏆 **QUESTIONABLE ACHIEVEMENTS** 🏆",
    "",
    awards.join("\n"),
    "",
    "🍅 Long live the produce."
  ].join("\n");
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Discord Tomato Throw online as ${readyClient.user.tag}`);
  console.log(`Tomato tally storage: ${SCORE_FILE}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "tomato") {
    const target = interaction.options.getUser("target");

    if (!target) return;

    const targetIsNoctis = await isNoctis(interaction, target);

    const gif = targetIsNoctis
      ? pickNoctisTomato()
      : pickGenericTomato();

    const result = tomatoResult(gif, targetIsNoctis);

    recordTomatoResult(
      interaction.guildId,
      interaction.user,
      target,
      result
    );

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
    const target = interaction.options.getUser("target");

    if (!target) return;

    const targetIsNoctis = await isNoctis(interaction, target);

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

    return;
  }

  if (interaction.commandName === "tomato-tally") {
    await interaction.reply({
      content: buildTomatoTally(interaction.guildId)
    });
  }
});

client.login(process.env.DISCORD_TOKEN);