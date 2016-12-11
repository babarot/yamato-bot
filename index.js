// utf-8

var botkit = require('botkit');
var CronJob = require('cron').CronJob;
var request = require('request');
var sprintf = require('sprintf');

var config = {
    slack: {
        'username': 'yamato tracking',
        'icon_emoji': ':cat:',
        'channel': 'dev-bot',
        'token': process.env.SLACK_TOKEN
    },
    color: {
    }
}

var controller = botkit.slackbot({
    debug: false
});

var deliveryStatus = '';
var url = ''

controller.spawn({
    token: config.slack.token,
}).startRTM(function(err, bot, payload) {
    if (err) {
        throw new Error('Could not connect to Slack');
    }
    new CronJob({
        cronTime: '0 */1 * * *', // every hour
        onTick: function() {
            if (deliveryStatus !== '') {
                request(url, function (error, response, body) {
                    if (error && response.statusCode != 200) {
                        console.log('error: '+ response.statusCode);
                        return;
                    }
                    var r = JSON.parse(body);
                    if (deliveryStatus !== r.status) {
                        // changed status
                        bot.say({
                            text: r.status + 'になりました',
                            channel: config.slack.channel,
                            username: config.slack.username,
                            icon_emoji: config.slack.icon_emoji,
                        });
                        deliveryStatus = r.status
                    }
                });
            }
        },
        start: true,
        timeZone: 'Asia/Tokyo'
    });
});

controller.hears(['^bot\\s+yamato(\\s+(\\S+))?'],
    ['message_received', 'ambient'],
    function(bot, message) {
        var slipNum = message.match[1];
        url = sprintf('http://nanoappli.com/tracking/api/%s.json', slipNum.trim());
        var i = 0;
        request(url, function (error, response, body) {
            if (error && response.statusCode != 200) {
                console.log('error: '+ response.statusCode);
                return;
            }
            var r = JSON.parse(body);

            deliveryStatus = r.status; // cache
            var fields = [];
            r.statusList.forEach(function(list) {
                fields[i++] = {
                    title: list.status,
                    value: sprintf('%s %s %s', list.date, list.time, list.placeName),
                    short: false,
                }
            });
            return bot.reply(message, {
                username: config.slack.username,
                icon_emoji: config.slack.icon_emoji,
                attachments: [{
                    fields: fields,
                }]
            });
        })
    });
