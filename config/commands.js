/* eslint-disable @typescript-eslint/no-var-requires */
const { SlashCommandBuilder } = require("discord.js");

module.exports = [
    {
        name: "ping",
        description: "Replies with pong!"
    },
    new SlashCommandBuilder()
        .setName("channel")
        .setDescription("The warhorn will sound in the channel where this command is issued")
];
