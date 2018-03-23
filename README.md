# ForkDelta's Smart Contract

This is the official repository for all things regarding the ForkDela smart contract.  
All contracts are located in the `contracts` folder.

## Summary
- [Libraries](#libraries)
  - [SafeMath](#library-safemath)
- [Contracts](#contracts)
  - [Token](#contract-token)
    - [Variables](#token-variables)
    - [Events](#token-events)
    - [Functions](#token-functions)
  - [ForkDelta](#contract-forkdelta)
    - [Variables](#forkdelta-variables)
    - [Events](#forkdelta-events)
    - [Modifiers](#forkdelta-modifiers)
    - [Functions](#forkdelta-functions)

## Libraries

### library `SafeMath`

This is a library for math operations with safety checks that will throw on error.

## Contracts

### contract `Token`

This is the token interface necessary for working with tokens within the exchange contract.

#### `Token` Variables

decimals `uint public decimals`  
name `string public name`  

#### `Token` Events

##### `event Transfer(address indexed _from, address indexed _to, uint256 _value);`
##### `event Approval(address indexed _owner, address indexed _spender, uint256 _value);`


#### `Token` Functions

#### `function totalSupply() public constant returns (uint256 supply) {}`
@return total amount of tokens

#### `function balanceOf(address _owner) public constant returns (uint256 balance) {}`
@param \_owner The address from which the balance will be retrieved  
@return The balance  

#### `function transfer(address _to, uint256 _value) public returns (bool success) {}`
@notice send `_value` token to `_to` from `msg.sender`  
@param _to The address of the recipient  
@param _value The amount of token to be transferred  
@return Whether the transfer was successful or not  
  
#### `function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {}`
@notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`  
@param _from The address of the sender  
@param _to The address of the recipient  
@param _value The amount of token to be transferred  
@return Whether the transfer was successful or not  

#### `function approve(address _spender, uint256 _value) public returns (bool success) {}`
@notice `msg.sender` approves `_addr` to spend `_value` tokens  
@param _spender The address of the account able to transfer the tokens  
@param _value The amount of wei to be approved for transfer  
@return Whether the approval was successful or not  
  
#### `function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {}`
@param _owner The address of the account owning tokens  
@param _spender The address of the account able to transfer the tokens  
@return Amount of remaining tokens allowed to spent  

---

### contract `ForkDelta`

This is the main contract for the ForkDelta exchange.  
This contract uses the SafeMath library for uint variables.  

#### `ForkDelta` Variables

__admin__ `address public admin`  
The administrator's Ethereum address

__feeAccount__ `address public feeAccount`  
The Ethereum address that fees will be sent to

__feeTake__ `uint public feeTake`  
The amount (in ether) that will be taken as a fee on takes

__freeUntilDate__ `uint public freeUntilDate`  
The date in UNIX timestamp that trades will be free until

__depositingTokenFlag__ `bool private depositingTokenFlag`  
True when Token.transferFrom is being called from depositToken

__tokens__ `mapping (address => mapping (address => uint)) public tokens`  
The mapping of token addresses to mapping of account balances (token=0 means Ether)

__orders__ `mapping (address => mapping (bytes32 => bool)) public orders`  
The mapping of user accounts to mapping of order hashes to booleans (true = submitted by user, equivalent to offchain signature)

__orderFills__ `mapping (address => mapping (bytes32 => uint)) public orderFills;`  
The mapping of user accounts to mapping of order hashes to uints (amount of order that has been filled)

__predecessor__ `address public predecessor`  
Address of the previous version of this contract. If address(0), this is the first version

__successor__ `address public successor`  
Address of the next version of this contract. If address(0), this is the most up to date version

__version__ `uint16 public version`  
The version # of the contract

#### `ForkDelta` Events

##### `event Order(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user);`
##### `event Cancel(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s);`
##### `event Trade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, address get, address give);`
##### `event Deposit(address token, address user, uint amount, uint balance);`
##### `event Withdraw(address token, address user, uint amount, uint balance);`
##### `event FundsMigrated(address user, address newContract);`

#### `ForkDelta` Modifiers

#### `modifier isAdmin()`
This is a modifier for functions to check if the sending user address is the same as the admin user address.

#### `ForkDelta` Functions

#### `function ForkDelta(address admin_, address feeAccount_, uint feeTake_, uint freeUntilDate_, address predecessor_) public`
Constructor function. This is only called on contract creation.

#### `function() public`
The fallback function. Ether transfered into the contract is not accepted.

#### `function changeAdmin(address admin_) public isAdmin`
Changes the official admin user address. Accepts Ethereum address.

#### `function changeFeeAccount(address feeAccount_) public isAdmin`
Changes the account address that receives trading fees. Accepts Ethereum address.

#### `function changeFeeTake(uint feeTake_) public isAdmin`
Changes the fee on takes. Can only be changed to a value less than it is currently set at.

#### `function changeFreeUntilDate(uint freeUntilDate_) public isAdmin`
Changes the date that trades are free until. Accepts UNIX timestamp.

#### `function setSuccessor(address successor_) public isAdmin`
Changes the successor. Used in updating the contract.

#### `function deposit() public payable`
This function handles deposits of Ether into the contract.  
Emits a Deposit event.  
Note: With the payable modifier, this function accepts Ether.  

#### `function withdraw(uint amount) public`
This function handles withdrawals of Ether from the contract.  
Verifies that the user has enough funds to cover the withdrawal.  
Emits a Withdraw event.  
@param amount uint of the amount of Ether the user wishes to withdraw  
  
#### `function depositToken(address token, uint amount) public`
This function handles deposits of Ethereum based tokens to the contract.  
Does not allow Ether.  
If token transfer fails, transaction is reverted and remaining gas is refunded.  
Emits a Deposit event.  
Note: Remember to call Token(address).approve(this, amount) or this contract will not be able to do the transfer on your behalf.  
@param token Ethereum contract address of the token or 0 for Ether  
@param amount uint of the amount of the token the user wishes to deposit  

#### `function tokenFallback( address sender, uint amount, bytes data) public returns (bool ok)`
This function provides a fallback solution as outlined in ERC223.  
If tokens are deposited through depositToken(), the transaction will continue.  
If tokens are sent directly to this contract, the transaction is reverted.  
@param sender Ethereum address of the sender of the token  
@param amount amount of the incoming tokens  
@param data attached data similar to msg.data of Ether transactions  
  
#### `function withdrawToken(address token, uint amount) public`
This function handles withdrawals of Ethereum based tokens from the contract.  
Does not allow Ether.  
If token transfer fails, transaction is reverted and remaining gas is refunded.  
Emits a Withdraw event.  
@param token Ethereum contract address of the token or 0 for Ether  
@param amount uint of the amount of the token the user wishes to withdraw  

#### `function balanceOf(address token, address user) public constant returns (uint)`
Retrieves the balance of a token based on a user address and token address.  
@param token Ethereum contract address of the token or 0 for Ether  
@param user Ethereum address of the user  
@return the amount of tokens on the exchange for a given user address  

#### `function order(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce) public`
Stores the active order inside of the contract.  
Emits an Order event.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  

#### `function trade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s, uint amount) public`
Facilitates a trade from one user to another.  
Requires that the transaction is signed properly, the trade isn't past its expiration, and all funds are present to fill the trade.  
Calls tradeBalances().  
Updates orderFills with the amount traded.  
Emits a Trade event.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
Note: amount is in amountGet / tokenGet terms.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  
@param user Ethereum address of the user who placed the order  
@param v part of signature for the order hash as signed by user  
@param r part of signature for the order hash as signed by user  
@param s part of signature for the order hash as signed by user  
@param amount uint amount in terms of tokenGet that will be "buy" in the trade  
  
#### `function tradeBalances(address tokenGet, uint amountGet, address tokenGive, uint amountGive, address user, uint amount) private`
This is a private function and is only being called from trade().  
Handles the movement of funds when a trade occurs.  
Takes fees.  
Updates token balances for both buyer and seller.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
Note: amount is in amountGet / tokenGet terms.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param user Ethereum address of the user who placed the order  
@param amount uint amount in terms of tokenGet that will be "buy" in the trade  
  
#### `function testTrade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s, uint amount, address sender) public constant returns(bool)`
This function is to test if a trade would go through.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
Note: amount is in amountGet / tokenGet terms.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  
@param user Ethereum address of the user who placed the order  
@param v part of signature for the order hash as signed by user  
@param r part of signature for the order hash as signed by user  
@param s part of signature for the order hash as signed by user  
@param amount uint amount in terms of tokenGet that will be "buy" in the trade  
@param sender Ethereum address of the user taking the order  
@return bool: true if the trade would be successful, false otherwise  
  
#### `function availableVolume(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s) public constant returns(uint)`
This function checks the available volume for a given order.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  
@param user Ethereum address of the user who placed the order  
@param v part of signature for the order hash as signed by user  
@param r part of signature for the order hash as signed by user  
@param s part of signature for the order hash as signed by user  
@return uint: amount of volume available for the given order in terms of amountGet / tokenGet  
  
#### `function amountFilled(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s) public constant returns(uint)`
This function checks the amount of an order that has already been filled.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  
@param user Ethereum address of the user who placed the order  
@param v part of signature for the order hash as signed by user  
@param r part of signature for the order hash as signed by user  
@param s part of signature for the order hash as signed by user  
@return uint: amount of the given order that has already been filled in terms of amountGet / tokenGet  
  
#### `function cancelOrder(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, uint8 v, bytes32 r, bytes32 s) public`
This function cancels a given order by editing its fill data to the full amount.  
Requires that the transaction is signed properly.  
Updates orderFills to the full amountGet  
Emits a Cancel event.  
Note: tokenGet & tokenGive can be the Ethereum contract address.  
@param tokenGet Ethereum contract address of the token to receive  
@param amountGet uint amount of tokens being received  
@param tokenGive Ethereum contract address of the token to give  
@param amountGive uint amount of tokens being given  
@param expires uint of block number when this order should expire  
@param nonce arbitrary random number  
@param user Ethereum address of the user who placed the order  
@param v part of signature for the order hash as signed by user  
@param r part of signature for the order hash as signed by user  
@param s part of signature for the order hash as signed by user  
@return uint: amount of the given order that has already been filled in terms of amountGet / tokenGet  

#### `function migrateFunds(address newContract, address[] tokens_) public`
User triggered function to migrate funds into a new contract to ease updates.
Emits a FundsMigrated event.
@param address Contract address of the new contract we are migrating funds to
@param address[] Array of token addresses that we will be migrating to the new contract

#### `function depositForUser(address user) public payable`
This function handles deposits of Ether into the contract, but allows specification of a user.
Note: This is generally used in migration of funds.
Note: With the payable modifier, this function accepts Ether.

#### `function depositTokenForUser(address token, uint amount, address user) public`
This function handles deposits of Ethereum based tokens into the contract, but allows specification of a user.
Does not allow Ether.
If token transfer fails, transaction is reverted and remaining gas is refunded.
Note: This is generally used in migration of funds.
Note: With the payable modifier, this function accepts Ether.
Note: Remember to call Token(address).approve(this, amount) or this contract will not be able to do the transfer on your behalf.
@param token Ethereum contract address of the token or 0 for Ether
@param amount uint of the amount of the token the user wishes to deposit
