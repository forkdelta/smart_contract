var EtherDelta = artifacts.require('./EtherDelta.sol');

module.exports = function(deployer, network, accounts) {
  const admin = accounts[1],
    feeAccount = accounts[2],
    accountLevelsAddr = null,
    feeMake = 0,
    feeTake = 3000000000000000,
    feeRebate = 0;

  deployer.deploy(EtherDelta, admin, feeAccount, accountLevelsAddr, feeMake, feeTake, feeRebate);
};
