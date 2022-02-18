const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('hefest')
		.setDescription('But then, Hefest got this run...'),
	async execute(interaction) {
		await interaction.reply('https://www.youtube.com/watch?v=hfLecAWFQIc');
	},
};
