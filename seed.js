var assert = require('assert');

async function deployToken(
  /* arguments are what you pass to EIP20Factory.createEIP20 */
  initialAmount,
  name,
  decimals,
  symbol,
  /* plus transaction opts */
  web3opts
) /* returns EIP20Interface object for new token */ {
  const EIP20Interface = artifacts.require('erc20-tokens/EIP20Interface'),
    EIP20Factory = artifacts.require('EIP20Factory'); // turns out it's local when deployed by a local migration
  const tokenFactory = EIP20Factory.at(EIP20Factory.address);

  const newTokenAddr = await tokenFactory.createEIP20.call(
    initialAmount,
    name,
    decimals,
    symbol,
    web3opts
  );
  await tokenFactory.createEIP20(initialAmount, name, decimals, symbol, web3opts);
  assert(await tokenFactory.verifyEIP20.call(newTokenAddr, web3opts), 'deployToken failed');
  return EIP20Interface.at(newTokenAddr);
}

module.exports = function(callback) {
  const accounts = web3.eth.accounts;

  const EtherDelta = artifacts.require('EtherDelta');
  const etherdelta = EtherDelta.at(EtherDelta.address);

  Promise.resolve(deployToken(100000, 'Simon Bucks', 2, 'SBX', { from: accounts[0] })).then(res => {
    console.log(res.address);
    callback();
  });
};
