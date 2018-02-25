var http = require("http");

module.exports = function(RED) {
    function DumbFritzNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var session;

        function getToken() {
            var sessionID = "";
            try {
                http.request({host:config.url, path:'/login_sid.lua'}, function(response) {
                    var str = '';
                    response.on('data', function (chunk) {
                        str += chunk;
                    });

                    response.on('end', function () {
                        var challenge = str.match("<Challenge>(.*?)</Challenge>");
                        if(Array.isArray(challenge)) {
                            challenge = challenge[1];

                            var challengeResponse = challenge +'-'+  require('crypto').createHash('md5').update(Buffer.from(challenge+"-"+config.password,"utf16le")).digest('hex');


                            http.request({host:config.url, path:"/login_sid.lua?username="+config.user+"&response=" + challengeResponse},function(response){
                                var str = '';
                                response.on('data', function (chunk) {
                                    str += chunk;
                                });
                                response.on('end', function () {
                                    sessionID = str.match("<SID>(.*?)</SID>")[1];
                                    session = sessionID;
                                    node.log('Session ID: ' + session);
                                })
                            }).on("error", function(e){
                                node.error("Error:", e);
                                setTimeout(getToken, 5000);
                            }).end();
                        } else {
                            node.error("Error:", str);
                            setTimeout(getToken, 5000);
                        }


                    });
                }).on("error", function(e){
                    node.error("Error:", e);
                    setTimeout(getToken, 5000);
                }).end();
            } catch (e) {
                node.error("Error:", e);
                setTimeout(getToken, 5000);
            }
        }

        getToken();

        node.on('input', function(msg) {
            if(session !== undefined) {
                http.request({host:config.url, path:'/webservices/homeautoswitch.lua?sid='+session+'&switchcmd=getswitchpower&ain='+config.aid},function(response){
                    var data = '';

                    response.on('data', function (chunk) {
                        data += chunk;
                    });
                    response.on('end', function () {
                        var energy = data.trim();
                        node.send({payload: {name: config.name, watt: parseInt(energy)}});
                    });
                }).on("error", function(e){
                    node.error("Error:", e);
                }).end();
            } else {
                node.error("Error:", "Missing SID");
            }

        });
    }

    RED.nodes.registerType("dumbfritz", DumbFritzNode);
};