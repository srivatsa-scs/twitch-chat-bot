**Atri's Twitch Chat Bot**

This is a chat bot written in NodeJS and is pretty basic in terms of functionality.

- It is based on the tmi.js module for connecting to Twitch Chat IRC.
- It uses NedB for in memory json Database as well as a secondary database to store the channel points
- It uses the node-fetch Module to perform http fetch requests to gw2 json api endpoints
- It uses dotenv to store the configuration data without exposing it in the code.

This bot offers the following commands:

!points !gamble !top !cursor !sudoku !dpsmeter !boontable !mechanicslog !commands !pvebuilds !pvpbuilds !wvwbuilds !eurating !narating !server !wvwrank

It uses the .env file to set up quite a few things as listed in the .env_sample file.

**TWITCH_BOT_USERNAME** = Enter the account you want to use this bot as (highly recommend a seperate account)  
**TWITCH_BOT_OAUTH_TOKEN** = This is the oauth token for the account that the bot will be running as, it can be obtained from https://twitchapps.com/tmi/  
**TWITCH_CHANNEL** = Enter the twitch channel you want this bot to connect and listen too.  
**TWITCH_STREAMER_NAME** = Enter the name of the streamer on this channel (in most cases same as above)  
**GW2_API_KEY_EU** = Enter the GW2 API key for your **EU account** (with all permissions), it can be obtained from https://account.arena.net/applications  
**GW2_API_KEY_NA** = Enter the GW2 API key for your **NA account** (with all permissions), it can be obtained from https://account.arena.net/applications  
**CHANNEL_POINT_VALUE** = Enter the amount of points that the bot will give to people in your chat every 5 minutes.  
**CHANNEL_POINT_NAME** = Enter the command name / name of channel points that the bot will use. If this is set to "cats", the chat command will be !cats and people will gamble with the currency "cats"  

The bot will crash if you don't fill all the constraints asked by it (I might at some point address this issue.)