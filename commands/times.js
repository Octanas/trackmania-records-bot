const { SlashCommandBuilder } = require('@discordjs/builders');
const { readFile } = require('fs/promises');
const { get_medal, millisecondsToTime } = require('../utils');
const { get_times, get_season_info, get_maps_info } = require('../tm-endpoints');
const { current_season_id, registered_users_file } = require('../config.json');

let maps = []

module.exports = {
	data: new SlashCommandBuilder()
		.setName('times')
		.setDescription('Show all times of current season.'),
	async execute(interaction) {
		try {
			if (maps.length === 0) {
				const season_info = await get_season_info(current_season_id);

				if (season_info === null) {

					await interaction.reply('Error: could not return times');
					return;
				}

				const map_ids = [];

				for (const map_info of season_info.seasonMapList) {
					map_ids.push(map_info.mapId);
				}

				const maps_info = await get_maps_info(map_ids);

				if (maps_info === null) {

					await interaction.reply('Error: could not return times');
					return;
				}

				for (const map_info of maps_info) {
					maps.push({ id: map_info.mapId, name: map_info.name });
				}

				maps.sort((a, b) => {
					if (a.name < b.name)
						return -1;

					if (a.name > b.name) {
						return 1;
					}

					return 0;
				});
			}

			let registered_users_json_data = [];

			try {
				const json_data_string = await readFile(registered_users_file);

				registered_users_json_data = JSON.parse(json_data_string);
			} catch (error) {
				if (error.code === 'ENOENT') {
					console.log('Could not retrieve times, no registered users.');
					await interaction.reply('Could not retrieve times, no registered users.');
					return;
				}
				else
					throw error;
			}

			const registered_users_server_object = registered_users_json_data.find(element => element.server === interaction.guildId);

			if (registered_users_server_object === undefined || registered_users_server_object.users.length === 0) {
				console.log('Could not retrieve times, no registered users.');
				await interaction.reply('Could not retrieve times, no registered users.');
				return;
			}

			const players = registered_users_server_object.users;

			const players_tm_ids = players.map(obj => obj.trackmania_id);

			const json_times_content = await get_times(current_season_id, players_tm_ids);

			const times = maps.map(obj => {
				return {
					map_id: obj.id,
					map_name: obj.name,
					times: players.map(player => {
						return {
							player_discord_id: player.discord_id,
							player_trackmania_id: player.trackmania_id,
							time: -1
						};
					})
				};
			});

			for (const time_content of json_times_content) {
				const times_map = times.find(elem => elem.map_id === time_content.mapId);

				if (times_map === undefined)
					continue;

				const times_map_player = times_map.times.find(elem => elem.player_trackmania_id === time_content.accountId);

				if (times_map_player === undefined)
					continue;

				times_map_player.time = time_content.recordScore.time;
			}

			let fullMsg = '';

			let response_sent = false;

			for (const times_map of times) {
				let msg = `**${times_map.map_name}**`;

				if (times_map.times.every(t => t.time === -1)) {
					msg += ` - No set times`;
				} else {
					msg += '\n';

					times_map.times.sort((player1, player2) => {
						if (player1.time === -1)
							return 1;

						if (player2.time === -1) {
							return -1
						}

						return player1.time - player2.time;
					});

					for (const [index, times_map_player] of times_map.times.entries()) {
						if (times_map_player.time === -1) {
							msg += `${get_medal(0)} <@${times_map_player.player_discord_id}>: N/A\n`;
						}
						else {
							msg += `${get_medal(index + 1)} <@${times_map_player.player_discord_id}>: ${millisecondsToTime(times_map_player.time)}\n`;
						}

					}
				}

				if (fullMsg.length + `${msg}`.length >= 2000) {
					if (response_sent)
						await interaction.followUp({
							content: fullMsg,
							allowedMentions: { parse: [] },
						});
					else
						await interaction.reply({
							content: fullMsg,
							allowedMentions: { parse: [] },
						});

					fullMsg = '';
					response_sent = true;
				}

				fullMsg += `${msg}\n`;
			}

			if (response_sent)
				await interaction.followUp({
					content: fullMsg,
					allowedMentions: { parse: [] },
				});
			else
				await interaction.reply({
					content: fullMsg,
					allowedMentions: { parse: [] },
				});
		} catch (error) {
			console.log(`Error retrieving times: ${error}`);
			await interaction.reply('Error: could not return times');
			return;
		}
	},
};
