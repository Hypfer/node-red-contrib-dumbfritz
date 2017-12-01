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
                            challenge = challenge[0];

                            http.request({host:config.url, path:"/login_sid.lua?username=&response="+challenge+"-" + require('crypto').createHash('md5').update(new Buffer(challenge+'-', 'UTF-16LE')).digest('hex')},function(response){
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
                            node.error("Error:", challenge);
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
                        var energy = 'OK';
                        energy = data.trim();
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