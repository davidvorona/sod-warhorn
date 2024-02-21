import { Client, IntentsBitField, Events, EmbedBuilder, REST, Routes } from "discord.js";
import { DateTime, Duration } from "luxon";
import path from "path";
import { parseJson, readFile } from "./util";
import { AuthJson, ConfigJson, Event } from "./types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const commands = require("../config/commands");

const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;
const configPath = path.join(__dirname, "../config/config.json");
const { CLIENT_ID } = parseJson(readFile(configPath)) as ConfigJson;


const rest = new REST().setToken(TOKEN);

const events: Event[] = [
    {
        name: "Battle for Ashenvale",
        offsetHr: 1, // Starts at 1am
        intervalHr: 3
    },
    {
        name: "The Blood Moon",
        offsetHr: 0, // Starts at 12am
        intervalHr: 3
    }
];

class HornSounder {
    name: string;

    offsetHr: number;

    intervalHr: number;

    timeout: unknown;

    constructor(client: Client, event: Event) {
        this.name = event.name;
        this.offsetHr = event.offsetHr;
        this.intervalHr = event.intervalHr;
    }

    schedule() {
        const timeToEvent = this.timeToNextEvent();
        console.info(this.name, "in", timeToEvent.toHuman({ unitDisplay: "short" }));
        const soundHorn = this.soundHorn.bind(this);
        this.timeout = setTimeout(soundHorn, 10000/*timeToEvent.toMillis()*/);
    }

    private timeToNextEvent(): Duration {
        // Get the current time
        const time = DateTime.now();
        // Adjust by the offset and get the remaining hours until next event
        const remainder = (this.offsetHr + time.hour) % this.intervalHr;
        // The hours to the next event is just the remainder, unless the remainder is 0;
        // in this case it is equal to the interval length, e.g. for a 3hr interval event,
        // if the current hour is 12pm, and the remainder is 0, then the event happens
        // at 12pm and the hours to next event is 3, AKA the interval length.
        const hoursToEvent = remainder ? remainder : this.intervalHr;
        // The hour of the event is just the current hour plus the value calculated above
        const hourOfEvent = time.hour + hoursToEvent;
        // Calculate the duration between now and the hour of the event
        const eventTime = DateTime.now().set({ hour: hourOfEvent, minute: 0, second: 0, millisecond: 0 });
        return eventTime.diffNow(["hours", "minutes", "seconds", "milliseconds"]);
    }

    private async soundHorn() {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`**${this.name}** is starting!`)
            .setThumbnail("https://raw.githubusercontent.com/davidvorona/sod-warhorn/master/static/alliance.png");
        const rallyTroops = client.guilds.cache.map(async (g) => {
            await g.systemChannel?.send({ embeds: [embed]});
        });
        await Promise.all(rallyTroops);
        this.schedule();
    }
}

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
        if (interaction.isChatInputCommand()) {
            console.info(
                `Processing command '${interaction.commandName}'`,
                "with options", interaction.options
            );
    
            if (interaction.commandName === "ping") {
                await interaction.reply("pong!");
            }
        }
    } catch (err) {
        console.error(err);
    }
});

client.login(TOKEN);
