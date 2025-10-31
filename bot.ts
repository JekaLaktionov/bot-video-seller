export {};
import fetch from 'node-fetch';
import {Bot, GrammyError, HttpError, Keyboard} from 'grammy';
import dotenv from 'dotenv';
dotenv.config();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ADDRESS = '0xD1BeA5856778bA112701f6B87Fcd2101e689035c'; //token
const CHAIN = '11155111';
const WALLET = process.env.MY_WALLET!;
const url = `https://api.etherscan.io/v2/api?apikey=${ETHERSCAN_API_KEY}&chainid=${CHAIN}&module=account&action=tokentx&contractaddress=${ADDRESS}&address=${WALLET}&startblock=0&endblock=9999999999&page=1&offset=1&sort=desc`;
const options = {method: 'GET', body: undefined};
const bot = new Bot(process.env.TELEGRAM_TOKEN!);
const chatId = process.env.TELEGRAM_CHAT_ID!;

interface TokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  timeStamp: number;
}

let lastTxHash:string;
const costCons:number=50;
const hashBase = new Map<string,boolean>();

bot.command("keyBoard", async (ctx) =>{
  const board = new Keyboard().text("Оплатить").resized();
  await ctx.reply("Консультации и *всё такое*",
    {reply_markup:board})
});
bot.hears("Оплатить", async (ctx) =>{
  await ctx.reply(`сеть ARBITRUM - USDT
     ${WALLET} 
    После оплаты воспользуйтесь конпкой hash и отправьтe одинм сообщением tx.hash`)
} );

async function checkTrans() {
try {
  const response = await fetch(url, options);
  const data:any = await response.json();
      if (data.status === '1') {
      const tx:TokenTx = data.result[0];
      if (tx.hash !== lastTxHash && tx.from !== WALLET) { 
        lastTxHash = tx.hash;
        const a = hashBase.set(tx.hash,true)
        const message = `
📦 *Новая транзакция!*
Hash: [${tx.hash}](https://sepolia.etherscan.io/tx/${tx.hash})
От: ${tx.from}
Кому: ${tx.to}
Сумма: ${Number(tx.value) / 1e18} ${tx.tokenSymbol}
Время: ${tx.timeStamp};
        `;
        await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log('✅ Отправлено в Telegram');
      }
    }
const cleaned = data.result.map((tx:TokenTx) => {
  const keep = ['hash', 'from', 'to', 'value', 'tokenSymbol', 'timeStamp'];
  return Object.fromEntries(
    Object.entries(tx).filter(([key]) => keep.includes(key))
  );
});
console.log(cleaned);


} catch (error) {
  console.error(error);
  
}}
bot.start();
setInterval(checkTrans,1 * 60 * 1000);
checkTrans();