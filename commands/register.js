const { SlashCommandBuilder } = require('@discordjs/builders');
const { database } = require('../db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Register to get your times shown.')
		.addStringOption(option =>
			option.setName('tm_id')
				.setDescription('Enter your Trackmania User ID.')
				.setRequired(true)

		),
	async execute(interaction) {
		try {
			const dbClient = database.client;

			if (dbClient === null) {
				throw new Error(`Database connection not established.`);
			}

			const add_server_query = {
				text: 'INSERT INTO server (discord_id) VALUES ($1) ON CONFLICT DO NOTHING',
				values: [interaction.guildId]
			};

			const add_server_result = await dbClient.query(add_server_query);

			if (add_server_result.rowCount === 1) {
				console.log(`Added new server (id ${interaction.guildId}).`);
			}

			const trackmania_id = interaction.options.getString('tm_id');

			const add_player_query = {
				text: 'INSERT INTO player (discord_id, trackmania_id, server_id) ' +
					'VALUES ($1, $2, $3) ' +
					'ON CONFLICT ON CONSTRAINT pk_player DO UPDATE SET trackmania_id = EXCLUDED.trackmania_id ' +
					'RETURNING xmax:: text:: int > 0 AS updated;',
				values: [interaction.user.id, trackmania_id, interaction.guildId]
			};

			const add_player_result = await dbClient.query(add_player_query);

			if (add_player_result.rowCount === 1) {
				if (add_player_result.rows[0].updated) {
					console.log(`User registration updated (id ${interaction.user.id}) on server with id ${interaction.guildId}.`);
					await interaction.reply({ content: 'User registration updated.', ephemeral: true });
				} else {
					console.log(`User successfully registered (id ${interaction.user.id}) on server with id ${interaction.guildId}.`)
					await interaction.reply({ content: 'User successfully registered.', ephemeral: true });
				}
			} else {
				throw new Error(`No rows were affected on the database 'player' table`);
			}
		} catch (error) {
			console.log(`Error registering user (id ${interaction.user.id}): ${error}`);
			await interaction.reply({ content: 'Error: could not register user.', ephemeral: true });
			return;
		}
	},
};
