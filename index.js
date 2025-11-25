require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// 클라이언트 인스턴스 생성
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 봇이 준비되었을 때 실행
client.once('ready', () => {
  console.log(`✅ 로그인됨: ${client.user.tag}`);
});

// 로그인
client.login(process.env.DISCORD_TOKEN);
