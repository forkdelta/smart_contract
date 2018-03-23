import BigNumber from 'bignumber.js'
import Tx from 'ethereumjs-tx'
import ethUtil from 'ethereumjs-util'
import coder from 'web3/lib/solidity/coder.js'
import utils from 'web3/lib/utils/utils.js'
import sha3 from 'web3/lib/utils/sha3.js'

export function promisify (func, args, self) {
  return new Promise(function (resolve, reject) {
    args.push((err, res) => {
      if(err) return reject(err)
      resolve(res)
    })

    func.apply(self, args)
  })
}

export function ethToWei (eth, divisorIn) {
  const divisor = !divisorIn ? 1000000000000000000 : divisorIn

  return parseFloat((eth * divisor).toPrecision(10))
}

export function weiToEth (wei, divisorIn) {
  const divisor = !divisorIn ? 1000000000000000000 : divisorIn

  return (wei / divisor).toFixed(3)
}

export function getDivisor (token) {
  let result = 1000000000000000000
  if (token && token.decimals !== undefined) {
    result = Math.pow(10, token.decimals)
  }

  return new BigNumber(result)
}

export function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

export function getNextNonce (web3, address, callback) {
  web3.eth.getTransactionCount(address, (err, result) => {
    if (err) console.log('util:34', err)

    const nextNonce = Number(result)
    // Note. initial nonce is 2^20 on testnet,
    // but getTransactionCount already starts at 2^20.
    callback(undefined, nextNonce)
  })
}

export function send (web3, contract, address, functionName, argsIn, fromAddress, privateKeyIn, nonceIn, callback) {
  let privateKey = privateKeyIn
  if (privateKeyIn && privateKeyIn.substring(0, 2) === '0x') {
    privateKey = privateKeyIn.substring(2, privateKeyIn.length);
  }

  function encodeConstructorParams(abi, params) {
    return (
      abi
        .filter(json => json.type === 'constructor' && json.inputs.length === params.length)
        .map(json => json.inputs.map(input => input.type))
        .map(types => coder.encodeParams(types, params))[0] || ''
    )
  }

  const args = Array.prototype.slice.call(argsIn).filter(a => a !== undefined)
  let options = {}

  if (typeof args[args.length - 1] === 'object' && args[args.length - 1].gas) {
    args[args.length - 1].gasPrice = config.ethGasPrice
    args[args.length - 1].gasLimit = args[args.length - 1].gas

    delete args[args.length - 1].gas
  }

  if (utils.isObject(args[args.length - 1])) {
    options = args.pop()
  }

  getNextNonce(web3, fromAddress, (err, nextNonce) => {
    let nonce = nonceIn
    if (nonceIn === undefined || nonceIn < nextNonce) {
      nonce = nextNonce
    }

    options.nonce = nonce
    if (functionName === 'constructor') {
      if (options.data.slice(0, 2) !== '0x') {
        options.data = `0x${options.data}`
      }
      const encodedParams = encodeConstructorParams(contract, args)
      console.log(encodedParams)
      options.data += encodedParams
    } else if (!contract || !functionName) {
      options.to = address
    } else {
      options.to = address
      const functionAbi = contract.find(element => element.name === functionName)
      const inputTypes = functionAbi.inputs.map(x => x.type)
      const typeName = inputTypes.join()
      options.data =
        `0x${
          sha3(`${functionName}(${typeName})`).slice(0, 8)
          }${coder.encodeParams(inputTypes, args)}`
    }

    try {
      const tx = new Tx(options)

      options.from = fromAddress
      options.gas = options.gasLimit
      delete options.gasLimit

      web3.eth.sendTransaction(options, (err, hash) => {
        if (err) return console.log('util:105', err)

        callback(undefined, { txHash: hash, nonce: nonce + 1 })
      });
    } catch (errCatch) {
      callback(errCatch, { txHash: undefined, nonce });
    }
  })
}

// Crypto
export function multiplyByNumber(numIn, x, base) {
  let num = numIn
  if (num < 0) return null
  if (num === 0) return []
  let result = []
  let power = x
  while (true) { // eslint-disable-line no-constant-condition
    if (num & 1) { // eslint-disable-line no-bitwise
      result = add(result, power, base)
    }
    num = num >> 1 // eslint-disable-line operator-assignment, no-bitwise
    if (num === 0) break
    power = add(power, power, base)
  }
  return result
}

export function add (x, y, base) {
  const z = []
  const n = Math.max(x.length, y.length)
  let carry = 0
  let i = 0
  while (i < n || carry) {
    const xi = i < x.length ? x[i] : 0
    const yi = i < y.length ? y[i] : 0
    const zi = carry + xi + yi
    z.push(zi % base)
    carry = Math.floor(zi / base)
    i += 1
  }

  return z
}

export function parseToDigitsArray (str, base) {
  const digits = str.split('')
  const ary = []
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const n = parseInt(digits[i], base)
    if (isNaN(n)) return null
    ary.push(n)
  }

  return ary
}

export function convertBase (str, fromBase, toBase) {
  const digits = parseToDigitsArray(str, fromBase)
  if (digits === null) return null
  let outArray = []
  let power = [1]
  for (let i = 0; i < digits.length; i += 1) {
    if (digits[i]) {
      outArray = add(outArray,
        multiplyByNumber(digits[i], power, toBase), toBase)
    }
    power = multiplyByNumber(fromBase, power, toBase)
  }
  let out = ''
  for (let i = outArray.length - 1; i >= 0; i -= 1) {
    out += outArray[i].toString(toBase)
  }
  if (out === '') out = 0

  return out
}

export function decToHex (dec, lengthIn) {
  let length = lengthIn
  if (!length) length = 32
  if (dec < 0) {
    // return convertBase((Math.pow(2, length) + decStr).toString(), 10, 16)
    return (new BigNumber(2)).pow(length).add(new BigNumber(dec)).toString(16)
  }
  let result = null
  try {
    result = convertBase(dec.toString(), 10, 16)
  } catch (err) {
    result = null
  }
  if (result) {
    return result
  }
  return (new BigNumber(dec)).toString(16)
}

export function zeroPad (num, places) {
  const zero = (places - num.toString().length) + 1

  return Array(+(zero > 0 && zero)).join('0') + num
}

export function pack (dataIn, lengths) {
  let packed = ''
  const data = dataIn.map(x => x)

  for (let i = 0; i < lengths.length; i += 1) {
    if (typeof (data[i]) === 'string' && data[i].substring(0, 2) === '0x') {
      if (data[i].substring(0, 2) === '0x') data[i] = data[i].substring(2)
      packed += zeroPad(data[i], lengths[i] / 4)
    } else if (typeof (data[i]) !== 'number' && /[a-f]/.test(data[i])) {
      if (data[i].substring(0, 2) === '0x') data[i] = data[i].substring(2)
      packed += zeroPad(data[i], lengths[i] / 4)
    } else {
      packed += zeroPad(decToHex(data[i], lengths[i]), lengths[i] / 4)
    }
  }

  return packed
}

export function sign (web3, address, msgToSignIn, privateKeyIn, callback) {
  let msgToSign = msgToSignIn
  if (msgToSign.substring(0, 2) !== '0x') msgToSign = `0x${msgToSign}`

  function prefixMessage(msgIn) {
    let msg = msgIn
    msg = new Buffer(msg.slice(2), 'hex')
    msg = Buffer.concat([
      new Buffer(`\x19Ethereum Signed Message:\n${msg.length.toString()}`),
      msg])
    msg = web3.sha3(`0x${msg.toString('hex')}`, { encoding: 'hex' })
    msg = new Buffer(msg.slice(2), 'hex')
    return `0x${msg.toString('hex')}`
  }

  function testSig(msg, sig) {
    const recoveredAddress =
      `0x${ethUtil.pubToAddress(ethUtil.ecrecover(msg, sig.v, sig.r, sig.s)).toString('hex')}`
    return recoveredAddress === address
  }

  if (privateKeyIn) {
    let privateKey = privateKeyIn
    if (privateKey.substring(0, 2) === '0x') privateKey = privateKey.substring(2, privateKey.length)
    msgToSign = prefixMessage(msgToSign)
    try {
      const sig = ethUtil.ecsign(
        new Buffer(msgToSign.slice(2), 'hex'),
        new Buffer(privateKey, 'hex'))
      const r = `0x${sig.r.toString('hex')}`
      const s = `0x${sig.s.toString('hex')}`
      const v = sig.v
      const result = { r, s, v }
      callback(undefined, result)
    } catch (err) {
      callback(err)
    }
  } else {
    web3.version.getNode((error, node) => {
      // these nodes still use old-style eth_sign
      if (node && node.match('MetaMask')) {
        msgToSign = prefixMessage(msgToSign)
      }

      web3.eth.sign(address, msgToSign, (err, sigResult) => {
        if (err) {
          callback('Failed to sign message 1')
        } else {
          const sigHash = sigResult
          const sig = ethUtil.fromRpcSig(sigHash)
          let msg
          if (node && node.match('MetaMask')) {
            msg = new Buffer(msgToSign.slice(2), 'hex')
          } else {
            msg = new Buffer(prefixMessage(msgToSign).slice(2), 'hex')
          }
          if (testSig(msg, sig, address)) {
            const r = `0x${sig.r.toString('hex')}`
            const s = `0x${sig.s.toString('hex')}`
            const v = sig.v
            const result = { r, s, v }
            callback(undefined, result)
          } else {
            callback('Failed to sign message 2')
          }
        }
      })
    })
  }
}