# Discord Bot Starter

A configurable Discord bot with tickets, giveaways, DM applications, and small minigames.

## Features

- Giveaways created through a UI modal
- `coinflip`
- `fastclick` reaction game
- DM applications with fully configurable questions
- Configurable application role choices like `Supporter` and `Mod`
- Application review buttons for accept and reject decisions
- Applicant DM notifications with reviewer name and reason
- Auto role assignment on accepted applications
- Minigames: Guess the Number and Rock Paper Scissors
- Ticket system with panel and configurable IDs
- JSON storage for giveaways and tickets

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`

3. Fill in `.env`:

   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` for faster testing on your server

4. Copy `config.example.json` to `config.json`

5. Fill in your channel, role, and category IDs in `config.json`

## Discord Developer Portal

You do not need any privileged gateway intents for this version.

Optional:

- `Server Members Intent` if you want to add member-based features later

Use at least these scopes in your invite URL:

- `bot`
- `applications.commands`

## Commands

- `/ping`
- `/coinflip`
- `/fastclick`
- `/minigame`
- `/giveaway-create`
- `/giveaway-reroll`
- `/ticket-panel`
- `/ticket-close`
- `/application-panel`

## Ticket Configuration

In `config.json`:

- `tickets.categoryId`: category for new tickets
- `tickets.supportRoleId`: role that gets access to tickets
- `tickets.devRoleIds`: roles that should always see all tickets
- `tickets.transcriptChannelId`: log channel for closed tickets
- `tickets.panelTitle` and `tickets.panelDescription`: panel text
- `tickets.channelNamePrefix`: prefix for new ticket channels
- `tickets.types`: ticket categories shown in the panel

## Application Configuration

In `config.json`:

- `applications.reviewChannelId`: channel for incoming applications
- `applications.staffRoleId`: role pinged when a new application arrives
- `applications.roles`: selectable application targets with `key`, `label`, and `roleId`
- `applications.questions`: questions asked in DMs

## Run

```bash
npm start
```

For development:

```bash
npm run dev
```

## MongoDB (optional)

This project supports storing runtime data in MongoDB instead of the local `data/` JSON files.

- Set these environment variables in your `.env` file:

   - `MONGO_URI` — MongoDB connection URI (required to enable Mongo storage)
   - `MONGO_DB_NAME` — optional database name (defaults to `bckertost`)

- After installing dependencies, you can migrate existing `data/*.json` files to MongoDB with:

```bash
node scripts/migrate-to-mongo.js
```

The script will connect to `MONGO_URI`, create collections named after each JSON file (for example `giveaways.json` → collection `giveaways`) and upsert a single document with `_id: "data"` containing the file contents.

If you prefer to keep local JSON storage, do not set `MONGO_URI`.

## Reaction Roles

You can configure reaction-role mappings so users receive a role when they react with a specific emoji on a message.

- Storage file: `reaction-roles.json` (created automatically when you add mappings)
- Example entry:

```
[
   {
      "guildId": "123456789012345678",
      "channelId": "234567890123456789",
      "messageId": "345678901234567890",
      "emoji": "👍",
      "roleId": "456789012345678901"
   }
]
```

Use the slash command `/self-rolls` with `action=Add|Remove|List` to manage mappings in-server.

Notes:
- For custom emojis, provide either `name:id` or `<:name:id>` as the `emoji` value.
- The bot needs `Manage Roles` and its role must be higher than the target role.
