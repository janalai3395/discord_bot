require('dotenv').config();
require('./deploy-commands'); // 봇 실행 시 명령어 자동 등록 --> 개발떄만 유지 배포시에는 제거 바람 node deploy-commands.js 명령어 실행과 같음
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// 명령어 파일 로드
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[경고] ${file}은 data 또는 execute 속성이 없습니다.`);
  }
}

// 슬래시 명령어 실행 처리
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ 명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
  }
});

client.once('clientReady', () => {
  console.log(`✅ 로그인 완료: ${client.user.tag}`);
});


client.login(process.env.DISCORD_TOKEN);
