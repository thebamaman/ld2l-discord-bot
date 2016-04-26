# LD2L Bot!
A Discord Bot to help run and streamline services within the Learn Dota 2 League. 


## What does it do? ##
LD2L Bot is a bot that sits in the official LD2L Discord server and runs some very helpful services to try to keep things running smoothly for the league.

##What's New?##
    v1.1
    - Bot now creates 2 hour matches by default
    - Fixed issue where users could schedule matches using 24-hour time
    - Fixed issue where matches starting at 11 or 12 wouldn't be created and fail silently
    - Added caster commands (!findMatches, !setCaster)

## How do I make it do things? ##
LD2L Bot accepts various commands from various users.  Every member of the server has access to the following basic commands (NOTE!  Permissions may change with league admin discretion):

    !whoami

Tells you who you are, according to LD2L Bot. Only usable via PM

    !schedule GROUP <Letter> <Team 1> VS <Team 2> DD/MM/YYYY HH:MM AM/PM <EDT/PDT/SGT/GMT>
Adds your game to the LD2L Google Calendar.  Only usable in the #scheduling channel

    !showMatches
Shows you a list of matches that you have scheduled, along with their unique IDs.  Only usable via PM

    !deschedule <matchID>
Removes the specified match from the calendar.  Good for if you screw something up or need to reschedule.  Only usable via PM

    !findMatches <userName>
Casters only!  Shows you a list of matches that a user has scheduled, along with their unique IDs.  Only usable via PM

    !setCasters <matchID>: <casternames separated by spaces>
Casters only!  Adds casters to the specified match from the calendar.  Will overwrite existing casters everytime its used, so please list all names in one go.  Only usable via PM

## Future Features List: ##
LD2L Bot has been scrapped together in free time over the past week just to get it to serve up some basic functionality.  But more is coming!  The following features are planned to be integrated in the next few weeks:

- Duplicate match check: If there is a match with the same two teams within 7 days, it'll block the match until it's deleted

- Allowing casters to host their streams on the LD2L Twitch Channel

- Alerting the server when a game starts

- Showing upcoming games on request

***Got a feature request that we don't have listed here?***
[Go over to the issues page and make a feature request!  If we can accommodate it, we'll try our best!!](https://github.com/ammuench/ld2l-discord-bot/issues)

## Want to help? ##
If you find an issue while using the bot, [go over to the issues page](https://github.com/ammuench/ld2l-discord-bot/issues) for our project and log a bug report for us please!  Be as specific as you can!!

If you enjoy programming and wanna help us write new features or fix some bugs, just make a pull request and go for it!  If you wanna do more frequent dev work, ping **@Upstairs/Downstairs** or **@hiemanshu** on the Discord Server and we can add you to the repo!

