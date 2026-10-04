# Discord Tomato Throw

A tiny Discord bot with two interaction commands:

- `/tomato @someone`
- `/pat @someone`

## Normal behavior

`/tomato @someone` responds with:

`@thrower threw a tomato at @target 🍅`

and the generic tomato GIF.

`/pat @someone` responds with:

`@thrower gave @target a pat 🐾`

and the generic furry pat GIF.

## Noctis Easter egg

The Easter egg is name-based, not account-ID-based.

If the selected user's Discord username, global display name, or server nickname is exactly `Noctis`, ignoring capitalization:

- `/tomato @Noctis` randomly uses one of the included Noctis tomato animations.
- `/pat @Noctis` uses the Noctis pat animation and says `@thrower petted @Noctis, awww! 🐾`.

That means any person named Noctis on any server where the bot is installed can trigger it.

## Project files

```text
discord-tomato-throw/
├── index.js
├── deploy-commands.js
├── package.json
├── .env.example
├── .gitignore
└── assets/
    ├── tomato.gif
    ├── pat.gif
    └── noctis/
        ├── pat.gif
        ├── tomato-reaction.gif
        └── tomato-return-fire.gif
```

## Discord setup

1. Create an application in the Discord Developer Portal.
2. Open **Bot** and create the bot user.
3. Copy `.env.example` to `.env`.
4. Put your bot token and application ID in `.env`.
5. Never commit your real `.env` file or token to GitHub.
6. In **OAuth2 > URL Generator**, select `bot` and `applications.commands`.
7. Give the bot permission to send messages and attach files.
8. Use the generated URL to invite it to your server.

## Install and run

```bash
npm install
npm run deploy
npm start
```

`npm run deploy` registers `/tomato` and `/pat` globally, so the commands are available in every server the bot joins.

## Environment variables

```text
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

No server ID or Noctis user ID is required.
