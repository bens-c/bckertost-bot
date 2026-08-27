const {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Checks whether the bot is online."),
    new SlashCommandBuilder()
      .setName("coinflip")
      .setDescription("Flips a coin."),
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Applies the maximum Discord timeout to a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to mute.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are muting this user.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("Removes the timeout from a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to unmute.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are unmuting this user.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warns a member and stores the warning.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to warn.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for the warning.")
          .setRequired(true)
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("Shows stored warnings for a user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose warnings you want to see.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kicks a member from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to kick.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are kicking this user.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Bans a user from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to ban.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are banning this user.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Unbans a user by ID.")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((option) =>
        option
          .setName("user_id")
          .setDescription("The Discord user ID to unban.")
          .setRequired(true)
          .setMaxLength(25)
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are unbanning this user.")
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("help")
      .setDescription("Shows the bot command overview."),
    new SlashCommandBuilder()
      .setName("echo")
      .setDescription("Repeats your text.")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text the bot should repeat.")
          .setRequired(true)
          .setMaxLength(2000)
      ),
    new SlashCommandBuilder()
      .setName("gvouch")
      .setDescription("Posts a vouch request for a user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to vouch for.")
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The channel where the vouch message should be sent.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("penis")
      .setDescription("Posts a fixed message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Deletes a number of recent messages.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("How many messages to delete (1-100).")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      ),
    new SlashCommandBuilder()
      .setName("slowmode")
      .setDescription("Sets the channel slowmode in seconds.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addIntegerOption((option) =>
        option
          .setName("seconds")
          .setDescription("Slowmode duration in seconds (0-21600).")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(21600)
      ),
    new SlashCommandBuilder()
      .setName("lock")
      .setDescription("Locks the current channel for @everyone.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("Unlocks the current channel for @everyone.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Shows information about a user.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to inspect.")
      ),
    new SlashCommandBuilder()
      .setName("avatar")
      .setDescription("Shows a user's avatar.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose avatar you want to see.")
      ),
    new SlashCommandBuilder()
      .setName("serverinfo")
      .setDescription("Shows information about the server."),
    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Sends a plain message through the bot.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("The text the bot should send.")
          .setRequired(true)
          .setMaxLength(2000)
      ),
    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("Sends a simple embed message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("Embed title.")
          .setRequired(true)
          .setMaxLength(256)
      )
      .addStringOption((option) =>
        option
          .setName("description")
          .setDescription("Embed description.")
          .setRequired(true)
          .setMaxLength(4000)
      ),
    new SlashCommandBuilder()
      .setName("poll")
      .setDescription("Creates a yes/no poll.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((option) =>
        option
          .setName("question")
          .setDescription("The poll question.")
          .setRequired(true)
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("announce")
      .setDescription("Sends an announcement embed.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("Announcement title.")
          .setRequired(true)
          .setMaxLength(256)
      )
      .addStringOption((option) =>
        option
          .setName("description")
          .setDescription("Announcement description.")
          .setRequired(true)
          .setMaxLength(4000)
      ),
    new SlashCommandBuilder()
      .setName("remind")
      .setDescription("Sets a personal reminder.")
      .addStringOption((option) =>
        option
          .setName("time")
          .setDescription("Reminder time like 30s, 10m, 2h, 1d.")
          .setRequired(true)
          .setMaxLength(20)
      )
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("What the bot should remind you about.")
          .setRequired(true)
          .setMaxLength(500)
      ),
    new SlashCommandBuilder()
      .setName("role")
      .setDescription("Gives a role to a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to give the role to.")
          .setRequired(true)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to give.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("premot")
      .setDescription("Promotes a member by giving them a role.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to promote.")
          .setRequired(true)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to give.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("removerole")
      .setDescription("Removes a role from a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to remove the role from.")
          .setRequired(true)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to remove.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("nick")
      .setDescription("Changes a member's nickname.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose nickname should change.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("nickname")
          .setDescription("The new nickname.")
          .setRequired(true)
          .setMaxLength(32)
      ),
    new SlashCommandBuilder()
      .setName("8ball")
      .setDescription("Asks the magic 8-ball a question.")
      .addStringOption((option) =>
        option
          .setName("question")
          .setDescription("Your question.")
          .setRequired(true)
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("dice")
      .setDescription("Rolls a dice.")
      .addIntegerOption((option) =>
        option
          .setName("sides")
          .setDescription("How many sides the dice should have.")
          .setMinValue(2)
          .setMaxValue(1000)
      ),
    new SlashCommandBuilder()
      .setName("uptime")
      .setDescription("Shows how long the bot has been running."),
    new SlashCommandBuilder()
      .setName("botinfo")
      .setDescription("Shows information about the bot."),
    new SlashCommandBuilder()
      .setName("afk")
      .setDescription("Sets your AFK status.")
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Why you are AFK.")
          .setMaxLength(200)
      ),
    new SlashCommandBuilder()
      .setName("snipe")
      .setDescription("Shows the most recently deleted cached message in this channel."),
    new SlashCommandBuilder()
      .setName("hug")
      .setDescription("Send a hug to another user.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to hug.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("ship")
      .setDescription("Ships two users together.")
      .addUserOption((option) =>
        option
          .setName("user_one")
          .setDescription("First user.")
          .setRequired(true)
      )
      .addUserOption((option) =>
        option
          .setName("user_two")
          .setDescription("Second user. Defaults to you.")
      ),
    new SlashCommandBuilder()
      .setName("meme")
      .setDescription("Fetches a random meme."),
    new SlashCommandBuilder()
      .setName("suggest")
      .setDescription("Posts a server suggestion.")
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("Your suggestion.")
          .setRequired(true)
          .setMaxLength(1000)
      ),
    new SlashCommandBuilder()
      .setName("daily")
      .setDescription("Collect your daily coins."),
    new SlashCommandBuilder()
      .setName("work")
      .setDescription("Work for some coins."),
    new SlashCommandBuilder()
      .setName("beg")
      .setDescription("Beg for a few coins."),
    new SlashCommandBuilder()
      .setName("balance")
      .setDescription("Shows a coin balance.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose balance you want to see.")
      ),
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("Shows the richest users in this server."),
    new SlashCommandBuilder()
      .setName("pay")
      .setDescription("Send coins to another user.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user who should receive the coins.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("How many coins to send.")
          .setRequired(true)
          .setMinValue(1)
      ),

    new SlashCommandBuilder()
      .setName("unwarn")
      .setDescription("Removes a warning from a user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose warning should be removed.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("index")
          .setDescription("The warning number to remove.")
          .setRequired(true)
          .setMinValue(1)
      ),
    new SlashCommandBuilder()
      .setName("history")
      .setDescription("Shows moderation history for a user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to inspect.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("nickreset")
      .setDescription("Resets a member's nickname.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose nickname should be reset.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("shop")
      .setDescription("Shows the shop items."),
    new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Buys an item from the shop.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("The item id to buy.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("How many items to buy.")
          .setMinValue(1)
      ),
    new SlashCommandBuilder()
      .setName("inventory")
      .setDescription("Shows an inventory.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose inventory you want to see.")
      ),
    new SlashCommandBuilder()
      .setName("bank")
      .setDescription("Shows a bank balance.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user whose bank you want to see.")
      ),
    new SlashCommandBuilder()
      .setName("deposit")
      .setDescription("Deposits wallet coins into the bank.")
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("How many coins to deposit.")
          .setRequired(true)
          .setMinValue(1)
      ),
    new SlashCommandBuilder()
      .setName("withdraw")
      .setDescription("Withdraws coins from the bank.")
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("How many coins to withdraw.")
          .setRequired(true)
          .setMinValue(1)
      ),
    new SlashCommandBuilder()
      .setName("interest")
      .setDescription("Claims bank interest."),
    new SlashCommandBuilder()
      .setName("economy-admin")
      .setDescription("Manages user economy balances.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("What to do.")
          .setRequired(true)
          .addChoices(
            { name: "Set Wallet", value: "set_wallet" },
            { name: "Add Wallet", value: "add_wallet" },
            { name: "Remove Wallet", value: "remove_wallet" },
            { name: "Set Bank", value: "set_bank" }
          )
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The target user.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount to use.")
          .setRequired(true)
          .setMinValue(0)
      ),
    new SlashCommandBuilder()
      .setName("profile")
      .setDescription("Shows a community profile.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to inspect.")
      ),
    new SlashCommandBuilder()
      .setName("marry")
      .setDescription("Marries another user.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to marry.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("divorce")
      .setDescription("Ends your current marriage."),
    new SlashCommandBuilder()
      .setName("streak")
      .setDescription("Shows a daily streak.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to inspect.")
      ),
    new SlashCommandBuilder()
      .setName("vouch")
      .setDescription("Leaves a vouch for a user.")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user you want to vouch for.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("Why you vouch for this user.")
          .setRequired(true)
          .setMaxLength(300)
      ),
    new SlashCommandBuilder()
      .setName("reactionrole-panel")
      .setDescription("Creates a reaction role button panel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to toggle.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("label")
          .setDescription("The button label.")
          .setRequired(true)
          .setMaxLength(80)
      )
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("Panel description.")
          .setRequired(false)
          .setMaxLength(500)
      ),
    new SlashCommandBuilder()
      .setName("selfrole-panel")
      .setDescription("Sends the configured self-role panel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    new SlashCommandBuilder()
      .setName("starboard-setup")
      .setDescription("Sets the starboard channel and threshold.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The starboard channel.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("threshold")
          .setDescription("How many ? reactions are needed.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
      ),
    new SlashCommandBuilder()
      .setName("backup-export")
      .setDescription("Exports the bot data files.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("health")
      .setDescription("Shows bot health information."),
    new SlashCommandBuilder()
      .setName("reaction-rolls-configure")
      .setDescription("Configure reaction rolls for quick draws.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Action to perform.")
          .setRequired(true)
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
            { name: "List", value: "list" }
          )
      )
      .addStringOption((option) =>
        option.setName("key").setDescription("Unique key for this roll (required for add/remove)")
      )
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel containing the message for the roll")
      )
      .addStringOption((option) =>
        option.setName("message_id").setDescription("Message ID to use for the roll")
      )
      .addIntegerOption((option) =>
        option.setName("winners").setDescription("Number of winners to draw").setMinValue(1)
      ),
    new SlashCommandBuilder()
      .setName("reaction-rolls-draw")
      .setDescription("Draw winners for a configured reaction roll or a specific message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option.setName("key").setDescription("Configured key to draw (optional)")
      )
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel containing the message to draw from")
      )
      .addStringOption((option) =>
        option.setName("message_id").setDescription("Message ID to draw from (optional if using key)")
      )
      .addIntegerOption((option) =>
        option.setName("winners").setDescription("Number of winners to pick (overrides configured)")
      ),
    new SlashCommandBuilder()
      .setName("self-rolls")
      .setDescription("Configure reaction role mappings (assign/remove role on emoji)")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Action to perform")
          .setRequired(true)
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
            { name: "List", value: "list" }
          )
      )
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel containing the message for the mapping")
      )
      .addStringOption((option) =>
        option.setName("message_id").setDescription("Message ID to attach the reaction-role to")
      )
      .addStringOption((option) =>
        option.setName("emoji").setDescription("Emoji to listen for (unicode or <:name:id> format)")
      )
      .addRoleOption((option) =>
        option.setName("role").setDescription("Role to assign/remove when emoji is reacted")
      ),
    new SlashCommandBuilder()
      .setName("matenence")
      .setDescription("Toggle bot maintenance mode (owner only)")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("on to enable, off to disable")
          .setRequired(true)
          .addChoices(
            { name: "On", value: "on" },
            { name: "Off", value: "off" }
          )
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Optional maintenance status message")
      ),
    new SlashCommandBuilder()
      .setName("giveaway-blacklist")
      .setDescription("Manages the giveaway blacklist.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("What to do.")
          .setRequired(true)
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
            { name: "List", value: "list" }
          )
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user to add or remove.")
      ),
    new SlashCommandBuilder()
      .setName("giveaway-settings")
      .setDescription("Sets giveaway join requirements.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption((option) =>
        option
          .setName("required_role")
          .setDescription("Role required to join giveaways.")
      )
      .addRoleOption((option) =>
        option
          .setName("bonus_role")
          .setDescription("Role with bonus entries.")
      )
      .addIntegerOption((option) =>
        option
          .setName("bonus_entries")
          .setDescription("How many extra entries the bonus role gets.")
          .setMinValue(0)
          .setMaxValue(20)
      )
      .addBooleanOption((option) =>
        option
          .setName("clear")
          .setDescription("Clear all giveaway settings.")
      ),
    new SlashCommandBuilder()
      .setName("giveaway-schedule")
      .setDescription("Schedules a giveaway for later.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("prize")
          .setDescription("The giveaway prize.")
          .setRequired(true)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("duration")
          .setDescription("The giveaway duration like 1h or 1d.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("winners")
          .setDescription("How many winners.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
      )
      .addStringOption((option) =>
        option
          .setName("start_in")
          .setDescription("When to start it, like 10m or 2h.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("fastclick")
      .setDescription("Starts a fast click game.")
      .addStringOption((option) =>
        option
          .setName("prize")
          .setDescription("The prize for the winner.")
          .setRequired(true)
          .setMaxLength(100)
      ),
    new SlashCommandBuilder()
      .setName("minigame")
      .setDescription("Play a small game.")
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("Which game you want to play.")
          .setRequired(true)
          .addChoices(
            { name: "Guess the Number", value: "number" },
            { name: "Rock Paper Scissors", value: "rps" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("number")
          .setDescription("Your guess from 1 to 10.")
          .setMinValue(1)
          .setMaxValue(10)
      )
      .addStringOption((option) =>
        option
          .setName("choice")
          .setDescription("Your choice for Rock Paper Scissors.")
          .addChoices(
            { name: "Scissors", value: "scissors" },
            { name: "Rock", value: "rock" },
            { name: "Paper", value: "paper" }
          )
      )
      .addUserOption((option) =>
        option
          .setName("opponent")
          .setDescription("The user you want to challenge in Rock Paper Scissors.")
      ),
    new SlashCommandBuilder()
      .setName("giveaway-create")
      .setDescription("Creates a giveaway with a UI.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("giveaway-reroll")
      .setDescription("Rerolls winners for a giveaway.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("message_id")
          .setDescription("The message ID of the giveaway.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("gping")
      .setDescription("Sends a sponsor ping message for a giveaway type.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("The giveaway type to ping for.")
          .setRequired(true)
          .addChoices(
            { name: "Quickdrop", value: "qd" },
            { name: "Extra Giveaway", value: "extra" },
            { name: "Daily Giveaway", value: "daily" },
            { name: "Weekly Giveaway", value: "weekly" }
          )
      )
      .addRoleOption((option) =>
        option
          .setName("sponsor")
          .setDescription("The role to mention in the giveaway ping.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("gpingqd")
      .setDescription("Sends the Quickdrop sponsor ping message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("The role to mention in the Quickdrop ping.")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("gping-extra")
      .setDescription("Sends the extra giveaway sponsor ping message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("gping-daily")
      .setDescription("Sends the daily giveaway sponsor ping message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("gping-weekly")
      .setDescription("Sends the weekly giveaway sponsor ping message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("ticket-panel")
      .setDescription("Sends the ticket panel to the current channel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("ticket")
      .setDescription("Manages the current ticket.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Adds a user to the current ticket.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The user to add to this ticket.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("Removes a user from the current ticket.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The user to remove from this ticket.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("rename")
          .setDescription("Renames the current ticket channel.")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("The new channel name.")
              .setRequired(true)
              .setMaxLength(90)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("relode")
          .setDescription("Reloads the current ticket panel message.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("claim")
          .setDescription("Claims the current ticket.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("unclaim")
          .setDescription("Unclaims the current ticket.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("transcript")
          .setDescription("Exports the current ticket transcript.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("move")
          .setDescription("Moves the current ticket to another category.")
          .addStringOption((option) =>
            option
              .setName("category_id")
              .setDescription("The category ID to move the ticket into.")
              .setRequired(true)
              .setMaxLength(30)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("priority")
          .setDescription("Sets a ticket priority.")
          .addStringOption((option) =>
            option
              .setName("level")
              .setDescription("The priority level.")
              .setRequired(true)
              .addChoices(
                { name: "Low", value: "low" },
                { name: "Medium", value: "medium" },
                { name: "High", value: "high" },
                { name: "Urgent", value: "urgent" }
              )
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("tag")
          .setDescription("Adds or updates a ticket tag.")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("The tag text.")
              .setRequired(true)
              .setMaxLength(50)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("note")
          .setDescription("Adds a private staff note to the ticket.")
          .addStringOption((option) =>
            option
              .setName("text")
              .setDescription("The private staff note.")
              .setRequired(true)
              .setMaxLength(500)
          )
      ),
    new SlashCommandBuilder()
      .setName("onbehalf")
      .setDescription("Opens any ticket type for another user.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("The user the ticket should be opened for.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("category")
          .setDescription("Which ticket category to open.")
          .setRequired(true)
          .addChoices(
            { name: "Claim Giveaway", value: "claim-giveaway" },
            { name: "Report Someone", value: "report-someone" },
            { name: "Sponsor Giveaway", value: "sponsor-giveaway" },
            { name: "Partner Request", value: "partner-request" },
            { name: "Support", value: "support" }
          )
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason or extra note for the ticket.")
          .setRequired(false)
          .setMaxLength(500)
      )
      .addStringOption((option) =>
        option
          .setName("giveaway_host")
          .setDescription("Claim Giveaway: who made the giveaway?")
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("win_amount")
          .setDescription("Claim Giveaway: how much was won?")
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("ign")
          .setDescription("Claim Giveaway: the Minecraft IGN.")
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("report_target")
          .setDescription("Report Someone: who should be reported?")
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("proof")
          .setDescription("Report Someone: optional proof.")
          .setRequired(false)
          .setMaxLength(500)
      )
      .addStringOption((option) =>
        option
          .setName("amount")
          .setDescription("Sponsor Giveaway: sponsored amount.")
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption((option) =>
        option
          .setName("dc_link")
          .setDescription("Partner Request: Discord link.")
          .setRequired(false)
          .setMaxLength(200)
      )
      .addStringOption((option) =>
        option
          .setName("member_count")
          .setDescription("Partner Request: member count.")
          .setRequired(false)
          .setMaxLength(50)
      ),
    new SlashCommandBuilder()
      .setName("invest-panel")
      .setDescription("Sends the invest panel to the current channel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("invest")
      .setDescription("Manages the current investment ticket.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName("view")
          .setDescription("Shows the current investment values.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("refresh")
          .setDescription("Refreshes the current investment ticket embed.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set")
          .setDescription("Sets the start investment and daily percent.")
          .addStringOption((option) =>
            option
              .setName("amount")
              .setDescription("Start investment, e.g. 10M")
              .setRequired(true)
              .setMaxLength(100)
          )
          .addStringOption((option) =>
            option
              .setName("daily_percent")
              .setDescription("Daily percent, e.g. 5 or 5%")
              .setRequired(true)
              .setMaxLength(20)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Adds more investment and restarts day tracking from the new total.")
          .addStringOption((option) =>
            option
              .setName("amount")
              .setDescription("Amount to add, e.g. 1M")
              .setRequired(true)
              .setMaxLength(100)
          )
      ),
    new SlashCommandBuilder()
      .setName("ticket-close")
      .setDescription("Closes the current ticket.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
new SlashCommandBuilder()
      .setName("application-panel")
      .setDescription("Manages the application panel and application state.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName("send")
          .setDescription("Sends the application panel to the current channel.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("open")
          .setDescription("Opens applications.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("close")
          .setDescription("Closes applications.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("status")
          .setDescription("Shows whether applications are open or closed.")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set-title")
          .setDescription("Changes the application panel title.")
          .addStringOption((option) =>
            option
              .setName("text")
              .setDescription("The new title.")
              .setRequired(true)
              .setMaxLength(200)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set-description")
          .setDescription("Changes the application panel description.")
          .addStringOption((option) =>
            option
              .setName("text")
              .setDescription("The new description.")
              .setRequired(true)
              .setMaxLength(4000)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add-question")
          .setDescription("Adds an application question.")
          .addStringOption((option) =>
            option
              .setName("text")
              .setDescription("The question text.")
              .setRequired(true)
              .setMaxLength(300)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove-question")
          .setDescription("Removes an application question by number.")
          .addIntegerOption((option) =>
            option
              .setName("index")
              .setDescription("Question number, starting at 1.")
              .setRequired(true)
              .setMinValue(1)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add-role")
          .setDescription("Adds an application role.")
          .addRoleOption((option) =>
            option
              .setName("role")
              .setDescription("The Discord role to assign on accept.")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("label")
              .setDescription("The label users will see.")
              .setRequired(true)
              .setMaxLength(100)
          )
          .addStringOption((option) =>
            option
              .setName("key")
              .setDescription("Optional internal key.")
              .setRequired(false)
              .setMaxLength(100)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove-role")
          .setDescription("Removes an application role by key.")
          .addStringOption((option) =>
            option
              .setName("key")
              .setDescription("The role key to remove.")
              .setRequired(true)
              .setMaxLength(100)
          )
      ),
    new ContextMenuCommandBuilder()
      .setName("Reroll Giveaway")
      .setType(ApplicationCommandType.Message)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  ].map((command) => command.toJSON());
}

module.exports = {
  buildCommands
};

