import util from './helpers/util.js';

var ForkDelta = artifacts.require("./ForkDelta.sol");
var SampleToken = artifacts.require("./test/SampleToken.sol");

var sha256 = require('js-sha256').sha256;
var async = require('async');
var config = require('../truffle.js');



contract('ForkDelta', function(accounts) {

  var unlockedAccounts = 6;
  var accs = accounts.slice(0, unlockedAccounts - 1); // Last account is used for fees only
  const gasPrice = config.networks.development.gasPrice;
  const adminAccount = unlockedAccounts - 2;
  const feeAccount = unlockedAccounts - 1;
  const feeMake = 0;
  const feeTake = 3000000000000000;
  const freeUntilDate = 0;
  const userToken = 2000000;
  const depositedEther = 100000;
  const depositedToken = 1000000;
  const defaultExpirationInBlocks = 100;
  const failedTransactionError = "Error: VM Exception while processing transaction: invalid opcode";

  ///////////////////////////////////////////////////////////////////////////////////
  // Helper functions
  ///////////////////////////////////////////////////////////////////////////////////

  // Creates a test token and distributes among all test accounts
  function createAndDistributeToken(symbol, callback) {
    var token;
    return SampleToken.new(userToken*accounts.length, "TestToken", 3, symbol, {from: accounts[feeAccount]}).then(function(instance) {
      token = instance;
    }).then(function(result) {
      return new Promise((resolve, reject) => {
        async.eachSeries(accounts,
          (account, callbackEach) => {
            token.transfer(account, userToken, {from: accounts[feeAccount]}).then(function(result) {
              callbackEach(null);
            });
          },
          () => {
            resolve(token);
          });
      });
    });
  }

  // Deposits a portion of the token to the exchange from all test accounts
  function depositTokenByAllAccounts(fd, token) {
    return new Promise((resolve, reject) => {
      async.eachSeries(accounts,
        (account, callbackEach) => {
          token.approve(fd.address, depositedToken, {from: account}).then(function(result) {
            fd.depositToken(token.address, depositedToken, {from: account}).then(function(result) {
              callbackEach(null);
            });
          },
          () => {
            resolve();
          });
        });
    });
  }

  // Deposit ether to the exchange from all test accounts
  function depositEtherByAllAccounts(fd) {
    return new Promise((resolve, reject) => {
      async.eachSeries(accs,
        (account, callbackEach) => {
          fd.deposit({from: account, value: depositedEther}).then(function(result) {
            callbackEach(null);
          });
        },
        () => {
          resolve();
        });
    });
  }

  // Creates a bunch of tokens, distributes them, deposits ether and tokens
  // by all the participants to the exchange so we can test different operations
  function initialConfiguration() {
    var token1, token2;
    var fd;
    return ForkDelta.new(accounts[adminAccount], accounts[feeAccount], feeMake, feeTake, freeUntilDate, {from: accounts[adminAccount]}).then(function(instance) {
      fd = instance;
      return createAndDistributeToken("TT1");
    }).then(function(instance) {
      token1 = instance;
      return createAndDistributeToken("TT2");
    }).then(function(instance) {
      token2 = instance;
      return depositTokenByAllAccounts(fd, token1);
    }).then(function(result) {
      return depositTokenByAllAccounts(fd, token2);
    }).then(function(result) {
      return depositEtherByAllAccounts(fd);
    }).then(function(result) {
      return {fd: fd, token1: token1, token2: token2};
    });
  }
  
  function executePromises(checks) {
    return new Promise((resolve, reject) => {
      async.eachSeries(checks,
        (check, callbackEach) => {
          check().then(function(result) {
            callbackEach(null);
          });
        },
        () => {
          resolve();
        });
    });
  }
  
  function getBlockNumber() {
    return new Promise((resolve, reject) => {
      web3.eth.getBlockNumber((error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }
  
  function getAccountBalance(account) {
    return new Promise((resolve, reject) => {
      web3.eth.getBalance(account, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }
  
  function signOrder(fd, creatorAddress, tokenGet, amountGet, tokenGive, amountGive, expires, nonce) {
    const condensed = util.pack([
      fd.address,
      tokenGet,
      amountGet,
      tokenGive,
      amountGive,
      expires,
      nonce,
    ], [160, 160, 256, 160, 256, 256, 256]);
    const hash = sha256(new Buffer(condensed, 'hex'));
    return util.promisify(util.sign, [web3, creatorAddress, hash, ''])  
  }
  
  function executeOrder(fd, creatorAddress, tokenGet, amountGet, tokenGive, amountGive, amountGiven, from, expire, nonce) {
    var realExpire;
    var realNonce = nonce || Math.floor(Math.random());
    return getBlockNumber().then(function(result) {
      realExpire = expire || result+defaultExpirationInBlocks;
      return signOrder(fd, creatorAddress, tokenGet, amountGet, tokenGive, amountGive, realExpire, realNonce);
    }).then(function(result) {
      return fd.trade(tokenGet, amountGet, tokenGive, amountGive, realExpire,
          realNonce, creatorAddress, result.v, result.r, result.s, amountGiven, {from: from});
    });
  }
  
  ///////////////////////////////////////////////////////////////////////////////////
  // Tests functions
  ///////////////////////////////////////////////////////////////////////////////////
  
  it("Depositing", function() {
    
    return initialConfiguration().then(function(result) {
      var fd = result.fd;
      var token1 = result.token1;
      var token2 = result.token2;
      
      var checks = [
        function() { return fd.balanceOf.call(token1.address, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), depositedToken, "Token #1 deposit for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(token2.address, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), depositedToken, "Token #2 deposit for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(0, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), depositedEther, "Ether deposit for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(token1.address, accounts[1]).then(function(result) {
          assert.equal(result.toNumber(), depositedToken, "Token #1 deposit for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(token2.address, accounts[1]).then(function(result) {
          assert.equal(result.toNumber(), depositedToken, "Token #2 deposit for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(0, accounts[1]).then(function(result) {
          assert.equal(result.toNumber(), depositedEther, "Ether deposit for acc #0 was not successful");
        }) },
        function() { return fd.fee.call().then(function(result) {
          assert.equal(result.toNumber().valueOf(), fee, "The fee is incorrect");
        }) }
      ];
      
      return executePromises(checks);
    });
  });
  
  it("Withdrawals", function() {

    var fd, token1;
    var userEther;
    var gasSpent = 0; // We will need it to get precise remaining ether amount
    
    return initialConfiguration().then(function(result) {
      fd = result.fd;
      token1 = result.token1;
      console.log('1');      

      var checks = [
        function() { return getAccountBalance(accounts[0]).then(function(result) {
          userEther = result.toNumber();
        }) },
        function() { return token1.balanceOf.call(accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), userToken - depositedToken, "Token #1 deposit for acc #0 is not correct");
        }) },
      ];
      
      console.log('2');      
      return executePromises(checks);
      
    }).then(function(result) {
      console.log('3');      

      var operations = [
        function() { return fd.withdraw(depositedEther, {from: accounts[0]}).then(function(result) { gasSpent += result.receipt.gasUsed; }); },
        function() { return fd.withdrawToken(token1.address, depositedToken, {from: accounts[0]}).then(function(result) { gasSpent += result.receipt.gasUsed; }); },
      ];
      
      return executePromises(operations);
      
    }).then(function(result) {

      var checks = [
        function() { return getAccountBalance(accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), userEther + depositedEther - gasSpent * gasPrice, "Ether balance was not increased");
        }) },
        function() { return token1.balanceOf.call(accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), userToken, "Token #1 balance is not increased");
        }) },
        function() { return fd.balanceOf.call(0, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), 0, "Exchange still thinks it holds some ether for the user");
        }) },
        function() { return fd.balanceOf.call(token1.address, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), 0, "Exchange still thinks it holds some tokens for the user");
        }) },
      ];
      
      return executePromises(checks);
    });
  });
  
  // Note: this tests only Eth to Token but since we treat eth internally
  // as a token with 0 address, direction is not important. It can also be
  // Token to Token for that matter.
  it("Successful trade", function() {
  
    var fd;
    
    var tokenGet = 0;       // Eth as a token type
    var tokenGive;          // Token address for wanted token
    var amountGet = 20000;   // Eth wanted
    var amountGive = 100000; // Token given in return
    var amountGiven = 10000; // Ether given by a counter-party
    
    return initialConfiguration().then(function(result) {

      fd = result.fd;
      tokenGive = result.token1.address;

      return executeOrder(fd, accounts[0], tokenGet, amountGet, tokenGive, amountGive, amountGiven, accounts[1]);

    }).then(function(result) {

      var checks = [
        function() { return fd.balanceOf.call(tokenGive, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), 950000, "Token sale for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(tokenGive, accounts[1]).then(function(result) {
          assert.equal(result.toNumber(), 1050000, "Token purchase for acc #1 was not successful");
        }) },
        function() { return fd.balanceOf.call(tokenGet, accounts[0]).then(function(result) {
          assert.equal(result.toNumber(), 110000, "Eth purchase for acc #0 was not successful");
        }) },
        function() { return fd.balanceOf.call(tokenGet, accounts[1]).then(function(result) {
          assert.equal(result.toNumber(), 89970, "Eth sale for acc #1 was not successful");
        }) },
        function() { return fd.balanceOf.call(tokenGet, accounts[feeAccount]).then(function(result) {
          assert.equal(result.toNumber(), 30, "Eth fee is incorrect");
        }) }
      ];

      return executePromises(checks);
    });
  });
    
  it("Failed trades", function() {
  
    var fd;

    var tokenGet = 0;       // Eth as a token type
    var tokenGive;          // Other token type
    var amountGet = 2000;   // Eth wanted
    var amountGive = 10000; // Token given in return
    
    var fixedExpire = 1000000000; // High enough block number
    var fixedNonse = 0;

    return initialConfiguration().then(function(result) {
    
      fd = result.fd;
      tokenGive = result.token1.address;

      // Tries to buy more than total order request
      var amountGiven1 = 3000;
      return executeOrder(fd, accounts[0], tokenGet, amountGet, tokenGive, amountGive, amountGiven1, accounts[1]);
    }).then(function(result) {
      assert(false, "Transaction passed, it should not had");
    }, function(error) {
      assert.equal(error, failedTransactionError, "Incorrect error");

      // Tries to offer more than the buyer has (using an account that didn't deposit)
      var amountGiven2 = 1000;
      return executeOrder(fd, accounts[0], tokenGet, amountGet, tokenGive, amountGive, amountGiven2, accounts[feeAccount]);
    }).then(function(result) {
      assert(false, "Transaction passed, it should not had");
    }, function(error) {
      assert.equal(error, failedTransactionError, "Incorrect error");

      // Oversubscribed order (multiple trades with overflowing total)
      var amountGiven31 = 1500;
      return executeOrder(fd, accounts[0], tokenGet, amountGet, tokenGive, amountGive, amountGiven31, accounts[1], fixedExpire, fixedNonse);
    }).then(function(result) {
      var amountGiven32 = 700;
      return executeOrder(fd, accounts[0], tokenGet, amountGet, tokenGive, amountGive, amountGiven32, accounts[1], fixedExpire, fixedNonse);
    }, function(error) {
      assert(false, "First transaction should pass, we're going to fail on a second");
    }).then(function(result) {
      assert(false, "Second transaction passed, it should not had");
    }, function(error) {
      assert.equal(error, failedTransactionError, "Incorrect error");
    });
  });
   
});