// commands/rank.js
const { SlashCommandBuilder } = require('discord.js');
const { 
  getPuuidByRiotId, 
  getRankByPuuid 
} = require('../riot');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('소환사의 랭크 정보를 조회합니다.')
    .addStringOption(option =>
      option
        .setName('game_name')
        .setDescription('게임 이름 (예: Hideonbush)')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('tag_line')
        .setDescription('태그라인 (예: KR1)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const gameName = interaction.options.getString('game_name');
    const tagLine = interaction.options.getString('tag_line');

    await interaction.deferReply();

    try {
      // 1️⃣ Riot ID → PUUID
      const puuid = await getPuuidByRiotId(gameName, tagLine);
      console.log("[✔] PUUID:", puuid);

      if (!puuid) {
        return await interaction.editReply(
          `❌ **${gameName}#${tagLine}** 의 PUUID를 찾을 수 없습니다.`
        );
      }

      // 2️⃣ PUUID → 랭크 정보 (summoner API 사용 안 함)
      const rankData = await getRankByPuuid(puuid);
      console.log("[✔] RANK DATA:", rankData);

      if (!rankData || rankData.length === 0) {
        return await interaction.editReply(
          `⚠️ **${gameName}#${tagLine}** 님의 랭크 정보가 없습니다.`
        );
      }

      // 3️⃣ 솔랭 / 자유랭 분리
      const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
      const flex = rankData.find(q => q.queueType === 'RANKED_FLEX_SR');

      let reply = `**🔎 ${gameName}#${tagLine} 님의 랭크 정보**\n`;

      if (solo) {
        reply += `🥇 **솔로랭크:** ${solo.tier} ${solo.rank} (${solo.leaguePoints} LP)\n`;
      } else {
        reply += `🥇 **솔로랭크:** 정보 없음 / 배치 중\n`;
      }

      if (flex) {
        reply += `🥈 **자유랭크:** ${flex.tier} ${flex.rank} (${flex.leaguePoints} LP)\n`;
      } else {
        reply += `🥈 **자유랭크:** 정보 없음 / 배치 중\n`;
      }

      return await interaction.editReply(reply);

    } catch (error) {
      // axios 에러 상세도 같이 찍어두면 디버깅 편함
      console.error("❌ rank.js 오류:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      return await interaction.editReply(
        '⚠️ 랭크 정보를 불러오는 중 오류가 발생했습니다.'
      );
    }
  }
};
