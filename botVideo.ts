export {};
import fetch from 'node-fetch';
import {Bot, GrammyError, HttpError, Keyboard} from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
import express from "express";

// Как сделать бота 1. По кнопке старт приветствие и адресс на который кинуть
// сабжи 2. Нажимает оплатил и идёт проверка последней транзакции на (
//  сумму (curSum >= const), время (минут 15), шла ли она на мой адресс) 

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ADDRESS = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; //token
const CHAIN = '42161';
const WALLET = process.env.MY_WALLET!;
const url = `https://api.etherscan.io/v2/api?apikey=${ETHERSCAN_API_KEY}&chainid=${CHAIN}&module=account&action=tokentx&contractaddress=${ADDRESS}&address=${WALLET}&startblock=0&endblock=9999999999&page=1&offset=1&sort=desc`;
const options = {method: 'GET', body: undefined};
const bot = new Bot(process.env.TELEGRAM_TOKEN!);
const video:string=process.env.SELLIG_VIDEO!;
let intervalId: NodeJS.Timeout | null = null;
 // @ chatId => counter in function "paid"
let  antiSpam = new Map<number,number>(); // for detecting spamers


interface TokenTx {
  hash: string;
  from: string;
  to: string;
  value: number;
  tokenSymbol: string;
  timeStamp: number;
}

let lastTxHash:string;

const costCons:number=1; //price

const hashBase = new Map<string,boolean>();
const timeGap:number= 300;
let chatId:number;

bot.api.setMyCommands([
  {
    command: "start", description: "Запуск бота" 
  },
  {
    command: "paid", description: "Вызвать после оплаты на адресс" 
  },
  {
      command: "token", description: "Смарт контракт токена для оплаты (ЧЕМ ПЛАТИТЬ)" 
  },
  {
        command: "video", description: "Если вы уже оплатили видео, но потеряли ссылку(не работает)" 
  }
])

bot.command("start", async (ctx) => {
  chatId = ctx.chat.id; // get chatId
  const board = new Keyboard().text("/paid").resized();

  await ctx.reply(
    `\🎥 Здравствуйте \n\n Видео про стратегию заработка уже готово и ожидает только оплаты \n\n Сеть ARBITRUM \🔥 USDT ${costCons}  \n\n Адресс для оплаты  \`${WALLET}\` \n\n После оплаты на адресс нажмите кнопку paid внизу`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: board
    }
  );
});

bot.command("token", async (ctx) => {

  await ctx.reply(
    `  Сеть ARBITRUM USDT ${costCons} \$ \n\n Смарт контракт токена\, который принимает бот   \`${ADDRESS}\` \n\n СЮДА НЕ ПЛАТИТЬ`,
    {
      parse_mode: "MarkdownV2"
    }
  );
});


bot.hears("/paid", async (ctx) =>{
  chatId = ctx.chat.id;
 let count = (antiSpam.get(chatId)?? 0)+1; //anti-spam if
 antiSpam.set(chatId, count);
    if (count > 12) {
      await ctx.reply ("⛔ Обнаружен спам, обратитсь к админу за разбаном",
  { parse_mode: "Markdown" })
    return
  } else {  //normal logic
  checkTrans();
  await ctx.reply(
    "💸 После оплаты **отправьте одним сообщением** ваш `tx.hash`.\n\n⏳ *Подтверждение может занять пару минут.*",
  { parse_mode: "Markdown" })
}} );



async function checkTrans() {
  let intervalId = setInterval(checkTrans,1 * 30 * 1000);
try {
  const response = await fetch(url, options);
  const data:any = await response.json();
  let time = Date.now();
  
      if (data.status === '1') {
      const tx:TokenTx = data.result[0];
      console.log( tx, tx.from, "-ОТПРАВКА", "ЦЕНА-", tx.value,"TIME -", tx.timeStamp);
      console.log( lastTxHash);
      if (tx.hash !== lastTxHash && tx.from !== WALLET && Number(tx.value) / 1e6 >= costCons && 
        tx.timeStamp + timeGap >= time / 1000 && Number(tx.value) / 1e6 <= costCons + 3
      ) { 
        lastTxHash = tx.hash;
        hashBase.set(tx.hash,true)
        const message = `
✅ *УСПЕШНАЯ транзакция!*

ВАШ РОЛИК, ПРИЯТНОГО ПРОСМОТРА 🔥
${video}

Hash: [${tx.hash}](https://arbiscan.io/tx/${tx.hash})
От: ${tx.from}
Кому: ${tx.to}
Сумма: ${Number(tx.value) / 1e6} ${tx.tokenSymbol}
Время: ${tx.timeStamp};
        `;
        clearInterval(intervalId);
        await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log('✅ Отправлено в Telegram');
      }
    }


} catch (error) {
  console.error(error);
  
}}


bot.catch((err)=>{
    const ctx = err.ctx;
    console.error(`Error while update ${ctx.update.update_id}`);
    const e = err.error;
    if (e instanceof GrammyError){console.error
        (`Error in request: ${e.description}`);}
        else if (e instanceof HttpError){console.error
            ("Error in network TG",e);
         } else {console.error("Unknown error", e);
         }
})


setTimeout(async () => {
  const message = "⏹❌ Время оплаты вышло.\nПерезапустите бота и попробуйте снова!\nВозникли неполадки? Пишите мне сюда — @Tg";

  try {
    await bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log('✅ Сообщение об окончании отправлено.');
  } catch (err) {
    console.error('❌ Ошибка при отправке сообщения:', err);
  }
  if (intervalId !== null) {
  clearInterval(intervalId);}
  console.log('⏹ Мониторинг остановлен.');
}, 6 * 60 * 1000);



const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});




bot.start({
  onStart: () => console.log('Bot started with long polling')
});

// from ts to js
//npm install
//npx tsc
//ls dist



//npm install npm run build
//node dist/botVideo.js