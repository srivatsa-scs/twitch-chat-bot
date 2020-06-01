const tmi = require('tmi.js');
const gw2api = require('./gw2api/gw2api.js');
const Datastore = require('nedb');
const db = new Datastore();
const chatDb = new Datastore({filename: './database/channelNonsensePoints.db', autoload: true});
const fetch = require('node-fetch');

//Environment Config File

require('dotenv').config();

//Twitch Config

const opts = {
    identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_BOT_OAUTH_TOKEN
    },
    channels: [
        process.env.TWITCH_CHANNEL
    ]
};

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

//Initlizations

let giveawayArray = [];
let giveawayStatus = 0; //0: Inactive 1: Active 2: Completed
let catchPhrase = "";
let messageCount = 0;
let prevCommand = "";
let db_id;
let remCount = 0;
const streamStartTime = Date.now();

class User{
    constructor(a, b, c){
        this.displayName = a;
        this.twitchUser = b;
        this.subStatus = c;
    }
}


// Update function

async function updateRatings(){
    let pvpOne = await gw2api.getPvPData(0);
    let pvpTwo = await gw2api.getPvPData(1);
    let wvwOne = await gw2api.getWvWData();
    let timeStamp = Date.now();
    
    let inserData = {
        pvp: [pvpOne, pvpTwo],
        wvw: [wvwOne],
        time: timeStamp
    }

    db.remove({ _id: db_id}, (err,newDocs)=>{
        if(err) console.error(err);
    })

    db.insert(inserData, (err,newDocs)=>{
        if(err) console.error(err);
        else {
            db_id = newDocs._id;
        }
    })
}

//Pre-Fetching GuildWars2 Data

updateRatings();

//Twitch Chat Connection (MAIN)

let userArray = [];

function onMessageHandler(target, context, msg, self){

    const commandName = msg.trim();
    
    if(self){
        if(commandName==`!gamble 250`){
            pointHandler(1);
        }
        return ;
    }

    //console.log(context);

    function readDatabase(choice){
        db.find({}, (err, docs)=>{
            if(err) console.error(err);
            else {
                switch(choice){
                    case 1: client.say(target, `My current PvP rating on EU is ${docs[0].pvp[0].rating} | ${docs[0].pvp[0].division} (Updated ${timeDiff(docs[0].time)}s ago)`); break;
                    case 2: client.say(target, `My current PvP rating on NA is ${docs[0].pvp[1].rating} | ${docs[0].pvp[1].division} (Updated ${timeDiff(docs[0].time)}s ago)`); break;
                    case 3: client.say(target, `My current WvW Rank is ${docs[0].wvw[0].rank}`); break;
                    case 4: client.say(target, `My current server is ${docs[0].wvw[0].world}`); break;
                }
            }
        })
    }

    user = new User(context['display-name'], context.username, context.subscriber);
    var flag2 = userArray.some(({displayName}) => {        
        return (displayName == user.displayName); // Prevents duplicates
        });
    if(!flag2){
        userArray.push(user);
    }    
    
    //Streamer Commands

    if(context.username == process.env.TWITCH_STREAMER_NAME){
        if(commandName.substring(0,14)=='!startgiveaway' && giveawayStatus==0){
            catchPhrase = commandName.substring(15);
            console.log(catchPhrase);
            if(catchPhrase=='') catchPhrase = '!giveaway';
            client.say(target, `/me A giveaway has begun type ${catchPhrase} to enter.`);
            giveawayStatus = 1;
        }
        else if(commandName=='!endgiveaway' && giveawayStatus==1){
            client.say(target, `/me Giveaway has ended.`);
            giveawayStatus = 2;
        }
        else if((commandName=='!pickwinner' || commandName == '!afkreroll') && giveawayStatus==2 && giveawayArray.length >= 1){
            let winner = pickWinner();
            console.log(`${giveawayArray.length+1} have entered the giveaway`);
            client.say(target, `${winner.name} has won the giveaway out of ${giveawayArray.length+2} participant(s). Please type your account name in chat to recieve the prize`);
            console.log(`* ${winner.name} has won the giveaway`)
        }
        else if(commandName=='!resetgiveaway'){
            giveawayArray = [];
            giveawayStatus = 0;
        }
        else if(commandName.substring(0,3)=='!so'){
            let soName = commandName.substring(4);
            client.say(target, `Check out ${soName}'s Awesome stream at https://twitch.tv/${soName}`);
        }
        else if(commandName=='!addpoints'){
            getChattersFromTwitch();
            client.say(target, `250 ${process.env.CHANNEL_POINT_NAME} have been added to people in chat. Use !gamble 250 to gamble 250 ${process.env.CHANNEL_POINT_NAME}`);
        }
        else if(commandName=='!botgamble'){
            client.say(target, `!gamble 250`);
        }

        function pickWinner(){
            let total = giveawayArray.length; //sum total of array.subs
            let index = Math.floor(Math.random() * total);
            let res = giveawayArray[index];
            console.log(`* ${giveawayArray[index].displayName} has won the giveaway`);
            giveawayArray.splice(index,1);
            return (res);
        }
    }

    //Periodic Reminders
    
    function reminders(){        
        switch(remCount){
            case 1: client.say(target, `If you like the stream, please Follow <3`); break;
            case 2: client.say(target, `Consider subscribing if you find my streams informative or entertaining!`); break;
            default: client.say(target, `Type !commands to see the list of commmands.`);
        }
        remCount = remCount<2?remCount+1:0;
    }
    
    messageCount++;
    let reminderCountForFollowMessages= 10;

    if(messageCount % reminderCountForFollowMessages== 0){
        reminders();
    }

    // && commandName!='!startgiveaway' && commandName!='!endgiveaway' && commandName!='!pickwinner' && commandName!='!resetgiveaway' && commandName!='!afkreroll'
    //List of Commands    

    // if(commandName.substring(0,3)=='!sr'){
    //     console.log(`* ${commandName.substring(4)}`);
    //     let songName = songRequest(commandName.substring(3));
    //     client.say(target, `${songName} has been added to the Playlist by ${context['display-name']}`);
    //     }

    
    if(commandName==catchPhrase && giveawayStatus==1){
        let newUser = {
            name: context['display-name'],
            subscriber: context.subscriber?11:10,
            id: context.username            
        }

        var flag = giveawayArray.some(({name}) => name === newUser.name); // Prevents duplicates

        if(!flag){
            giveawayArray.push(newUser);
            console.log(`* ${newUser.name} has joined the giveaway with ${newUser.subscriber} tickets`);
        }
    }
    else if (commandName.substring(0,7)=="!gamble"){
        pointHandler(1);        
    }
    else if(commandName.substring(0,1)=='!'){
        switch(commandName){
            case '!sudoku':
                client.say(target, `/timeout ${context.username} 1s`);
                break;
            case '!uptime': 
                client.say(target, `Stream (Bot) has been live for ${uptimeFunction()}`);
                break;
            case '!dpsmeter': 
                client.say(target, `DPS Meter can be found at: https://www.deltaconnected.com/arcdps/`);
                break;
            case '!boontable': 
                client.say(target, `The Boon table can be found at: http://martionlabs.com/arcdps-boon-table/`);
                break;
            case '!mechanicslog': 
                client.say(target, `The Mechanics Log can be found at: http://martionlabs.com/arcdps-mechanics-log-plugin/`);
                break;
            case '!eurating':
                readDatabase(1);           
                break;
            case '!narating':
                readDatabase(2);          
                break;
            case '!wvwrank':
                readDatabase(3);
                break;
            case '!server':
                readDatabase(4);
                break;
            case '!cursor':
                client.say(target, `My weird looking cursor is from using https://pandateemo.github.io/YoloMouse/`);
                break;
            case '!commands':
                client.say(target, `/me List of Commands are: !${process.env.CHANNEL_POINT_NAME} !gamble !top !cursor !sudoku !dpsmeter !boontable !mechanicslog !commands !pvebuilds !pvpbuilds !wvwbuilds !eurating !narating !server !wvwrank`);
                break;
            case '!pvebuilds':
                client.say(target, `Snowcrows | https://www.snowcrows.com/`);
                break;
            case '!pvpbuilds':
                client.say(target, `Core Necro | https://www.godsofpvp.net/builds/necromancer ; Reaper | http://gw2skills.net/editor/?PSwAYd3lVw8YdML2JmaXetbA-z5IeKNKCyUBEwEojhgjHA`);
                break;
            case '!wvwbuilds':
                client.say(target, `Power Scourge | http://gw2skills.net/editor/?PSABc2tjlNweYIsDmJOyL7vNA-zVRYih3ImioxKIzUgGBssB-w`);
                break;
            case `!${process.env.CHANNEL_POINT_NAME}`:
                pointHandler(0);
                break;
            case '!top':
                pointHandler(2);
                break;
            default:
        }
    }

    //Start of Gamble Stuff    

    function rollNumber(rollAmount){
        let roll = Math.random();
        if (roll>0.6) return {'roll': Math.floor(roll*100), 'rollAmount': rollAmount };
        else return {'roll': Math.floor(roll*100), 'rollAmount': -rollAmount }
    }

    function pointHandler(mode){
        switch(mode){
        case 0: chatDb.findOne({twitchUser: context.username}, getPointsCallback); break; // 0: Fetches user's point from database
        case 1: chatDb.findOne({twitchUser: context.username}, gambleCallback); break; // 1: Gambles with user's points
        case 2: chatDb.find({}).sort({channelPoints: -1}).limit(5).exec(topPointsCallback); break; // 2: Returns peoeple with top 5 points
        default: console.log(`* I'm never gonna be called so Hi`);
        }
    }

    //Callback functions, they need to be present within the tmi chat block

    function getPointsCallback(err, docs){
        if (err) console.error(err);
        else {
            //console.log(docs);
            if(!docs) {
                client.say(target, `${context['display-name']} has 0 ${process.env.CHANNEL_POINT_NAME}.`);
            }
            else {
                client.say(target, `${context['display-name']} has ${docs.channelPoints} ${process.env.CHANNEL_POINT_NAME}.`);
            }      
        }
    }

    function gambleCallback(err,docs){
        if(err) console.error(err);
        else if (!docs || docs.channelPoints==0) client.say(target, `${context['display-name']} has no ${process.env.CHANNEL_POINT_NAME} to gamble with.`);
        else {
            (function gamble(){  
            amount = commandName.substring(8);    
            if(amount!='all') amount = Number(commandName.substring(8)); //!gamble all or !gamble 2342
            if(amount=='all'){
                result = rollNumber(docs.channelPoints);
                newChannelPoints = docs.channelPoints + result.rollAmount;
                //Record into Database
                chatDb.update(docs, {twitchUser: context.username, channelPoints: newChannelPoints},{},(err2, docs2)=>{
                    if(err2) console.error(err2);
                    else {
                        //Say it on twitch
                        if (result.rollAmount>0) client.say(target, `${context['display-name']} rolled ${result.roll} and gained ${result.rollAmount} ${process.env.CHANNEL_POINT_NAME}. They now have ${newChannelPoints} in total Kreygasm`);
                        else client.say(target, `${context['display-name']} rolled ${result.roll} and lost ${Math.abs(result.rollAmount)} ${process.env.CHANNEL_POINT_NAME}. They now have nothing! NotLikeThis`);
                    }
                })
                chatDb.persistence.compactDatafile();
            }
            else if (Number.isInteger(amount)){
                if (amount <= 0){
                    client.say(target, `${context['display-name']} nice try 4Head. Minimum ${process.env.CHANNEL_POINT_NAME} to gamble is 1`);
                }
                else if(amount < docs.channelPoints){
                    result = rollNumber(amount);
                    newChannelPoints = docs.channelPoints + result.rollAmount;
                    //Record into Database
                    chatDb.update(docs, {twitchUser: context.username, channelPoints: newChannelPoints},{},(err2, docs2)=>{
                        if(err2) console.error(err2);
                        else {
                            //Say it on twitch
                            if (result.rollAmount>0) client.say(target, `${context['display-name']} rolled ${result.roll} and gained ${result.rollAmount} ${process.env.CHANNEL_POINT_NAME}. They now have ${newChannelPoints} in total.`);
                            else client.say(target, `${context['display-name']} rolled ${result.roll} and lost ${Math.abs(result.rollAmount)} ${process.env.CHANNEL_POINT_NAME}. They now have ${newChannelPoints} in total.`);
                        }
                    })
                    chatDb.persistence.compactDatafile();
                }
                else client.say(target, `Look at the smartass ${context['display-name']} trying to spend more ${process.env.CHANNEL_POINT_NAME} than they have TriHard`);
            }
            else {
                client.say(target, `You can't gamble in fractions! DansGame`);
            }
        })()        
        }
    }

    function topPointsCallback(err, docs){
        if(err) console.error(err);
        else {
            client.say(target, `People with the Top ${process.env.CHANNEL_POINT_NAME} are ${docs[0].twitchUser} with ${docs[0].channelPoints} | ${docs[1].twitchUser} with ${docs[1].channelPoints} | ${docs[2].twitchUser} with ${docs[2].channelPoints} | ${docs[3].twitchUser} with ${docs[3].channelPoints} | ${docs[4].twitchUser} with ${docs[4].channelPoints}`);
        }
    }
    // End of Gamble Stuff
}

function songRequest(newSong){
    console.log(newSong);
    return;
}

function onConnectedHandler(addr, port){
    startTime = new Date;
    console.log(`* Connected to ${addr}:${port} at ${startTime.toLocaleString()}`);
}

// Gamble 2: The gamblinginging

//Fetch list of users in chat using the chatters link

async function getChattersFromTwitch(){
    let nowDate = new Date;
    console.log(`* Chatterjee function called at ${nowDate.toLocaleString()}`);
    let url = `https://tmi.twitch.tv/group/user/${process.env.TWITCH_CHANNEL}/chatters`;
    let chatterRequest = await fetch(url);
    let chatterData = await chatterRequest.json();
    let listOfChatters = await chatterData.chatters;
    let arrayOfChattersNames = [];
    
    arrayOfChattersNames.push(...listOfChatters.broadcaster);
    arrayOfChattersNames.push(...listOfChatters.vips);
    arrayOfChattersNames.push(...listOfChatters.moderators);
    arrayOfChattersNames.push(...listOfChatters.staff);
    arrayOfChattersNames.push(...listOfChatters.admins);
    arrayOfChattersNames.push(...listOfChatters.global_mods);
    arrayOfChattersNames.push(...listOfChatters.viewers);

    for(i=0;i<chatterData['chatter_count'];i++){
        chatDb.update({twitchUser: arrayOfChattersNames[i]},{$inc: {channelPoints: Number(process.env.CHANNEL_POINT_VALUE)}},{upsert: true}, (err,docs)=>{
            if (err) console.error(err);           
        })
    }
    chatDb.persistence.compactDatafile();
}

setInterval(getChattersFromTwitch, 5 * 60 * 1 * 1000);

//The REAL OFFICIAL END OF GAMBLE STUFF 2

function timeDiff(oldTime){
    newTime = Date.now();
    diff = newTime - oldTime;
    return Math.floor(diff/1000);
}

const ratingUpdateIntervalMin = 2; // Do not set to 0.
const ratingUpdateIntervalSec = 1; // Do not set to 0.

setInterval(updateRatings, ratingUpdateIntervalMin * 60 * ratingUpdateIntervalSec * 1000);

function uptimeFunction(){
    newTime = Date.now();
    uptimeInSeconds = Math.floor((newTime - streamStartTime)/1000);
    remSeconds = uptimeInSeconds%60;
    remMinutes = Math.floor((uptimeInSeconds%3600)/60);
    remHours = Math.floor(uptimeInSeconds/3600);
    if (remHours<1) replyUptime = `${remMinutes}m ${remSeconds}s`;
    else replyUptime = `${remHours}h ${remMinutes}m ${remSeconds}s`;
    return replyUptime;
}