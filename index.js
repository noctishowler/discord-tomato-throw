import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  AttachmentBuilder
} from "discord.js";

import fs from "fs";
import path from "path";
import sharp from "sharp";
import gifenc from "gifenc";
import "dotenv/config";

const {
  GIFEncoder,
  quantize,
  applyPalette
} = gifenc;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const pick = items =>
  items[Math.floor(Math.random() * items.length)];

const gifFiles = folder =>
  fs.readdirSync(folder)
    .filter(name =>
      name.toLowerCase().endsWith(".gif")
    )
    .map(name =>
      path.join(folder, name)
    );

const genericTomatoes =
  gifFiles("./assets/tomato/generic");

const genericPats =
  gifFiles("./assets/pat/generic");

const noctisTomatoes =
  gifFiles("./assets/tomato/noctis");

const noctisPats =
  gifFiles("./assets/pat/noctis");

const giantTomato =
  noctisTomatoes.find(file =>
    file.endsWith(
      "15-giant-tomato-rare.gif"
    )
  );

const regularNoctisTomatoes =
  noctisTomatoes.filter(file =>
    !file.endsWith(
      "15-giant-tomato-rare.gif"
    )
  );

const dontStopPat =
  noctisPats.find(file =>
    file.endsWith(
      "09-dont-stop-rare.gif"
    )
  );

const regularNoctisPats =
  noctisPats.filter(file =>
    !file.endsWith(
      "09-dont-stop-rare.gif"
    )
  );

/*
  Persistent storage
*/

const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  "./data";

const SCORE_FILE =
  path.join(
    DATA_DIR,
    "jester-stats.json"
  );

const OLD_SCORE_FILE =
  path.join(
    DATA_DIR,
    "tomato-tally.json"
  );

const JESTER_CONFIG_FILE =
  path.join(
    DATA_DIR,
    "jester-config.json"
  );

fs.mkdirSync(
  DATA_DIR,
  { recursive: true }
);

function loadScores() {
  try {
    if (
      fs.existsSync(SCORE_FILE)
    ) {
      return JSON.parse(
        fs.readFileSync(
          SCORE_FILE,
          "utf8"
        )
      );
    }

    if (
      fs.existsSync(
        OLD_SCORE_FILE
      )
    ) {
      console.log(
        "Importing old tomato tally data."
      );

      return JSON.parse(
        fs.readFileSync(
          OLD_SCORE_FILE,
          "utf8"
        )
      );
    }

    return {};
  } catch (error) {
    console.error(
      "Could not load Jester stats:",
      error
    );

    return {};
  }
}

function loadJesterConfig() {
  try {
    if (
      fs.existsSync(
        JESTER_CONFIG_FILE
      )
    ) {
      return JSON.parse(
        fs.readFileSync(
          JESTER_CONFIG_FILE,
          "utf8"
        )
      );
    }

    return {};
  } catch (error) {
    console.error(
      "Could not load Jester config:",
      error
    );

    return {};
  }
}

let scores =
  loadScores();

let jesterConfig =
  loadJesterConfig();

function saveScores() {
  try {
    const tempFile =
      `${SCORE_FILE}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(
        scores,
        null,
        2
      ),
      "utf8"
    );

    fs.renameSync(
      tempFile,
      SCORE_FILE
    );
  } catch (error) {
    console.error(
      "Could not save Jester stats:",
      error
    );
  }
}

function saveJesterConfig() {
  try {
    const tempFile =
      `${JESTER_CONFIG_FILE}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(
        jesterConfig,
        null,
        2
      ),
      "utf8"
    );

    fs.renameSync(
      tempFile,
      JESTER_CONFIG_FILE
    );
  } catch (error) {
    console.error(
      "Could not save Jester config:",
      error
    );
  }
}

function getGuildJesterConfig(
  guildId
) {
  if (!jesterConfig[guildId]) {
    jesterConfig[guildId] = {
      enabled: false,
      heavy: false,
      channelId: null,
      lastTomatoAt: null,
      lastPatAt: null
    };
  }

  const config =
    jesterConfig[guildId];

  config.enabled ??= false;
  config.heavy ??= false;
  config.channelId ??= null;
  config.lastTomatoAt ??= null;
  config.lastPatAt ??= null;

  return config;
}

function ensureUser(
  guildId,
  user
) {
  if (!scores[guildId]) {
    scores[guildId] = {};
  }

  if (
    !scores[guildId][user.id]
  ) {
    scores[guildId][user.id] = {
      name:
        user.globalName ||
        user.username,

      timesHit: 0,
      timesMissed: 0,
      throwsHit: 0,
      throwsMissed: 0,

      patsGiven: 0,
      patsReceived: 0
    };
  }

  const stats =
    scores[guildId][user.id];

  stats.timesHit ??= 0;
  stats.timesMissed ??= 0;
  stats.throwsHit ??= 0;
  stats.throwsMissed ??= 0;
  stats.patsGiven ??= 0;
  stats.patsReceived ??= 0;

  stats.name =
    user.globalName ||
    user.username;

  return stats;
}

function recordTomatoResult(
  guildId,
  thrower,
  target,
  result
) {
  const throwerStats =
    ensureUser(
      guildId,
      thrower
    );

  const targetStats =
    ensureUser(
      guildId,
      target
    );

  if (result === "hit") {
    throwerStats.throwsHit += 1;
    targetStats.timesHit += 1;
  } else {
    throwerStats.throwsMissed += 1;
    targetStats.timesMissed += 1;
  }

  saveScores();
}

function recordPat(
  guildId,
  giver,
  target
) {
  const giverStats =
    ensureUser(
      guildId,
      giver
    );

  const targetStats =
    ensureUser(
      guildId,
      target
    );

  giverStats.patsGiven += 1;
  targetStats.patsReceived += 1;

  saveScores();
}

/*
  Dynamic avatar pat
*/

const PAT_WIDTH = 384;
const PAT_HEIGHT = 384;

const PAT_HAND =
  "./assets/pat/hand.PNG";

function createCircleMask(
  width,
  height
) {
  return Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="${width / 2}"
        cy="${height / 2}"
        rx="${width / 2}"
        ry="${height / 2}"
        fill="white"
      />
    </svg>
  `);
}

async function getAvatarUrl(
  guild,
  target
) {
  let member = null;

  try {
    member =
      await guild.members.fetch(
        target.id
      );
  } catch {}

  return (
    member?.displayAvatarURL({
      extension: "png",
      size: 256
    }) ||
    target.displayAvatarURL({
      extension: "png",
      size: 256
    })
  );
}

async function downloadBuffer(
  url
) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Avatar download failed: ${response.status}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

async function makePatAvatar(
  avatarBuffer,
  width,
  height
) {
  const resized =
    await sharp(
      avatarBuffer
    )
      .resize(
        width,
        height,
        {
          fit: "cover"
        }
      )
      .png()
      .toBuffer();

  return sharp(
    resized
  )
    .composite([
      {
        input:
          createCircleMask(
            width,
            height
          ),
        blend: "dest-in"
      }
    ])
    .png()
    .toBuffer();
}

async function buildPatFrame(
  avatarBuffer,
  frame
) {
  const avatar =
    await makePatAvatar(
      avatarBuffer,
      frame.avatarWidth,
      frame.avatarHeight
    );

  const hand =
    await sharp(
      PAT_HAND
    )
      .resize({
        width: 205,
        height: 205,
        fit: "contain",
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0
        }
      })
      .png()
      .toBuffer();

  const avatarX =
    Math.round(
      (
        PAT_WIDTH -
        frame.avatarWidth
      ) / 2
    );

  const canvas =
    sharp({
      create: {
        width:
          PAT_WIDTH,

        height:
          PAT_HEIGHT,

        channels: 4,

        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0
        }
      }
    });

  return canvas
    .composite([
      {
        input: avatar,
        left: avatarX,
        top: frame.avatarY
      },
      {
        input: hand,
        left: 90,
        top: frame.handY
      }
    ])
    .raw()
    .toBuffer({
      resolveWithObject: true
    });
}

async function generateAvatarPatGif(
  guild,
  target
) {
  const avatarUrl =
    await getAvatarUrl(
      guild,
      target
    );

  const avatarBuffer =
    await downloadBuffer(
      avatarUrl
    );

  const frames = [
    {
      handY: 14,
      avatarWidth: 190,
      avatarHeight: 190,
      avatarY: 176,
      delay: 110
    },
    {
      handY: 30,
      avatarWidth: 190,
      avatarHeight: 190,
      avatarY: 176,
      delay: 80
    },
    {
      handY: 46,
      avatarWidth: 190,
      avatarHeight: 190,
      avatarY: 176,
      delay: 70
    },
    {
      handY: 60,
      avatarWidth: 194,
      avatarHeight: 181,
      avatarY: 185,
      delay: 70
    },
    {
      handY: 72,
      avatarWidth: 202,
      avatarHeight: 164,
      avatarY: 202,
      delay: 120
    },
    {
      handY: 62,
      avatarWidth: 196,
      avatarHeight: 177,
      avatarY: 189,
      delay: 70
    },
    {
      handY: 48,
      avatarWidth: 191,
      avatarHeight: 187,
      avatarY: 179,
      delay: 70
    },
    {
      handY: 30,
      avatarWidth: 190,
      avatarHeight: 190,
      avatarY: 176,
      delay: 90
    },
    {
      handY: 14,
      avatarWidth: 190,
      avatarHeight: 190,
      avatarY: 176,
      delay: 160
    }
  ];

  const gif =
    GIFEncoder();

  for (
    let i = 0;
    i < frames.length;
    i++
  ) {
    const rendered =
      await buildPatFrame(
        avatarBuffer,
        frames[i]
      );

    const rgba =
      new Uint8Array(
        rendered.data
      );

    const palette =
      quantize(
        rgba,
        128,
        {
          format:
            "rgba4444",

          oneBitAlpha:
            true
        }
      );

    const indexed =
      applyPalette(
        rgba,
        palette,
        "rgba4444"
      );

    const transparentIndex =
      palette.findIndex(
        color =>
          color.length === 4 &&
          color[3] === 0
      );

    gif.writeFrame(
      indexed,
      PAT_WIDTH,
      PAT_HEIGHT,
      {
        palette,

        delay:
          frames[i].delay,

        repeat: 0,

        transparent:
          transparentIndex >= 0,

        transparentIndex:
          transparentIndex >= 0
            ? transparentIndex
            : 0,

        dispose: 2
      }
    );
  }

  gif.finish();

  return Buffer.from(
    gif.bytes()
  );
}

/*
  Tomato selection
*/

function pickGenericTomato() {
  const hit =
    genericTomatoes.find(
      file =>
        file.endsWith(
          "tomato-lens-splat.gif"
        )
    );

  const miss =
    genericTomatoes.find(
      file =>
        file.endsWith(
          "tomato-camera-miss.gif"
        )
    );

  if (hit && miss) {
    return Math.random() < 0.8
      ? hit
      : miss;
  }

  return (
    hit ??
    miss ??
    pick(
      genericTomatoes
    )
  );
}

function pickNoctisTomato() {
  if (
    giantTomato &&
    Math.random() < 0.01
  ) {
    return giantTomato;
  }

  return pick(
    regularNoctisTomatoes
  );
}

function pickNoctisPat() {
  if (
    dontStopPat &&
    Math.random() < 0.01
  ) {
    return dontStopPat;
  }

  return pick(
    regularNoctisPats
  );
}

function tomatoResult(
  gif,
  noctis
) {
  const name =
    path.basename(gif);

  if (!noctis) {
    return name ===
      "tomato-lens-splat.gif"
      ? "hit"
      : "miss";
  }

  const hitAnimations =
    new Set([
      "01-direct-hit.gif",
      "03-bad-dodge.gif",
      "07-barrage.gif",
      "08-cherry-tomato.gif",
      "11-angry.gif",
      "12-awoo-interrupted.gif",
      "14-shake-it-off.gif",
      "15-giant-tomato-rare.gif"
    ]);

  const missAnimations =
    new Set([
      "02-dodge.gif",
      "04-catch-and-eat.gif",
      "05-return-fire.gif",
      "09-incoming.gif",
      "10-wrong-direction.gif",
      "13-victory-catch.gif"
    ]);

  if (
    hitAnimations.has(name)
  ) {
    return "hit";
  }

  if (
    missAnimations.has(name)
  ) {
    return "miss";
  }

  return "miss";
}

/*
  Tomato text
*/

function tomatoPhrase(
  gif,
  thrower,
  target,
  noctis
) {
  const name =
    path.basename(gif);

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

    if (
      name ===
      "tomato-lens-splat.gif"
    ) {
      return pick(
        hitPhrases
      );
    }

    if (
      name ===
      "tomato-camera-miss.gif"
    ) {
      return pick(
        missPhrases
      );
    }

    return (
      `${thrower} threw a tomato at ${target}.`
    );
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

  return (
    phrases[name] ??
    `${thrower} threw a tomato at ${target}.`
  );
}

/*
  Pat text
*/

function patPhrase(
  gif,
  giver,
  target,
  noctis
) {
  if (!noctis) {
    return (
      `${giver} gave ${target} a pat!`
    );
  }

  const name =
    path.basename(gif);

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

  return (
    phrases[name] ??
    `${giver} gave ${target} a pat!`
  );
}

async function isNoctis(
  guild,
  target
) {
  let member = null;

  try {
    member =
      await guild.members.fetch(
        target.id
      );
  } catch {}

  const names = [
    target.username,
    target.globalName,
    member?.displayName
  ]
    .filter(Boolean)
    .map(name =>
      name
        .trim()
        .toLowerCase()
    );

  return names.includes(
    "noctis"
  );
}

/*
  Random Jester targets
*/

async function getRandomHuman(
  guild
) {
  const members =
    await guild.members.fetch();

  const humans =
    members.filter(
      member =>
        !member.user.bot
    );

  if (
    humans.size === 0
  ) {
    return null;
  }

  return pick(
    [...humans.values()]
  );
}

/*
  Automatic Jester
*/

const NORMAL_INTERVAL =
  24 * 60 * 60 * 1000;

const HEAVY_INTERVAL =
  6 * 60 * 60 * 1000;

async function runAutomaticTomato(
  guild,
  channel
) {
  const member =
    await getRandomHuman(
      guild
    );

  if (!member) {
    return;
  }

  const target =
    member.user;

  const targetIsNoctis =
    await isNoctis(
      guild,
      target
    );

  const gif =
    targetIsNoctis
      ? pickNoctisTomato()
      : pickGenericTomato();

  if (!gif) {
    return;
  }

  const result =
    tomatoResult(
      gif,
      targetIsNoctis
    );

  await channel.send({
    content:
      tomatoPhrase(
        gif,
        client.user,
        target,
        targetIsNoctis
      ),

    files: [
      gif
    ]
  });

  recordTomatoResult(
    guild.id,
    client.user,
    target,
    result
  );
}

async function runAutomaticPat(
  guild,
  channel
) {
  const member =
    await getRandomHuman(
      guild
    );

  if (!member) {
    return;
  }

  const target =
    member.user;

  const targetIsNoctis =
    await isNoctis(
      guild,
      target
    );

  if (targetIsNoctis) {
    const gif =
      pickNoctisPat();

    if (!gif) {
      return;
    }

    await channel.send({
      content:
        patPhrase(
          gif,
          client.user,
          target,
          true
        ),

      files: [
        gif
      ]
    });

    recordPat(
      guild.id,
      client.user,
      target
    );

    return;
  }

  try {
    const patGif =
      await generateAvatarPatGif(
        guild,
        target
      );

    const attachment =
      new AttachmentBuilder(
        patGif,
        {
          name:
            "avatar-pat.gif"
        }
      );

    await channel.send({
      content:
        `${client.user} gave ${target} a pat!`,

      files: [
        attachment
      ]
    });

    recordPat(
      guild.id,
      client.user,
      target
    );
  } catch (error) {
    console.error(
      "Automatic pat generation failed:",
      error
    );

    const fallback =
      genericPats.length > 0
        ? pick(
            genericPats
          )
        : null;

    if (!fallback) {
      return;
    }

    await channel.send({
      content:
        `${client.user} gave ${target} a pat!`,

      files: [
        fallback
      ]
    });

    recordPat(
      guild.id,
      client.user,
      target
    );
  }
}

async function checkAutomaticJester() {
  const now =
    Date.now();

  for (
    const [
      guildId,
      config
    ] of Object.entries(
      jesterConfig
    )
  ) {
    if (
      !config.enabled ||
      !config.channelId
    ) {
      continue;
    }

    const guild =
      client.guilds.cache.get(
        guildId
      );

    if (!guild) {
      continue;
    }

    let channel = null;

    try {
      channel =
        await guild.channels.fetch(
          config.channelId
        );
    } catch {}

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      continue;
    }

    const interval =
      config.heavy
        ? HEAVY_INTERVAL
        : NORMAL_INTERVAL;

    const lastTomato =
      config.lastTomatoAt ?? now;

    const lastPat =
      config.lastPatAt ?? now;

    if (
      now - lastTomato >=
      interval
    ) {
      try {
        await runAutomaticTomato(
          guild,
          channel
        );

        config.lastTomatoAt =
          Date.now();

        saveJesterConfig();
      } catch (error) {
        console.error(
          `Automatic tomato failed in guild ${guildId}:`,
          error
        );
      }
    }

    if (
      now - lastPat >=
      interval
    ) {
      try {
        await runAutomaticPat(
          guild,
          channel
        );

        config.lastPatAt =
          Date.now();

        saveJesterConfig();
      } catch (error) {
        console.error(
          `Automatic pat failed in guild ${guildId}:`,
          error
        );
      }
    }
  }
}

/*
  Stats
*/

function getServerUsers(
  guildId
) {
  const guildScores =
    scores[guildId];

  if (!guildScores) {
    return [];
  }

  return Object.entries(
    guildScores
  ).map(
    ([id, stats]) => ({
      id,
      name: stats.name,

      timesHit:
        stats.timesHit ?? 0,

      timesMissed:
        stats.timesMissed ?? 0,

      throwsHit:
        stats.throwsHit ?? 0,

      throwsMissed:
        stats.throwsMissed ?? 0,

      patsGiven:
        stats.patsGiven ?? 0,

      patsReceived:
        stats.patsReceived ?? 0
    })
  );
}

function getFloofAwards(
  guildId
) {
  const users =
    getServerUsers(
      guildId
    )
      .map(user => ({
        ...user,

        patActivity:
          user.patsGiven +
          user.patsReceived,

        tomatoesThrown:
          user.throwsHit +
          user.throwsMissed
      }))
      .filter(
        user =>
          user.patActivity > 0
      );

  const mostGiven =
    [...users]
      .filter(
        user =>
          user.patsGiven > 0
      )
      .sort(
        (a, b) =>
          b.patsGiven -
          a.patsGiven
      )[0];

  const mostReceived =
    [...users]
      .filter(
        user =>
          user.patsReceived > 0
      )
      .sort(
        (a, b) =>
          b.patsReceived -
          a.patsReceived
      )[0];

  const mostActivity =
    [...users]
      .sort(
        (a, b) =>
          b.patActivity -
          a.patActivity
      )[0];

  const pacifist =
    [...users]
      .filter(
        user =>
          user.patsGiven >= 5
      )
      .map(user => ({
        ...user,

        pacifistScore:
          user.patsGiven -
          user.tomatoesThrown
      }))
      .sort(
        (a, b) =>
          b.pacifistScore -
          a.pacifistScore
      )[0];

  return {
    mostGiven,
    mostReceived,
    mostActivity,
    pacifist
  };
}

/*
  Tomato tally
*/

function buildTomatoTallyEmbed(
  guildId
) {
  const users =
    getServerUsers(
      guildId
    )
      .map(user => ({
        ...user,

        tomatoesThrown:
          user.throwsHit +
          user.throwsMissed
      }))
      .filter(user =>
        (
          user.timesHit +
          user.timesMissed +
          user.throwsHit +
          user.throwsMissed
        ) > 0
      )
      .sort(
        (a, b) =>
          b.tomatoesThrown -
          a.tomatoesThrown
      );

  if (
    users.length === 0
  ) {
    return new EmbedBuilder()
      .setTitle(
        "🍅 Tomato Tally"
      )
      .setDescription(
        "No tomatoes have been thrown here yet.\nThe produce remains peaceful."
      );
  }

  const highest = stat =>
    [...users]
      .filter(
        user =>
          user[stat] > 0
      )
      .sort(
        (a, b) =>
          b[stat] -
          a[stat]
      )[0];

  const tomatoMagnet =
    highest(
      "timesHit"
    );

  const sauceSniper =
    highest(
      "throwsHit"
    );

  const airballArtist =
    highest(
      "throwsMissed"
    );

  const cantTouchThis =
    highest(
      "timesMissed"
    );

  const awards = [];

  if (tomatoMagnet) {
    awards.push(
      `🧲🍅 **Tomato Magnet**\n<@${tomatoMagnet.id}> • ${tomatoMagnet.timesHit} splats`
    );
  }

  if (sauceSniper) {
    awards.push(
      `🎯🍅 **Sauce Sniper**\n<@${sauceSniper.id}> • ${sauceSniper.throwsHit} hits`
    );
  }

  if (airballArtist) {
    awards.push(
      `🌪️🍅 **Airball Artist**\n<@${airballArtist.id}> • ${airballArtist.throwsMissed} misses`
    );
  }

  if (cantTouchThis) {
    awards.push(
      `🕺🍅 **Can't Touch This**\n<@${cantTouchThis.id}> • ${cantTouchThis.timesMissed} dodges`
    );
  }

  const topUsers =
    users.slice(
      0,
      15
    );

  const leaderboard =
    topUsers
      .map(
        (
          user,
          index
        ) =>
          [
            `**${index + 1}. <@${user.id}>**`,

            `🎯 ${user.throwsHit} hit • 🥴 ${user.throwsMissed} missed`,

            `💥 Hit ${user.timesHit}x • 💨 Dodged ${user.timesMissed}x`
          ].join(
            "\n"
          )
      )
      .join(
        "\n\n"
      );

  return new EmbedBuilder()
    .setTitle(
      "🍅🍅🍅 TOMATO TALLY 🍅🍅🍅"
    )
    .setDescription(
      "An entirely unnecessary record of produce-related violence."
    )
    .addFields(
      {
        name:
          "🏆 QUESTIONABLE ACHIEVEMENTS",

        value:
          awards.length > 0
            ? awards.join(
                "\n\n"
              )
            : "No questionable achievements yet."
      },

      {
        name:
          "🍅 TOP TOMATO PARTICIPANTS",

        value:
          leaderboard
      }
    )
    .setFooter({
      text:
        users.length > 15
          ? `Showing top 15 of ${users.length} tomato participants`
          : `${users.length} tomato participant${users.length === 1 ? "" : "s"}`
    });
}

/*
  Floof leaderboard
*/

function buildGoodFloofEmbed(
  guildId
) {
  const users =
    getServerUsers(
      guildId
    )
      .map(user => ({
        ...user,

        patActivity:
          user.patsGiven +
          user.patsReceived,

        tomatoesThrown:
          user.throwsHit +
          user.throwsMissed
      }))
      .filter(
        user =>
          user.patActivity > 0
      )
      .sort(
        (a, b) =>
          b.patActivity -
          a.patActivity
      );

  if (
    users.length === 0
  ) {
    return new EmbedBuilder()
      .setTitle(
        "🐾 Who's a Good Floof?"
      )
      .setDescription(
        "Nobody has been patted yet.\nThis is unacceptable."
      );
  }

  const {
    mostGiven,
    mostReceived,
    mostActivity,
    pacifist
  } =
    getFloofAwards(
      guildId
    );

  const awards = [];

  if (mostGiven) {
    awards.push(
      `🐾 **Purpetual Petter** 🐾\n<@${mostGiven.id}> • ${mostGiven.patsGiven} pats given`
    );
  }

  if (mostReceived) {
    awards.push(
      `🫳 **Fluffiest** 🥰\n<@${mostReceived.id}> • ${mostReceived.patsReceived} pats received`
    );
  }

  if (pacifist) {
    awards.push(
      `🇺🇳 **Pacifist** ☮️\n<@${pacifist.id}> • ${pacifist.patsGiven} pats • ${pacifist.tomatoesThrown} tomatoes thrown`
    );
  }

  if (mostActivity) {
    awards.push(
      `✨ **Pat Enthusiast** ✨\n<@${mostActivity.id}> • ${mostActivity.patActivity} total pat activity`
    );
  }

  const topUsers =
    users.slice(
      0,
      15
    );

  const leaderboard =
    topUsers
      .map(
        (
          user,
          index
        ) =>
          [
            `**${index + 1}. <@${user.id}>**`,
            `🫳 Given: ${user.patsGiven} • 🥰 Received: ${user.patsReceived}`
          ].join(
            "\n"
          )
      )
      .join(
        "\n\n"
      );

  return new EmbedBuilder()
    .setTitle(
      "🐾✨ WHO'S A GOOD FLOOF? ✨🐾"
    )
    .setDescription(
      "Officially unofficial records of excessive affection."
    )
    .addFields(
      {
        name:
          "🏆 FLOOF HONORS",

        value:
          awards.length > 0
            ? awards.join(
                "\n\n"
              )
            : "No floof honors yet."
      },

      {
        name:
          "🐾 TOP FLOOFS",

        value:
          leaderboard
      }
    )
    .setFooter({
      text:
        users.length > 15
          ? `Showing top 15 of ${users.length} floofs`
          : `${users.length} floof${users.length === 1 ? "" : "s"}`
    });
}

/*
  Individual floof check
*/

function buildFloofCheckEmbed(
  guildId,
  target
) {
  const users =
    getServerUsers(
      guildId
    );

  const user =
    users.find(
      user =>
        user.id ===
        target.id
    );

  const stats =
    user ?? {
      id:
        target.id,

      patsGiven: 0,
      patsReceived: 0,
      timesHit: 0,
      timesMissed: 0,
      throwsHit: 0,
      throwsMissed: 0
    };

  const patActivity =
    stats.patsGiven +
    stats.patsReceived;

  const awards =
    getFloofAwards(
      guildId
    );

  const heldAwards =
    [];

  if (
    awards.mostGiven?.id ===
    target.id
  ) {
    heldAwards.push(
      "🐾 **Purpetual Petter** 🐾"
    );
  }

  if (
    awards.mostReceived?.id ===
    target.id
  ) {
    heldAwards.push(
      "🫳 **Fluffiest** 🥰"
    );
  }

  if (
    awards.pacifist?.id ===
    target.id
  ) {
    heldAwards.push(
      "🇺🇳 **Pacifist** ☮️"
    );
  }

  if (
    awards.mostActivity?.id ===
    target.id
  ) {
    heldAwards.push(
      "✨ **Pat Enthusiast** ✨"
    );
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🐾 FLOOF CHECK"
      )
      .setDescription(
        `<@${target.id}>`
      )
      .setThumbnail(
        target.displayAvatarURL({
          size: 256
        })
      )
      .addFields(
        {
          name:
            "🫳 Pats Given",

          value:
            String(
              stats.patsGiven
            ),

          inline: true
        },

        {
          name:
            "🥰 Pats Received",

          value:
            String(
              stats.patsReceived
            ),

          inline: true
        },

        {
          name:
            "✨ Pat Activity",

          value:
            String(
              patActivity
            ),

          inline: true
        },

        {
          name:
            "🍅 Tomato Record",

          value: [
            `💥 **Times Hit:** ${stats.timesHit}`,
            `🎯 **Hit Target:** ${stats.throwsHit}`,
            `💨 **Times Dodged:** ${stats.timesMissed}`,
            `🥴 **Missed:** ${stats.throwsMissed}`
          ].join(
            "\n"
          )
        }
      );

  if (
    heldAwards.length > 0
  ) {
    embed.addFields({
      name:
        "🏆 Floof Honors",

      value:
        heldAwards.join(
          "\n"
        )
    });
  } else {
    embed.addFields({
      name:
        "🏆 Floof Honors",

      value:
        "No questionable floof titles yet."
    });
  }

  return embed;
}

/*
  Ready
*/

client.once(
  Events.ClientReady,
  readyClient => {
    console.log(
      `Discord Tomato Throw online as ${readyClient.user.tag}`
    );

    console.log(
      `Jester stats storage: ${SCORE_FILE}`
    );

    console.log(
      `Jester config storage: ${JESTER_CONFIG_FILE}`
    );

    setInterval(
      checkAutomaticJester,
      60 * 1000
    );

    checkAutomaticJester()
      .catch(error =>
        console.error(
          "Initial Jester scheduler check failed:",
          error
        )
      );
  }
);

/*
  Commands
*/

client.on(
  Events.InteractionCreate,
  async interaction => {
    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    if (
      !interaction.guildId
    ) {
      await interaction.reply({
        content:
          "This command only works inside a server.",

        ephemeral: true
      });

      return;
    }

    /*
      /togglejester
    */

    if (
      interaction.commandName ===
      "togglejester"
    ) {
      const config =
        getGuildJesterConfig(
          interaction.guildId
        );

      if (config.enabled) {
        config.enabled =
          false;

        config.heavy =
          false;

        saveJesterConfig();

        await interaction.reply({
          content:
            "Jester has been turned off.",

          ephemeral: true
        });

        return;
      }

      const now =
        Date.now();

      config.enabled =
        true;

      config.heavy =
        false;

      config.channelId =
        interaction.channelId;

      config.lastTomatoAt =
        now;

      config.lastPatAt =
        now;

      saveJesterConfig();

      await interaction.reply({
        content:
          "Jester has been turned on.",

        ephemeral: true
      });

      return;
    }

    /*
      /heavyjester
    */

    if (
      interaction.commandName ===
      "heavyjester"
    ) {
      const config =
        getGuildJesterConfig(
          interaction.guildId
        );

      if (
        !config.enabled
      ) {
        await interaction.reply({
          content:
            "Jester must be turned on first.",

          ephemeral: true
        });

        return;
      }

      config.heavy =
        !config.heavy;

      const now =
        Date.now();

      config.lastTomatoAt =
        now;

      config.lastPatAt =
        now;

      saveJesterConfig();

      await interaction.reply({
        content:
          config.heavy
            ? "Heavy Jester has been turned on."
            : "Heavy Jester has been turned off.",

        ephemeral: true
      });

      return;
    }

    /*
      /tomato
    */

    if (
      interaction.commandName ===
      "tomato"
    ) {
      const target =
        interaction.options.getUser(
          "target"
        );

      if (!target) {
        return;
      }

      const targetIsNoctis =
        await isNoctis(
          interaction.guild,
          target
        );

      const gif =
        targetIsNoctis
          ? pickNoctisTomato()
          : pickGenericTomato();

      if (!gif) {
        await interaction.reply({
          content:
            "Jester can't find a tomato GIF right now."
        });

        return;
      }

      const result =
        tomatoResult(
          gif,
          targetIsNoctis
        );

      await interaction.reply({
        content:
          tomatoPhrase(
            gif,
            interaction.user,
            target,
            targetIsNoctis
          ),

        files: [
          gif
        ]
      });

      recordTomatoResult(
        interaction.guildId,
        interaction.user,
        target,
        result
      );

      return;
    }

    /*
      /pat
    */

    if (
      interaction.commandName ===
      "pat"
    ) {
      const target =
        interaction.options.getUser(
          "target"
        );

      if (!target) {
        return;
      }

      const targetIsNoctis =
        await isNoctis(
          interaction.guild,
          target
        );

      if (
        targetIsNoctis
      ) {
        const gif =
          pickNoctisPat();

        if (!gif) {
          await interaction.reply({
            content:
              "Jester can't find a Noctis pat GIF right now."
          });

          return;
        }

        await interaction.reply({
          content:
            patPhrase(
              gif,
              interaction.user,
              target,
              true
            ),

          files: [
            gif
          ]
        });

        recordPat(
          interaction.guildId,
          interaction.user,
          target
        );

        return;
      }

      await interaction.deferReply();

      try {
        const patGif =
          await generateAvatarPatGif(
            interaction.guild,
            target
          );

        const attachment =
          new AttachmentBuilder(
            patGif,
            {
              name:
                "avatar-pat.gif"
            }
          );

        await interaction.editReply({
          content:
            `${interaction.user} gave ${target} a pat!`,

          files: [
            attachment
          ]
        });

        recordPat(
          interaction.guildId,
          interaction.user,
          target
        );
      } catch (error) {
        console.error(
          "Dynamic pat generation failed:",
          error
        );

        const fallback =
          genericPats.length > 0
            ? pick(
                genericPats
              )
            : null;

        if (
          fallback
        ) {
          await interaction.editReply({
            content:
              `${interaction.user} gave ${target} a pat!`,

            files: [
              fallback
            ]
          });

          recordPat(
            interaction.guildId,
            interaction.user,
            target
          );
        } else {
          await interaction.editReply({
            content:
              "Jester tried to pat them, but the paw malfunctioned."
          });
        }
      }

      return;
    }

    /*
      /tomatotally
    */

    if (
      interaction.commandName ===
      "tomatotally"
    ) {
      await interaction.reply({
        embeds: [
          buildTomatoTallyEmbed(
            interaction.guildId
          )
        ],

        ephemeral: true
      });

      return;
    }

    /*
      /whosagoodfloof
    */

    if (
      interaction.commandName ===
      "whosagoodfloof"
    ) {
      await interaction.reply({
        embeds: [
          buildGoodFloofEmbed(
            interaction.guildId
          )
        ],

        ephemeral: true
      });

      return;
    }

    /*
      /checkfloof
    */

    if (
      interaction.commandName ===
      "checkfloof"
    ) {
      const target =
        interaction.options.getUser(
          "target"
        );

      if (!target) {
        return;
      }

      await interaction.reply({
        embeds: [
          buildFloofCheckEmbed(
            interaction.guildId,
            target
          )
        ],

        ephemeral: true
      });

      return;
    }
  }
);

client.login(
  process.env.DISCORD_TOKEN
);