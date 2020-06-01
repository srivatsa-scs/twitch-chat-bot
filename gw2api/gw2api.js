const express = require('express');
const app = express();
const fetch = require('node-fetch');
require('dotenv').config();

app.listen(3000, ()=>{
    console.log(`* GW2 Fetch Stuff Server is running...`);
});

app.use(express.static('public'));

let apiKey = [];

apiKey.push(process.env.GW2_API_KEY_EU);
apiKey.push(process.env.GW2_API_KEY_NA);


async function getWvWData(){
    let wvwRank;
    const url = `https://api.guildwars2.com/v2/account?access_token=${apiKey[0]}`;    
    const response1 = await fetch(url);
    const wvwData = await response1.json();
    const response2 = await fetch(`https://api.guildwars2.com/v2/worlds?ids=${wvwData.world}`);
    const worldData = await response2.json();    
    let worldName = worldData[0].name;
    if(wvwData.world < 2000) worldName = worldName.concat(` (NA)`);
    else worldName = worldName.concat(` (EU)`);
    wvwRank = {
        world: worldName,
        rank: wvwData.wvw_rank
    }
    return wvwRank;
}

//Should be converted to an array


async function getPvPData(regionCode){
    
    let currentRating;
    const seasonResponse = await fetch(`https://api.guildwars2.com/v2/pvp/seasons`);
    const seasonData = await seasonResponse.json();
    const currentSeason = await seasonData[seasonData.length-1];
    const url = "https://api.guildwars2.com/v2/pvp/standings";
    const pvpResponse = await fetch(`${url}?access_token=${apiKey[regionCode]}`);
    const pvpData = await pvpResponse.json();
    
    for(let i=0;i<pvpData.length;i++){
        if(pvpData[i].season_id==currentSeason){
            currentRating = pvpData[i].current.rating;
        }
    }

    let division = "";
    
    switch(true){
        case (currentRating <= 300): division = "Bronze I"; break;
        case (currentRating <= 600): division = "Bronze II"; break;
        case (currentRating <= 900): division = "Bronze III"; break;
        case (currentRating <= 1000): division = "Silver I"; break;
        case (currentRating <= 1100): division = "Silver II"; break;
        case (currentRating <= 1200): division = "Silver III"; break;
        case (currentRating <= 1300): division = "Gold I"; break;
        case (currentRating <= 1400): division = "Gold II"; break;
        case (currentRating <= 1500): division = "Gold III"; break;
        case (currentRating <= 1600): division = "Platinum I"; break;
        case (currentRating <= 1700): division = "Platinum II"; break;
        case (currentRating <= 1800): division = "Platinum III"; break;
        case (currentRating <= 1900): division = "Legendary I"; break;
        case (currentRating <= 2000): division = "Legendary II"; break;
        case (currentRating <= 2100): division = "Legendary III"; break;
        default: division = "Unknown";
    }
    
    return {
        'rating': currentRating,
        'division': division
    }
}

module.exports.getPvPData = getPvPData;
module.exports.getWvWData = getWvWData;