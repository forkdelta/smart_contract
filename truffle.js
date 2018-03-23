
require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {

    development: {
      host: "localhost",
      port: 7545,
      network_id: "5777" 
    },

    live: {
      network_id: 1,
      host: "localhost",
      port: 8545,
      //from: "", // default address to use for any transaction Truffle makes during migrations
      gas: 5000000, // Gas limit used for deployments
      gasPrice: 20000000000  //20 Gwei
    },    
  },
  
  mocha: {
    useColors: true,
    slow: 5000
  }
};

