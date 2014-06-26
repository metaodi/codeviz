var Github = require('./github').getGitHub();
var Async = require('async');
var Request = require('superagent');

var orgUserRepo = function(org, reply) {
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
                    console.log("user", user);
                    Github.user.getFrom({user: user.login}, function (e, ghuser) {
                        console.log("got details from " + ghuser.login);
                        if (e) {
                            console.log(e);
                            userData.push([user.login, 0]);
                            return;
                        }
                        userData.push([ghuser.login, ghuser.public_repos]);

                        //check of this is the last call
                        if(userData.length == res.length) {
                            callback(null, userData);
                        }
                    });
                }
            }
        },
        function(userData, callback) {
            console.log("got all user details");
            callback(null, {
                title: {
                    text: 'Repositories per User',
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
                    name: 'Amount of repositories',
                    data: userData
                }]
            });
        },
        function(highchartsJson, callback) {
            console.log("reply");
            reply(highchartsJson);
        }
    ]);
};

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
