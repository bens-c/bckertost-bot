# Discord Bot Starter

Ein konfigurierbarer Discord-Bot mit Tickets, Giveaways, Bewerbungen per DM und kleinen Minigames.

## Features

- Giveaways mit UI ueber ein Modal
- `coinflip`
- `fastclick` fuer Reaktionsspiele
- Bewerbungen per DM mit frei definierbaren Fragen
- Minigames: Zahl raten und Schere-Stein-Papier
- Ticket-System mit Panel und konfigurierbaren IDs
- JSON-Speicher fuer Giveaways und Tickets

## Setup

1. Installiere die Pakete:

   ```bash
   npm install
   ```

2. Kopiere `.env.example` nach `.env`

3. Trage in `.env` ein:

   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` fuer schnelles Testen auf deinem Server

4. Kopiere `config.example.json` nach `config.json`

5. Trage in `config.json` deine Channel-, Rollen- und Kategorie-IDs ein

## Discord Developer Portal

Aktiviere fuer den Bot im Developer Portal diese Privileged Gateway Intents:

- `Message Content Intent`
- `Server Members Intent` ist optional

Beim Invite solltest du mindestens diese Scopes setzen:

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

## Ticket-Konfiguration

In `config.json`:

- `tickets.categoryId`: Kategorie fuer neue Tickets
- `tickets.supportRoleId`: Rolle, die Zugriff auf Tickets bekommt
- `tickets.transcriptChannelId`: Log-Kanal fuer geschlossene Tickets
- `tickets.panelTitle` und `tickets.panelDescription`: Text des Panels
- `tickets.channelNamePrefix`: Prefix neuer Ticket-Kanaele

## Bewerbungs-Konfiguration

In `config.json`:

- `applications.reviewChannelId`: Kanal fuer eingehende Bewerbungen
- `applications.staffRoleId`: Rolle, die bei neuer Bewerbung gepingt wird
- `applications.questions`: Fragen, die in DMs gestellt werden

## Run

```bash
npm start
```

Fuer Entwicklung:

```bash
npm run dev
```
