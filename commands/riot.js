const { SlashCommandBuilder } = require('discord.js');
const { getPuuidByRiotId } = require('../riot');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summoner')
    .setDescription('Riot ID로 소환사 정보를 조회합니다.')
    .addStringOption(option =>
      option
        .setName('game_name')
        .setDescription('소환사의 이름 (예: 모카가오리맛쿠키)')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('tag_line')
        .setDescription('태그라인 (예: KR1)')
        .setRequired(true)),

  async execute(interaction) {
    const gameName = interaction.options.getString('game_name');
    const tagLine = interaction.options.getString('tag_line');

    await interaction.deferReply();

    try {
      const puuidData = await getPuuidByRiotId(gameName, tagLine);
      if (!puuidData) {
        return await interaction.editReply('❌ 소환사 정보를 가져오지 못했습니다. 이름과 태그를 다시 확인해주세요.');
      }

      await interaction.editReply(`🔍 **${gameName}#${tagLine}** 님의 PUUID:\n\`${puuidData.puuid}\``);
    } catch (error) {
      console.error('❌ Riot API 에러:', error);
      await interaction.editReply('⚠️ Riot API 요청 중 오류가 발생했습니다.');
    }
  },
};
