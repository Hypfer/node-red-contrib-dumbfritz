var fritz = require('smartfritz');

module.exports = function(RED) {
    function DumbFritzNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var session;

        function getToken() {
            try {
                fritz.getSessionID("user", "", function(sid){
                    session = sid;
                    node.log('Session ID: ' + sid);
                }, {url: config.url});
            } catch (e) {
                node.error("Error:", e);
                setTimeout(getToken, 5000);
            }
        }

        getToken();

        node.on('input', function(msg) {
            if(session !== undefined) {
                try {
                    fritz.getSwitchPower(session, config.aid, function(milliwatts){
                        node.send({payload: {name: config.name, watt: parseInt(milliwatts)}});
                    }, {url: config.url});
                } catch (e) {
                    node.error("Error:", e);
                }
            }

        });
    }

    RED.nodes.registerType("dumbfritz", DumbFritzNode);
};