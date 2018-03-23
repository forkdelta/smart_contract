var ForkDelta = artifacts.require("./ForkDelta.sol");
var LSafeMath = artifacts.require("./LSafeMath.sol");

var SampleToken = artifacts.require("./test/SampleToken.sol");

module.exports = function(deployer, network, accounts) {
  if (network == "develop" || network == "development") {
    admin = accounts[1]
    feeAccount = accounts[2];
    feeMake = 0;
    feeTake = 3000000000000000;
    freeUntilDate= 0;
    deployer.deploy(SampleToken, 100000000*1000000000000000000 , "SampleToken", 18, "SMPL");    
  }
  if (network == "live" || network == "production") {
    //TODO: set admin and fee accounts for production
    admin = null
    feeAccount = null;
    feeMake = 0;
    feeTake = 3000000000000000;
    freeUntilDate= 0;
  }
deployer.deploy(LSafeMath);
deployer.link(LSafeMath, ForkDelta);
deployer.deploy(ForkDelta, admin, feeAccount, feeMake, feeTake, freeUntilDate);
}

