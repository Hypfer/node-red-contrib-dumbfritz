var fritz = require('smartfritz');

module.exports = function(RED) {
    function DumbFritzNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var session;

        fritz.getSessionID("user", "", function(sid){
            session = sid;
            node.log('Session ID: ' + sid);
        }, {url: config.url});


        node.on('input', function(msg) {
            fritz.getSwitchPower(session, config.aid, function(milliwatts){ //TODO: Error handling
                node.send({payload: {name: config.name, watt: parseInt(milliwatts)}});
            }, {url: config.url});
        });
    }

    RED.nodes.registerType("dumbfritz", DumbFritzNode);
};