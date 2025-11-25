require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('pong을 반환합니다.'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 명령어 등록
(async () => {
  try {
    console.log('⏳ 슬래시 명령어를 등록 중...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands },
    );
    console.log('✅ 슬래시 명령어 등록 완료!');
  } catch (error) {
    console.error(error);
  }
})();

// 봇 응답 로직
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.once('ready', () => {
  console.log(`🤖 로그인됨: ${client.user.tag}`);
});

// 로그인
client.login(process.env.DISCORD_TOKEN);
