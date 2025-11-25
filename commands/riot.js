// commands/riot.js

// riot 명령어 - 롤 전적 검색
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('롤')
    .setDescription('롤 전적을 검색합니다')
    .addStringOption(option =>
      option.setName('닉네임')
        .setDescription('롤 닉네임')
        .setRequired(true)),
  async execute(interaction) {
    const nickname = interaction.options.getString('닉네임');
    await interaction.reply(`${nickname}의 전적을 불러오는 중...`);
  }
};