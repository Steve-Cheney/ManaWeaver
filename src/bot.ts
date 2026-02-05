import { Client } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import { deployCommands } from "./deploy-commands.js";

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

client.once("clientReady", async () => {
    console.log("ManaWeaver is ready!");

    if (config.DEV_GUILD_ID) {
        // DEV: instant command updates
        await deployCommands({ guildId: config.DEV_GUILD_ID });
    } else {
        // PROD: usable in any server (may take up to ~1 hour to propagate)
        await deployCommands();
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const handler = commands[interaction.commandName as keyof typeof commands];
    if (handler) {
        await handler.execute(interaction);
    }
});

client.login(config.DISCORD_TOKEN);
