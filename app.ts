import debug = require('debug');
import express = require('express');
import path = require('path');

import routes from './routes/index';
import users from './routes/user';

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err: any, req, res, next) => {
        res.status(err['status'] || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err: any, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

console.log('Starting up Steem gateway . . . .');

// PoA Ethereum Setup
const Web3 = require('web3');
const { setupLoader } = require('@openzeppelin/contract-loader');
// Set up web3 object and a contract loader 
const web3 = new Web3('ws://localhost:8545');
const loader = setupLoader({ provider: web3 }).web3;
// Set up a web3 contract using the contract loader 
const contract = '0xCfEB869F69431e42cdB54A4F4f105C19C080A601';
const token = loader.fromArtifact('testToken', contract);
// Set up instance specific variables
const coldStore = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
const tokenDecimals = 100;
ethWatcher();

// Steem Setup
const steem = require("steem");
const steemName = 'gba-richmond';
const tokenSymbol = 'PLAY';
const postingWif = '5KhqqHYWNBaNBB9b1Qj82p5eGaoTiMuGZiu297qGsUFtiE1C6xb';
const activeWif = '5JtgE62L5LjZA4fn4H3F1cnzJyysYqWA1EN5nhMkSQWJyUFqQJU';
// APIs periodically go down, sometimes for days, so we have three to choose from
//steem.api.setOptions({ url: 'wss://steemd-int.steemit.com' });
steem.api.setOptions({ url: 'https://api.steemit.com' });
//steem.api.setOptions({ url: 'https://anyx.io' });
steemWatcher();

// ******************************************************************************************
// Watching PoA Ethereum blockchain & taking actions on Steem

function eHandler(error, event) {
    const retVals = event.returnValues;
    console.log("ETHEREUM " + retVals.from + " transferred " +
        (retVals.value / tokenDecimals) + " of " + tokenSymbol + " tokens to " +
        retVals.to + " - " + retVals.memo);

    if (retVals.to == coldStore) {
        let amount: string = (retVals.value / tokenDecimals).toString();
        var json = JSON.stringify({
            contractName: "tokens",
            contractAction: "transfer",
            contractPayload: {
                symbol: tokenSymbol,
                to: retVals.memo,
                quantity: amount,
                memo: "Transfer from ethereum"
            }
        });
        steem.broadcast.customJson(
            activeWif,
            [steemName],    // Required_auths
            [],             // Required Posting Auths
            'ssc-mainnet1', // Id
            json,
            function (err, result) { console.log(err, result); }
        );
    }
}

async function ethWatcher() {
    //token.getPastEvents('OurTransfer', {
    //    fromBlock: 0,
    //    toBlock: 'latest'
    //}, function (error, events) { console.log("ETHEREUM past events " + JSON.stringify(events)); });

    token.events.OurTransfer({
        fromBlock: 0
    }, function (error, event) { eHandler(error, event); });

}

// ******************************************************************************************
// Watching Steem blockchain & taking actions on PoA Ethereum

function sHandler(res, x) {
    if (x.contractPayload.symbol == tokenSymbol) {
        const vars = x.contractPayload;
        console.log("STEEM " + res.required_auths + " transferred " +
            vars.quantity + " " + vars.symbol +
            " tokens to " + vars.to + " - " + vars.memo);
        if (vars.to == steemName) {
            const amount = vars.quantity * tokenDecimals;
            token.methods.approve(coldStore, amount)
                .send({ from: coldStore })
                .on('receipt', function (receipt) { console.log(receipt); })
                .on('error', console.error);
            token.methods.ourTransferFrom(coldStore, vars.memo, amount, "from Steem")
                .send({ from: coldStore })
                .on('receipt', function (receipt) { console.log(receipt); })
                .on('error', console.error);
        }
    }
}

function steemWatcher() {
    try {
        steem.api.streamOperations(function (err, res) {
            if (err)
                console.log("Caught streamOps err:" + err);
            else try {
                if (res[0] == "custom_json" &&
                    res[1].id == "ssc-mainnet1") {
                    var acts = JSON.parse(res[1].json);
                    if (acts.contractName == "tokens" &&
                        acts.contractAction == "transfer") {
                        if (Array.isArray(acts)) {
                            acts.forEach(act => {
                                sHandler(res[1], act)
                            });
                        } else sHandler(res[1], acts);
                    }
                }
            }
            catch (ex) {
                console.log("Our error: " + ex);
                // likely the format of the result is 
                // corrupted and/or not what we expected
            }
        });
    }
    catch (ex) {
        console.log("Uncaught streamOps error: " + ex);
        steemWatcher();
    }
}

// ******************************************************************************************

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});
