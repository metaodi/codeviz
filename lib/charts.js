var Github = require('./github').getGitHub();
var Async = require('async');
var Request = require('superagent');
var Promise = require('promise');
var _ = require('underscore');

function callGithub(call, params) {
    return new Promise(function (fulfill, reject) {
        call(params, function (err, res) {
            if (err) reject(err);
            else {
                fulfill(res);
            }
        });
    });
}

var getPieChart = function(title, name, data) {
    return {
        title: {
            text: title,
            x: -20 //center
        },
        subtitle: {
            text: 'Source: GitHub.com',
            x: -20
        },
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: 1,//null,
            plotShadow: false
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y}</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    style: {
                        color: 'black'
                    }
                }
            }
        },
        series: [{
            type: 'pie',
            name: name,
            data: data
        }]
    }
}

var orgUserRepo = function(org, success, error) {
    callGithub(Github.orgs.getMembers, {
        org: org,
        per_page: 100
    }).then(function(members) {
        return Promise.all(_.map(members, function(member) {
            return callGithub(Github.user.getFrom, {
                user: member.login
            });
        }));
    }).then(function(users) {
        var json = getPieChart("Repositories per User", "Amount of repositories", 
            _.map(users, function(ghuser) {return [ghuser.login, ghuser.public_repos]})
        );
        success(json);
    }).catch(function(error) {
        console.log(error);
        error(error);
    });
};

var orgUserLanguages = function(org, success, error) {
    callGithub(Github.orgs.getMembers, {
        org: org,
        per_page: 100
    }).then(function(members) {
        return Promise.all(_.map(members, function(member) {
            return callGithub(Github.repos.getFromUser, {
                user: member.login
            }).then(function(repositories) {
                return Promise.all(_.map(repositories, function(repository) {
                    return callGithub(Github.repos.getLanguages, {
                        user: member.login,
                        repo: repository.name
                    });
                }));
            });
        }));
    }).then(function(languages) {
        languages = _.reduce(_.flatten(languages), function(mem, language) {
            _.each(_.omit(language, 'meta'), function(value, key) {
                if (mem[key] == undefined) mem[key] = 0;
                mem[key] = mem[key] + value;
            })
            return mem;
        }, {})
        
        var json = getPieChart("Languages used by organisation", "Amount of bytes written",
            _.map(languages, function(value, key) {return [key, value]})    
        );
        success(json);
    }).catch(function(error) {
        console.log(error);
        error(error);
    });
}

var orgUserContrib = function(org, reply) {
    Async.waterfall([
        function(callback) {
            console.log("getting member");
            Github.orgs.getMembers({
                org: org,
                per_page: 100
            }, function (err, res) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, res);
            });
        },
        function(res, callback) {
            console.log("got members, getting details");
            var userData = [];
            var callbackCount = res.length;
            for (var i in res) {
                var user = res[i]
                if (user.login) {
                    //console.log("user", user);
                    var url = 'https://github.com/users/' + user.login + '/contributions_calendar_data';
                    Request
                        .get(url)
                        .end((function(username, total) {
                            return function(err, res) {
                                var data = res.body;
                                data = data.filter(function(dataPoint) {
                                    return dataPoint[1] > 0;
                                });
                                data = data.map(function(dataPoint) {
                                    var date = new Date(dataPoint[0]);
                                    dataPoint[0] = date.getTime();
                                    return dataPoint;
                                });
                                userData.push({
                                    name: username,
                                    data: data
                                });
                                //check of this is the last call
                                if (userData.length == total) {
                                    callback(null, userData);
                                }
                            };
                        }(user.login, res.length))
                    );
                }
            }
        },
        function(userData, callback) {
            console.log("got all user details");
            callback(null, {
                chart: {
                    type: 'scatter',
                    zoomType: 'xy'
                },
                title: {
                    text: 'Contributions of Users'
                },
                subtitle: {
                    text: 'Source: GitHub'
                },
                xAxis: {
                    type: 'datetime',
                    title: {
                        enabled: true,
                        text: 'Date'
                    },
                    startOnTick: true,
                    endOnTick: true,
                    showLastLabel: true
                },
                tooltip: {
                    pointFormat: 'Contributions: <b>{point.y}</b>'
                },
                yAxis: {
                    title: {
                        text: 'Number of Contributions'
                    },
                    ceiling: 5000
                },
                legend: {
                    layout: 'vertical',
                    align: 'left',
                    verticalAlign: 'top',
                    floating: true,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1
                },
                plotOptions: {
                    scatter: {
                        marker: {
                            radius: 5,
                            states: {
                                hover: {
                                    enabled: true,
                                    lineColor: 'rgb(100,100,100)'
                                }
                            }
                        },
                        states: {
                            hover: {
                                marker: {
                                    enabled: false
                                }
                            }
                        }
                    }
                }, 
                series: userData
            });
        },
        function(highchartsJson, callback) {
            console.log("reply");
            reply(highchartsJson);
        }
    ]);
};

exports.orgUserRepo = orgUserRepo;
exports.orgUserContrib = orgUserContrib;
exports.orgUserLanguages = orgUserLanguages;
