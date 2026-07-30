const {
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Zeigt, ob der Bot online ist."),
    new SlashCommandBuilder()
      .setName("coinflip")
      .setDescription("Wirft eine Muenze."),
    new SlashCommandBuilder()
      .setName("fastclick")
      .setDescription("Startet ein Fast-Click-Spiel.")
      .addIntegerOption((option) =>
        option
          .setName("sekunden")
          .setDescription("Wie lange das Spiel offen bleibt.")
          .setMinValue(5)
          .setMaxValue(60)
      ),
    new SlashCommandBuilder()
      .setName("minigame")
      .setDescription("Spielt ein kleines Spiel.")
      .addStringOption((option) =>
        option
          .setName("typ")
          .setDescription("Welches Spiel du spielen willst.")
          .setRequired(true)
          .addChoices(
            { name: "Zahl raten", value: "number" },
            { name: "Schere Stein Papier", value: "rps" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("zahl")
          .setDescription("Dein Tipp von 1 bis 10.")
          .setMinValue(1)
          .setMaxValue(10)
      )
      .addStringOption((option) =>
        option
          .setName("wahl")
          .setDescription("Deine Wahl fuer Schere Stein Papier.")
          .addChoices(
            { name: "Schere", value: "scissors" },
            { name: "Stein", value: "rock" },
            { name: "Papier", value: "paper" }
          )
      ),
    new SlashCommandBuilder()
      .setName("giveaway-create")
      .setDescription("Erstellt ein Giveaway per UI.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("giveaway-reroll")
      .setDescription("Zieht neue Gewinner fuer ein Giveaway.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("Die Message-ID des Giveaways.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("ticket-panel")
      .setDescription("Sendet das Ticket-Panel in den aktuellen Kanal.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("ticket-close")
      .setDescription("Schliesst das aktuelle Ticket.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
      .setName("application-panel")
      .setDescription("Sendet das Bewerbungs-Panel in den aktuellen Kanal.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  ].map((command) => command.toJSON());
}

module.exports = {
  buildCommands
};
