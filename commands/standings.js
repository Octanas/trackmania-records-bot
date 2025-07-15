const { SlashCommandBuilder } = require('@discordjs/builders');
const { get_medal, millisecondsToTime } = require('../utils');
const { get_times, get_season_info, get_maps_info } = require('../tm-endpoints');
const { database } = require('../db');

let maps = []

module.exports = {
	data: new SlashCommandBuilder()
		.setName('standings')
		.setDescription('Show the standings for the current season.'),
	async execute(interaction) {
		try {
			if (maps.length === 0) {
				const season_info = await get_season_info(process.env.CURRENT_SEASON_ID);

				if (season_info === null) {

					await interaction.reply('Error: could not return standings');
					return;
				}

				const map_ids = [];

				for (const map_info of season_info.seasonMapList) {
					map_ids.push(map_info.mapId);
				}

				const maps_info = await get_maps_info(map_ids);

				if (maps_info === null) {

					await interaction.reply('Error: could not return standings');
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

			const dbClient = database.client;

			if (dbClient === null) {
				throw new Error(`Database connection not established.`);
			}

			const get_players_query = {
				text: 'SELECT discord_id, trackmania_id FROM player ' +
					'WHERE server_id = $1',
				values: [interaction.guildId]
			};

			const get_players_result = await dbClient.query(get_players_query);

			if (get_players_result.rowCount == 0) {
				console.log(`Could not retrieve standings, no registered users in server with id ${interaction.guildId}.`);
				await interaction.reply('Could not retrieve standings, no registered users.');
				return;
			}

			const players = get_players_result.rows;

			const players_tm_ids = players.map(obj => obj.trackmania_id);

			let times = [];
			
			for (const map of maps)
			{
				const json_times_content = await get_times(map.id, players_tm_ids);
				
				let time_obj = {
					map_id: map.id,
					map_name: map.name,
					times: players.map(player => {
						return {
							player_discord_id: player.discord_id,
							player_trackmania_id: player.trackmania_id,
							time: -1
						};
					})
				};
				
				for (const time_content of json_times_content) {
					const times_map_player = time_obj.times.find(elem => elem.player_trackmania_id === time_content.accountId);
					
					if (times_map_player === undefined)
						continue;
					
					times_map_player.time = time_content.recordScore.time;
				}

				times.push(time_obj);
			}

			let fullMsg = '';

			let response_sent = false;

			const player_standings = players.map((obj => {
				return {
					discord_id: obj.discord_id,
					first_places: 0,
					second_places: 0,
					third_places: 0
				};
			}))

			for (const times_map of times) {
				times_map.times.sort((player1, player2) => {
					if (player1.time === -1)
						return 1;

					if (player2.time === -1) {
						return -1
					}

					return player1.time - player2.time;
				});

				for (const [index, times_map_player] of times_map.times.entries()) {
					if (times_map_player.time !== -1) {
						const player = player_standings.find(elem => elem.discord_id === times_map_player.player_discord_id);

						if (index === 0)
							player.first_places += 1;
						else if (index === 1)
							player.second_places += 1;
						else if (index === 2)
							player.third_places += 1;
					}
				}
			}

			player_standings.sort((player1, player2) => {
				const player1_score = player1.first_places * 3 + player1.second_places * 2 + player1.third_places * 1;
				const player2_score = player2.first_places * 3 + player2.second_places * 2 + player2.third_places * 1;

				return player2_score - player1_score;
			});

			for (const [index, player] of player_standings.entries()) {
				let msg = '';

				msg += `**${index + 1}º - <@${player.discord_id}>**\n`;
				msg += `${get_medal(1)} ${player.first_places}\n`;
				msg += `${get_medal(2)} ${player.second_places}\n`;
				msg += `${get_medal(3)} ${player.third_places}\n`;

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
			console.log(`Error retrieving standings: ${error}`);
			await interaction.reply('Error: could not return standings');
			return;
		}
	},
};
