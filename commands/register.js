const { SlashCommandBuilder } = require('@discordjs/builders');
const { readFile, writeFile, mkdir } = require('fs/promises');
const { dirname } = require('path');
const { registered_users_file } = require('../config.json');


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
			let json_data = [];

			try {
				const json_data_string = await readFile(registered_users_file);

				json_data = JSON.parse(json_data_string);
			} catch (error) {
				if (error.code === 'ENOENT') {
					console.log(`${registered_users_file} does not exist, will be created.`);
					await mkdir(dirname(registered_users_file), { recursive: true });
				}
				else
					throw error;
			}

			const server_object = json_data.find(element => element.server === interaction.guildId);

			const trackmania_id = interaction.options.getString('tm_id');

			const user_obj = {
				discord_id: interaction.user.id,
				trackmania_id: trackmania_id
			};

			if (server_object === undefined)
				json_data.push({ server: interaction.guildId, users: [user_obj] })
			else {
				if (server_object.users.find(obj => obj.discord_id === interaction.user.id) === undefined)
					server_object.users.push(user_obj);
				else {
					console.log(`User already registered.`);
					await interaction.reply({ content: 'User already registered.', ephemeral: true });
					return;
				}
			}


			const new_json_data = JSON.stringify(json_data);

			await writeFile(registered_users_file, new_json_data);

			await interaction.reply({ content: 'User successfully registered.', ephemeral: true });
			console.log('User successfully registered.')
		} catch (error) {
			console.log(`Error registering user: ${error}`);
			await interaction.reply({ content: 'Error: could not register user.', ephemeral: true });
			return;
		}
	},
};
