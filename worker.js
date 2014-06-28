var _ = require('underscore');
var Twit = require('twit');  
var Yaml = require('js-yaml');
var Fs = require('fs');
var Superagent = require('superagent');

var config = Yaml.safeLoad(Fs.readFileSync('config.yml', 'utf8'));
console.log(config);

var T = new Twit({  
  consumer_key: config.twitter.consumerKey,
  consumer_secret: config.twitter.consumerSecret,
  access_token: config.twitter.accessToken,
  access_token_secret: config.twitter.accessTokenSecret
});

var stadiums = Yaml.safeLoad(Fs.readFileSync('stadium.yml', 'utf8'));

var keywords = _.flatten(_.map(stadiums, function(value, key) {
    return value.keywords;
}));

console.log("tracking keywords: ", keywords);

var stream = T.stream('statuses/filter', { track: keywords })

stream.on('tweet', function(tweet) {

    var matchingKeyword = _.find(keywords, function(keyword) {
        return tweet.text.indexOf(keyword) > -1;
    });
    console.log("found matching keyword: ", matchingKeyword);

    if (matchingKeyword != undefined) {
        var stadium = _.find(stadiums, function(stadium) {
            return stadium.keywords.indexOf(matchingKeyword) > -1;
        });

        var infos = {
            origin: 'twitter',
            user: tweet.user.screen_name,
            tweet: tweet.text,
            coordinates: tweet.coordinates,
            stadium: {
                name: stadium.name,
                coordinates: {
                    type: 'Point',
                    coordinates: [
                        stadium.coordinates.long, stadium.coordinates.lat
                    ]
                }

            }
        };

        console.log('incoming tweet:', infos);
        Superagent
            .post('http://localhost:9998/receive')
            .set('Content-Type', 'application/json')
            .send(infos)
            .end(function(res) {
                if (res.ok) {
                    console.log("sent to Odi");
                }
                else {
                    console.log("error while sending to Odi", res.text);
                }
            });
    }
});
