codeviz
=======

A simple node application that shows stats based on a GitHub organization.

## Examples

The base URL for the chart is http://codeviz.herokuapp.com/chart/{org-name}

* http://codeviz.herokuapp.com/chart/liip
* http://codeviz.herokuapp.com/chart/jquery
* http://codeviz.herokuapp.com/chart/ogdch


**Notes:** 

* The app on heroku does not use authenticated requests, which results in a very low rate limit. All previously requested organizations are cached, so those should still work.
* If you want to reload an organization from GitHub you can force the app to update the cache using the `?force` option (e.g. http://codeviz.herokuapp.com/chart/liip?force)
* Only public members of an organization are shown, to make your membership in an organization public visit the list of all members (https://github.com/orgs/{org-name}/members), search your user and then use the `make public` link

## Worldcup Twitter visualization

During the Liip Hackday we implemented a twitter visualization for the football worldcup in Brazil. The idea was to have each new tweet pop-up on a map corresponding to the stadium of the game.
It contains two parts:

1. Getting the data out of twitter (run using `node worker.js`)
2. Put it on a map (run using `node worldcup.js`)

After that you can visit http://localhost:9998/map/ and see the map with the appearing tweets.
