var EtherDelta = artifacts.require('./EtherDelta.sol');
var EIP20Factory = artifacts.require('erc20-tokens/EIP20Factory');

module.exports = function(deployer, network, accounts) {
  const admin = accounts[1],
    feeAccount = accounts[2],
    accountLevelsAddr = null,
    feeMake = 0,
    feeTake = 3000000000000000,
    feeRebate = 0;

  if (network === 'develop') {
    console.log('network == develop, deploying EIP20Factory for your convinience');
    deployer.deploy(EIP20Factory);
  }

  deployer.deploy(EtherDelta, admin, feeAccount, accountLevelsAddr, feeMake, feeTake, feeRebate);
};
