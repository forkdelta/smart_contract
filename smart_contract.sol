pragma solidity ^0.4.20;

contract SafeMath {
  function safeMul(uint a, uint b) pure internal returns (uint) {
    uint c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeSub(uint a, uint b) pure internal returns (uint) {
    assert(b <= a);
    return a - b;
  }

  function safeAdd(uint a, uint b) pure internal returns (uint) {
    uint c = a + b;
    assert(c>=a && c>=b);
    return c;
  }
}

contract Token {
  /// @return total amount of tokens
  function totalSupply() public constant returns (uint256 supply) {}

  /// @param _owner The address from which the balance will be retrieved
  /// @return The balance
  function balanceOf(address _owner) public constant returns (uint256 balance) {}

  /// @notice send `_value` token to `_to` from `msg.sender`
  /// @param _to The address of the recipient
  /// @param _value The amount of token to be transferred
  /// @return Whether the transfer was successful or not
  function transfer(address _to, uint256 _value) public returns (bool success) {}

  /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
  /// @param _from The address of the sender
  /// @param _to The address of the recipient
  /// @param _value The amount of token to be transferred
  /// @return Whether the transfer was successful or not
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {}

  /// @notice `msg.sender` approves `_addr` to spend `_value` tokens
  /// @param _spender The address of the account able to transfer the tokens
  /// @param _value The amount of wei to be approved for transfer
  /// @return Whether the approval was successful or not
  function approve(address _spender, uint256 _value) public returns (bool success) {}

  /// @param _owner The address of the account owning tokens
  /// @param _spender The address of the account able to transfer the tokens
  /// @return Amount of remaining tokens allowed to spent
  function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {}

  event Transfer(address indexed _from, address indexed _to, uint256 _value);
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  uint public decimals;
  string public name;
}

contract ForkDelta is SafeMath {
  address public admin; //the admin address
  address public feeAccount; //the account that will receive fees
  uint public feeMake; //percentage times (1 ether)
  uint public feeTake; //percentage times (1 ether)
  uint public freeUntilDate; //date in UNIX timestamp that trades will be free until
  bool private depositingTokenFlag; //True when Token.transferFrom is being called from depositToken
  mapping (address => mapping (address => uint)) public tokens; //mapping of token addresses to mapping of account balances (token=0 means Ether)
  mapping (address => mapping (bytes32 => bool)) public orders; //mapping of user accounts to mapping of order hashes to booleans (true = submitted by user, equivalent to offchain signature)
  mapping (address => mapping (bytes32 => uint)) public orderFills; //mapping of user accounts to mapping of order hashes to uints (amount of order that has been filled)

  event Order(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user);
  event Cancel(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s);
  event Trade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, address get, address give);
  event Deposit(address token, address user, uint amount, uint balance);
  event Withdraw(address token, address user, uint amount, uint balance);


  modifier isAdmin() {
      require(msg.sender == admin);
      _;
  }

  function ForkDelta(address admin_, address feeAccount_, uint feeMake_, uint feeTake_, uint freeUntilDate_) public {
    admin = admin_;
    feeAccount = feeAccount_;
    feeMake = feeMake_;
    feeTake = feeTake_;
    freeUntilDate = freeUntilDate_;
    depositingTokenFlag = false;
  }

  function() public {
    revert();
  }

  function changeAdmin(address admin_) public isAdmin {
    admin = admin_;
  }

  function changeFeeAccount(address feeAccount_) public isAdmin {
    feeAccount = feeAccount_;
  }

  function changeFeeMake(uint feeMake_) public isAdmin {
    require (feeMake_ <= feeMake);
    feeMake = feeMake_;
  }

  function changeFeeTake(uint feeTake_) public isAdmin {
    require(feeTake_ <= feeTake);
    feeTake = feeTake_;
  }

  function changeFreeUntilDate(uint freeUntilDate_) public isAdmin {
    freeUntilDate = freeUntilDate_;
  }

  function deposit() public payable {
    tokens[0][msg.sender] = safeAdd(tokens[0][msg.sender], msg.value);
    Deposit(0, msg.sender, msg.value, tokens[0][msg.sender]);
  }

  function withdraw(uint amount) public {
    require(tokens[0][msg.sender] >= amount);
    tokens[0][msg.sender] = safeSub(tokens[0][msg.sender], amount);
    require(msg.sender.call.value(amount)());
    Withdraw(0, msg.sender, amount, tokens[0][msg.sender]);
  }

  function depositToken(address token, uint amount) public {
    //remember to call Token(address).approve(this, amount) or this contract will not be able to do the transfer on your behalf.
    require(token!=0);
    depositingTokenFlag = true;
    require(Token(token).transferFrom(msg.sender, this, amount));
    depositingTokenFlag = false;
    tokens[token][msg.sender] = safeAdd(tokens[token][msg.sender], amount);
    Deposit(token, msg.sender, amount, tokens[token][msg.sender]);
  }

  // Support ERC223 Token.transfer()
  function tokenFallback( address sender, uint amount, bytes data) public returns (bool ok)  {
      if (depositingTokenFlag) {
        // Transfer was initiated from depositToken(). User token balance will be updated there.
        return true;
      } else {
        // Direct ECR223 Token.transfer into this contract not allowed, to keep it consistent
        // with direct transfers of ECR20 and ETH.
        revert();
      }
  }

  
  function withdrawToken(address token, uint amount) public {
    require(token!=0);
    require(tokens[token][msg.sender] >= amount);
    tokens[token][msg.sender] = safeSub(tokens[token][msg.sender], amount);
    require(Token(token).transfer(msg.sender, amount));
    Withdraw(token, msg.sender, amount, tokens[token][msg.sender]);
  }

  function balanceOf(address token, address user) public constant returns (uint) {
    return tokens[token][user];
  }

  function order(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce) public {
    bytes32 hash = sha256(this, tokenGet, amountGet, tokenGive, amountGive, expires, nonce);
    orders[msg.sender][hash] = true;
    Order(tokenGet, amountGet, tokenGive, amountGive, expires, nonce, msg.sender);
  }

  function trade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s, uint amount) public {
    //amount is in amountGet terms
    bytes32 hash = sha256(this, tokenGet, amountGet, tokenGive, amountGive, expires, nonce);
    require((
      (orders[user][hash] || ecrecover(keccak256("\x19Ethereum Signed Message:\n32", hash),v,r,s) == user) &&
      block.number <= expires &&
      safeAdd(orderFills[user][hash], amount) <= amountGet
    ));
    tradeBalances(tokenGet, amountGet, tokenGive, amountGive, user, amount);
    orderFills[user][hash] = safeAdd(orderFills[user][hash], amount);
    Trade(tokenGet, amount, tokenGive, amountGive * amount / amountGet, user, msg.sender);
  }

  function tradeBalances(address tokenGet, uint amountGet, address tokenGive, uint amountGive, address user, uint amount) private {
    
    //trades are free until this date in UNIX timestamp
    uint feeMakeXfer = 0;
    uint feeTakeXfer = 0;
    if (now >= freeUntilDate) {
      feeMakeXfer = safeMul(amount, feeMake) / (1 ether);
      feeTakeXfer = safeMul(amount, feeTake) / (1 ether);
    }
    
    tokens[tokenGet][msg.sender] = safeSub(tokens[tokenGet][msg.sender], safeAdd(amount, feeTakeXfer));
    tokens[tokenGet][user] = safeAdd(tokens[tokenGet][user], safeSub(amount, feeMakeXfer));
    tokens[tokenGet][feeAccount] = safeAdd(tokens[tokenGet][feeAccount], safeAdd(feeMakeXfer, feeTakeXfer));
    tokens[tokenGive][user] = safeSub(tokens[tokenGive][user], safeMul(amountGive, amount) / amountGet);
    tokens[tokenGive][msg.sender] = safeAdd(tokens[tokenGive][msg.sender], safeMul(amountGive, amount) / amountGet);
  }

  function testTrade(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s, uint amount, address sender) public constant returns(bool) {
    if (!(
      tokens[tokenGet][sender] >= amount &&
      availableVolume(tokenGet, amountGet, tokenGive, amountGive, expires, nonce, user, v, r, s) >= amount
    )) return false;
    return true;
  }

  function availableVolume(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s) public constant returns(uint) {
    bytes32 hash = sha256(this, tokenGet, amountGet, tokenGive, amountGive, expires, nonce);
    if (!(
      (orders[user][hash] || ecrecover(keccak256("\x19Ethereum Signed Message:\n32", hash),v,r,s) == user) &&
      block.number <= expires
    )) return 0;
    uint available1 = safeSub(amountGet, orderFills[user][hash]);
    uint available2 = safeMul(tokens[tokenGive][user], amountGet) / amountGive;
    if (available1<available2) return available1;
    return available2;
  }

  function amountFilled(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, address user, uint8 v, bytes32 r, bytes32 s) public constant returns(uint) {
    bytes32 hash = sha256(this, tokenGet, amountGet, tokenGive, amountGive, expires, nonce);
    return orderFills[user][hash];
  }

  function cancelOrder(address tokenGet, uint amountGet, address tokenGive, uint amountGive, uint expires, uint nonce, uint8 v, bytes32 r, bytes32 s) public {
    bytes32 hash = sha256(this, tokenGet, amountGet, tokenGive, amountGive, expires, nonce);
    require ((orders[msg.sender][hash] || ecrecover(keccak256("\x19Ethereum Signed Message:\n32", hash),v,r,s) == msg.sender));
    orderFills[msg.sender][hash] = amountGet;
    Cancel(tokenGet, amountGet, tokenGive, amountGive, expires, nonce, msg.sender, v, r, s);
  }
}
