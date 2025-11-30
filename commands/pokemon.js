const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('포켓몬')
    .setDescription('포켓몬 정보를 검색합니다.')
    .addStringOption(option =>
      option.setName('이름')
        .setDescription('포켓몬 이름')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.reply('포켓몬 도감 기능은 준비 중입니다!');
  },
};
