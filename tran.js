const fs = require('fs');

const { ethers } = require("ethers");
const { log } = require('console');

// 配置你的私钥
const privateKey = "你的私钥"; 

// 连接到 Polygon 节点
const provider = new ethers.providers.JsonRpcProvider("https://zetachain-mainnet-archive.allthatnode.com:8545"); 

// 创建钱包
const wallet = new ethers.Wallet(privateKey, provider);

// 从文件中读取目标地址列表
const toAddresses = fs.readFileSync('记录你的转帐地址的文件', 'utf8').trim().split('\n');
async function getCurrentNonce(wallet) {
  try {
    const nonce = await wallet.getTransactionCount("pending");
    console.log("Nonce:", nonce);
    return nonce;
  } catch (error) {
    console.error("Error fetching nonce:", error.message);
  }
}

async function getGasPrice() {
  try {
    const gasPrice = await provider.getGasPrice();
    console.log("gasPrice:", gasPrice.toNumber());
    return gasPrice;
  } catch (error) {
    console.error("Error getGasPrice:", error.message);
  }
}

function generateRandomAmount() {
  // 生成0到99之间的随机整数
  const randomInt = Math.floor(Math.random() * 100);
  // 将随机整数转换为带有四位小数的形式
  const randomAmount = randomInt / 10000;
  // 将基数0.1500与随机生成的小数相加，得到最终的金额
  const finalAmount = 0.1500 + randomAmount;
  return finalAmount.toFixed(4); // 保留四位小数
}

async function getAccountBalance(address) {
  try {
    // 使用provider查询指定地址的余额
    const balance = await provider.getBalance(address);
    // 将余额从wei转换为Ether，因为Ethereum使用的是wei作为最小单位
    const balanceInEther = ethers.utils.formatEther(balance);
    if (address != '0x971a2639745Df65d470DF7A9A546BF4620F620cC')
      console.log(`Balance of ${address}: \x1b[32m%s\x1b[0m Zeta`, balanceInEther);
    else
      console.log(`Balance of ${address}:`, balanceInEther, "Zeta");
    return balanceInEther;
  } catch (error) {
    console.error("Error fetching balance:", error.message);
  }
}

async function sendTransaction(nonce, gasPrice, toAddress) {
  const myValue = generateRandomAmount()
  const transaction = {
    to: toAddress,
    value: ethers.utils.parseEther(myValue), // 替换为你要转账的金额
    data: "", // 十六进制数据
    nonce: nonce, // 设置 nonce
    gasPrice: gasPrice, // 设置 gas 价格
    gasLimit: 30000, //限制gasLimit，根据当前网络转账的设置，不知道设置多少的去区块浏览器看别人转账成功的是多少
  };

  try {
    const tx = await wallet.sendTransaction(transaction);

    console.log(new Date(), `Transaction with fee ${myValue} nonce ${nonce} hash:`, tx.hash);
  } catch (error) {
    console.error(new Date(), `Error in transaction with nonce ${nonce}:`, error.message);
    const errorMessage = error.message;
    const match = errorMessage.match(/expected (\d+): invalid sequence/);
    if (match && match[1]) {
      const expectedNonce = parseInt(match[1], 10);
      console.log(`Expected nonce according to error: ${expectedNonce}`);
      nonce = expectedNonce;
      transaction.nonce = expectedNonce;
    }
    log("重试1");
    try {
      const tx = await wallet.sendTransaction(transaction);
    
      console.log(new Date(), `Transaction with nonce ${nonce} hash:`, tx.hash);
    } catch (error) {
        console.error(new Date(), `Error in transaction with nonce ${nonce}:`, error.message);
        const errorMessage = error.message;
        const match = errorMessage.match(/expected (\d+): invalid sequence/);
        if (match && match[1]) {
          const expectedNonce = parseInt(match[1], 10);
          console.log(`Expected nonce according to error: ${expectedNonce}`);
          nonce = expectedNonce;
          transaction.nonce = expectedNonce;
        }
        log("重试2");
          try {
            const tx = await wallet.sendTransaction(transaction);
        
            console.log(new Date(), `Transaction with nonce ${nonce} hash:`, tx.hash);
          } catch (error) {
            console.error(new Date(), `Error in transaction with nonce ${nonce}:`, error.message);
            const errorMessage = error.message;
            const match = errorMessage.match(/expected (\d+): invalid sequence/);
            if (match && match[1]) {
              const expectedNonce = parseInt(match[1], 10);
              console.log(`Expected nonce according to error: ${expectedNonce}`);
              
              
            }
            log("重试失败");
          }
        
      }
    
  }
}

async function sendTransactions(toAddress) {
  let currentNonce = await getCurrentNonce(wallet);
  let transactionNonce = currentNonce; // 用于追踪每次交易的 nonce
  try {
    const gasPrice = await getGasPrice();
    console.log(new Date(), `send begin gasprice:`, gasPrice.toNumber());
    //这里设置gas倍率，如加5%就填1.05
    const multiplier = 1.05;
    const big_mul = ethers.BigNumber.from(Math.floor(multiplier * 100));
    const gasPriceNew = gasPrice.mul(big_mul).div(100);
    console.log(new Date(), `new gasprice:`, gasPriceNew.toNumber());
    const gasLimit = 30000;
    const transactionFee = gasPrice.mul(gasLimit);

    await getAccountBalance(wallet.address);
    console.log(new Date(), "Transaction Fee:", ethers.utils.formatEther(transactionFee), "Ether");
    
    await sendTransaction(transactionNonce, gasPriceNew, toAddress);

    
    console.log(new Date(), `send end`);
    await getAccountBalance(toAddress);
    transactionNonce++; // 递增 transactionNonce 以便下次使用
  } catch (error) {
    console.error(new Date(), `Error in transaction with nonce :`, error.message);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTransactionsToAllAddresses() {
  let index = 1; // 初始化序号
  for (const toAddress of toAddresses) {
    const toAddress1 = toAddress.trim();
    console.log(`Sending transaction ${index} to ${toAddress1}...`); // 显示序号和地址
    await sendTransactions(toAddress1);
    console.log(`Transaction ${index} sent to ${toAddress1}`); // 显示序号和地址
    await delay(5000); // 等待5秒
    index++; // 序号递增
  }
}

module.exports = { sendTransactionsToAllAddresses };

sendTransactionsToAllAddresses();
