import { Client, IntentsBitField, Events, EmbedBuilder, REST, Routes, TextChannel } from "discord.js";
import { DateTime, Settings } from "luxon";
import path from "path";
import { parseJson, readFile } from "./util";
import { AuthJson, ConfigJson, Event } from "./types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const commands = require("../config/commands");

const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;
const configPath = path.join(__dirname, "../config/config.json");
const { CLIENT_ID } = parseJson(readFile(configPath)) as ConfigJson;

// Crusader Strike ST = Mountain Standard Time
Settings.defaultZone = "America/Denver";

// Initialize Discord REST client
const rest = new REST().setToken(TOKEN);

const events: Event[] = [
    {
        name: "The Blood Moon",
        offsetHr: 0, // Starts at 12am
        intervalHr: 3,
        lengthHr: 0.5,
        region: "Stranglethorn Vale",
        color: 0xFF0000
    },
    {
        name: "Battle for Ashenvale",
        offsetHr: 1, // Starts at 1am
        intervalHr: 3,
        lengthHr: 0.5,
        region: "Ashenvale",
        color: 0x0099FF
    }
];

class HornSounder {
    name: string;

    offsetHr: number;

    intervalHr: number;

    timeout: unknown;

    lengthHr: number;
    
    region: string;

    color: number;

    client: Client;

    constructor(client: Client, event: Event, ) {
        this.client = client;
        this.name = event.name;
        this.offsetHr = event.offsetHr;
        this.intervalHr = event.intervalHr;
        this.lengthHr = event.lengthHr;
        this.region = event.region;
        this.color = event.color;
    }

    schedule() {
        const eventTime = this.getTimeOfNextEvent();
        // Calculate the duration between now and the hour of the event
        const timeToEvent = eventTime.diffNow(["hours", "minutes", "seconds", "milliseconds"]);
        console.info(this.name, "in", timeToEvent.toHuman({ unitDisplay: "short" }));
        const soundHorn = this.soundHorn.bind(this);
        // Sound the horns 15 minutes before the event starts
        const timeToHornSound = timeToEvent.minus({ minutes: 15 }).toMillis();
        this.timeout = setTimeout(() => soundHorn(eventTime), timeToHornSound);
    }

    private getTimeOfNextEvent(): DateTime {
        // Get the current time
        const time = DateTime.now();
        // Get the remaining hours until next event then adjust by the offset
        const hoursToEvent = this.intervalHr - (time.hour % this.intervalHr) + this.offsetHr;
        const hourOfEvent = time.hour + hoursToEvent;
        // Return a DateTime object set to the hour of the event
        return DateTime.now().set({ hour: hourOfEvent, minute: 0, second: 0, millisecond: 0 });
    }

    private static decorateTimeString(timeString: string): string {
        return timeString + " (ST)";
    }

    private createMessageEmbed(time: DateTime): EmbedBuilder {
        const startsAt = HornSounder.decorateTimeString(time.toLocaleString(DateTime.TIME_SIMPLE));
        const endsAt = HornSounder.decorateTimeString(
            time.plus({ hours: this.lengthHr }).toLocaleString(DateTime.TIME_SIMPLE)
        );
        return new EmbedBuilder()
            .setColor(this.color)
            .setDescription(`**${this.name}** is starting soon!`)
            .setThumbnail("https://raw.githubusercontent.com/davidvorona/sod-warhorn/master/static/icon.png")
            .addFields(
                { name: "Region", value: this.region },
                { name: "Starts at", value: startsAt, inline: true },
                { name: "Ends at", value: endsAt, inline: true },
            );
    }

    private async soundHorn(eventTime: DateTime) {
        const embed = this.createMessageEmbed(eventTime);
        const rallyTroops = this.client.guilds.cache.map(async (g) => {
            const channel = g.channels.cache.find(c => c.id === guildChannels[g.id]) || g.systemChannel;
            if (!channel || !(channel instanceof TextChannel)) {
                console.warn("Invalid channel", channel?.id, `for guild '${g.id}'`);
                return;
            }
            await channel?.send({ embeds: [embed] });
        });
        await Promise.all(rallyTroops);
        this.schedule();
    }
}

const guildChannels: Record<string, string> = {};

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds
    ]
});

client.on(Events.ClientReady, async () => {
    try {
        if (client.user) {
            console.info("Logged in as", client.user.tag);
        }
        if (client.application) {
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
            events.forEach((event) => {
                const hs = new HornSounder(client, event);
                hs.schedule();
            });
        }
    } catch (err) {
        console.error(err);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        console.info(
            `Processing command '${interaction.commandName}'`,
            "with options", interaction.options
        );

        if (interaction.commandName === "ping") {
            await interaction.reply("pong!");
        }
        if (interaction.commandName === "channel") {
            if (!interaction.guildId) {
                await interaction.reply({
                    content: "You must use this command in a server channel.",
                    ephemeral: true
                });
                return;
            }
            // Save the channel ID in the guildsChannels map
            guildChannels[interaction.guildId] = interaction.channelId;
            // Send the success message
            await interaction.reply({
                content: "Warhorn will now sound in this channel.",
                ephemeral: true
            });
        }
    } catch (err) {
        console.error(err);
    }
});

client.login(TOKEN);
