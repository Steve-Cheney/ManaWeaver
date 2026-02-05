import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

const commandsData = Object.values(commands).map((command) =>
    command.data.toJSON()
);

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

type DeployCommandsProps = {
    guildId?: string;
};

export async function deployCommands({ guildId }: DeployCommandsProps = {}) {
    try {
        const scope = guildId ? `guild ${guildId}` : "global";
        console.log(`Deploying application (/) commands (${scope})…`);

        if (guildId) {
            await rest.put(
                Routes.applicationGuildCommands(
                    config.DISCORD_CLIENT_ID,
                    guildId
                ),
                { body: commandsData }
            );
        } else {
            await rest.put(
                Routes.applicationCommands(config.DISCORD_CLIENT_ID),
                { body: commandsData }
            );
        }

        console.log("Successfully deployed application (/) commands.");
    } catch (error) {
        console.error("Failed to deploy commands:", error);
    }
}
