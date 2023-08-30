import React, { useState } from 'react';
import { ethers } from 'ethers';
import { utils } from 'ethers';
import { Connection, PublicKey,Keypair, clusterApiUrl , Transaction, sendAndConfirmTransaction,SystemProgram  } from '@solana/web3.js';
import { LCDClient, MnemonicKey } from '@terra-money/terra.js';
import CryptoJS from 'crypto-js'; // For AES encryption

// Import Axelar SDK here
import { AxelarClient } from '@axelar-network/axelarjs-sdk';

function App() {
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [wallet, setWallet] = useState(loadWallet());
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [isSignatureValid, setIsSignatureValid] = useState(false);
  const [showKeystore, setShowKeystore] = useState(false);
  const [keystorePassword, setKeystorePassword] = useState('');
  const [ setExportedKeystore] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [hardwareWalletConnected, setHardwareWalletConnected] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [multiSigAddress, setMultiSigAddress] = useState('');

  const encryptionSalt = CryptoJS.lib.WordArray.random(128 / 8); // For PBKDF2 salt
  //const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');

  const networks = [
    { id: 'eth', name: 'Ethereum', library: ethers },
    { id: 'solana', name: 'Solana', library: Connection },
    { id: 'terra', name: 'Terra', library: LCDClient },
  ];

  const handleNetworkChange = (networkId) => {
    const selectedNetwork = networks.find((network) => network.id === networkId);
    setSelectedNetwork(selectedNetwork);
    setWallet(null);
  };
  function loadWallet() {
    try {
      const encryptedKeystoreJson = localStorage.getItem('encryptedKeystore');
      if (encryptedKeystoreJson) {
        const decryptedKeystoreJson = decryptKeystore(encryptedKeystoreJson, keystorePassword);
        if (decryptedKeystoreJson) {
          // Add network-specific logic to create a wallet based on selected network
          switch (selectedNetwork.id) {
            case 'eth':
              return new ethers.Wallet.fromEncryptedJsonSync(decryptedKeystoreJson, keystorePassword);
              
            case 'solana':
              // Implement Solana wallet loading logic
              const walletInfo = JSON.parse(decryptedKeystoreJson);
              const secretKeyByteArray = Uint8Array.from(
                walletInfo.secretKey.split(',').map(Number)
              );
              const solanaWallet = new Keypair({ secretKey: secretKeyByteArray });
              return solanaWallet;
            case 'terra':
              // Implement Terra wallet loading logic
              const terraKeystore = JSON.parse(decryptedKeystoreJson);
              const terraWallet = new LCDClient({
                URL: selectedNetwork.rpcUrl,
                chainID: selectedNetwork.chainID,
              }).wallet(terraKeystore.mnemonic);
              return terraWallet;
            default:
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
    return null;
  }

  function encryptKeystore(keystoreJson, password) {
    const key = CryptoJS.PBKDF2(password, encryptionSalt, {
      keySize: 256 / 32,
      iterations: 1000,
    });
    const ciphertext = CryptoJS.AES.encrypt(keystoreJson, key, { iv: encryptionSalt });
    return ciphertext.toString();
  }

  function decryptKeystore(encryptedKeystore, password) {
    const key = CryptoJS.PBKDF2(password, encryptionSalt, {
      keySize: 256 / 32,
      iterations: 1000,
    });
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedKeystore, key, { iv: encryptionSalt });
      return decryptedBytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting keystore:', error);
      return null;
    }
  }

  const connectSolanaWallet = async () => {
    try {
      // Connect to the Solana network
      const connection = new Connection(clusterApiUrl('mainnet-beta'));
  
      // Request wallet connection
      const wallet = window.solana;
      if (wallet) {
        await wallet.connect();
  
        // Get the user's public key from the wallet
        const publicKey = wallet.publicKey;
  
        // Get the balance of the connected wallet
        const balance = await connection.getBalance(publicKey);
  
        // Display wallet information
        console.log('Connected to Solana wallet:', publicKey.toBase58());
        console.log('Wallet balance:', balance);
  
        // Set the state to indicate that the Solana wallet is connected
        setSolanaWalletConnected(true);
      } else {
        console.error('Solana wallet not found.');
      }
    } catch (error) {
      console.error('Error connecting to Solana wallet:', error);
    }
  };

  const [solanaWalletConnected, setSolanaWalletConnected] = useState(false);

// ...

const solanaNetwork = clusterApiUrl('mainnet-beta'); // Adjust the network URL if needed

const sendSolanaTransaction = async () => {
  try {
    // Check if the Solana wallet is connected
    if (!solanaWalletConnected) {
      console.error('Solana wallet is not connected.');
      return;
    }

    // Create an instance of AxelarClient
    const axelarClient = new AxelarClient({
      network: 'testnet', // Replace with the appropriate network ('testnet' or 'mainnet')
    });

    // Get the user's Solana public key
    const solanaPublicKey = wallet.publicKey.toBase58();

    // Generate a new transfer ID
    const transferId = axelarClient.generateTransferId();

    // Get the gateway addresses for the transfer
    const gateways = await axelarClient.getTransferGateways(transferId);

    // Create a Solana connection
    const connection = new Connection(solanaNetwork);

    // Create a new transaction
    const transaction = new Transaction().add(
      // Add instructions here, for example, transferring SOL to the gateway address
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(gateways.solana_gateway),
        lamports: 1000000, // Amount in lamports (SOL has 10^9 lamports per SOL)
      })
    );

    // Sign and send the transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log('Transaction successful. Signature:', signature);

    // Create the cross-chain message
    const message = {
      transfer_id: transferId,
      dest_chain: 'ethereum', // Replace with the destination chain ID
      sender: solanaPublicKey,
      receiver: '0xYourEthereumAddress', // Replace with the actual Ethereum address
      asset: {
        type: 'sol',
        symbol: 'SOL',
      },
      amount: '0.1', // Replace with the amount to transfer
    };

    // Send the cross-chain message using Axelar
    const response = await axelarClient.sendCrossChainMessage(message);
    console.log('Cross-chain message sent:', response);
  } catch (error) {
    console.error('Error sending Solana transaction:', error);
  }
};



  function refreshWallet() {
    setWallet(loadWallet());
  }

  function saveWallet(keystore) {
    localStorage.setItem('encryptedKeystore', keystore);
  }

  const generateSolanaWallet = async () => {
    const newSolanaWallet = Keypair.generate(); // Generate a new Solana wallet keypair
    const publicKey = newSolanaWallet.publicKey.toString();
    
    // Store the private key securely using the encrypted keystore logic
    const keystoreJson = JSON.stringify({
      privateKey: newSolanaWallet.secretKey.toString(),
      publicKey,
    });

    const encryptedKeystore = encryptKeystore(keystoreJson, keystorePassword);
    saveWallet(encryptedKeystore);

    setWallet(newSolanaWallet);
    setShowKeystore(false);
  };

  const generateTerraWallet = () => {
    if (seedPhrase) {
      try {
        const newTerraWallet = new LCDClient({
          URL: selectedNetwork.rpcUrl,
          chainID: selectedNetwork.chainID,
        }).wallet(MnemonicKey.fromMnemonic(seedPhrase)); // Replace 'TerraWallet' with actual wallet creation logic
        // Store the wallet securely using the encrypted keystore logic
        const keystoreJson = JSON.stringify({
          mnemonic: seedPhrase,
          publicKey: newTerraWallet.publicKey,
        });
  
        const encryptedKeystore = encryptKeystore(keystoreJson, keystorePassword);
        saveWallet(encryptedKeystore);
  
        setWallet(newTerraWallet);
        setShowKeystore(false);
      } catch (error) {
        console.error('Error generating Terra wallet:', error);
      }
    }
  };

  const generateWallet = () => {
    // Add network-specific logic to generate wallet based on selected network
    switch (selectedNetwork.id) {
      case 'eth':
        const newEthWallet = ethers.Wallet.createRandom();
        const ethEncryptedKeystore = encryptKeystore(newEthWallet.encrypt(), keystorePassword);
        saveWallet(ethEncryptedKeystore);
        setWallet(newEthWallet);
        setShowKeystore(false);
        break;
      case 'solana':
        // Implement Solana wallet generation logic
        generateSolanaWallet();
        break;
      case 'terra':
        // Implement Terra wallet generation logic
        generateTerraWallet();
        break;
      default:
        break;
    }
  };

  const signMessage = async () => {
    if (wallet && message) {
      const messageBytes = utils.toUtf8Bytes(message);
      const signature = await wallet.signMessage(messageBytes);
      setSignature(signature);
    }
  };

  const verifySignature = async () => {
    if (wallet && message && signature) {
      const messageBytes = utils.toUtf8Bytes(message);
      const signer = utils.verifyMessage(messageBytes, signature);

      if (signer === wallet.address) {
        setIsSignatureValid(true);
      } else {
        setIsSignatureValid(false);
      }
    }
  };

  const exportKeystore = () => {
    if (wallet) {
      const keystoreJson = wallet.encrypt();
      const encryptedKeystore = encryptKeystore(keystoreJson, keystorePassword);
      setExportedKeystore(encryptedKeystore);
    }
  };

  const changeKeystorePassword = () => {
    if (wallet && keystorePassword) {
      const keystoreJson = wallet.encrypt(keystorePassword);
      const encryptedKeystore = encryptKeystore(keystoreJson, keystorePassword);
      saveWallet(encryptedKeystore);
    }
  };

  const handleLogin = () => {
    // Simulating login success/failure based on loginAttempts
    if (loginAttempts >= 3) {
      console.error('Too many failed login attempts. Please try again later.');
      return;
    }

    if (wallet && keystorePassword) {
      if (loginAttempts > 0) {
        setLoginAttempts(0); // Reset login attempts on successful login
      }
      const decryptedKeystoreJson = decryptKeystore(wallet.encrypt(), keystorePassword);
      if (decryptedKeystoreJson) {
        setWallet(new ethers.Wallet.fromEncryptedJsonSync(decryptedKeystoreJson, keystorePassword));
      } else {
        setLoginAttempts(loginAttempts + 1);
        console.error('Incorrect password. Please try again.');
      }
    }
  };

  const connectHardwareWallet = () => {
    // Simulate connecting hardware wallet
    setHardwareWalletConnected(true);
  };

  const restoreWalletFromSeed = () => {
    if (seedPhrase) {
      const newWallet = ethers.Wallet.fromMnemonic(seedPhrase);
      setWallet(newWallet);
    }
  };

  const restoreMultiSigWallet = () => {
    if (multiSigAddress) {
      const newWallet = new ethers.Wallet(wallet.privateKey); // For demonstration
      setWallet(newWallet);
    }
  };

  return (
    <div className="App">
      <h1>Ethers.js, Solana, and Terra Wallet & Signature Example</h1>
      <div>
        <p>Select Network:</p>
        <select onChange={(e) => handleNetworkChange(e.target.value)}>
          <option value="">Select...</option>
          {networks.map((network) => (
            <option key={network.id} value={network.id}>
              {network.name}
            </option>
          ))}
        </select>
      </div>
      {selectedNetwork ? (
        <div>
          {wallet ? (
            <>
              <div>
                <p>Wallet Address: {wallet.address}</p>
                <button onClick={() => setShowKeystore(!showKeystore)}>
                  {showKeystore ? 'Hide Keystore' : 'Show Keystore'}
                </button>
                {showKeystore && (
                  <div>
                    <p>Enter Keystore Password:</p>
                    <input
                      type="password"
                      value={keystorePassword}
                      onChange={(e) => setKeystorePassword(e.target.value)}
                    />
                    <button onClick={changeKeystorePassword}>Change Password</button>
                  </div>
                )}
                <button onClick={exportKeystore}>Export Keystore</button>
                <button onClick={refreshWallet}>Refresh Wallet</button>
              </div>
              <div>
                <h2>Sign Message</h2>
                <input
                  type="text"
                  placeholder="Message to sign"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={signMessage}>Sign</button>
                {signature && <p>Signature: {signature}</p>}
              </div>
              <div>
                <h2>Verify Signature</h2>
                <button onClick={verifySignature}>Verify Signature</button>
                {isSignatureValid ? (
                  <p>Signature is valid.</p>
                ) : (
                  <p>Signature is NOT valid.</p>
                )}
              </div>
            </>
          ) : (
            <div>
              <button onClick={generateWallet}>Generate Wallet</button>
              <p>Enter Keystore Password:</p>
              <input
                type="password"
                value={keystorePassword}
                onChange={(e) => setKeystorePassword(e.target.value)}
              />
              <button onClick={handleLogin}>Login</button>
              {loginAttempts >= 3 && <p>Too many failed login attempts. Try again later.</p>}
              {selectedNetwork.id === 'eth' && (
                <>
                  <button onClick={connectHardwareWallet}>Connect Hardware Wallet</button>
                  {hardwareWalletConnected && <p>Hardware wallet connected.</p>}
                </>
              )}
              {selectedNetwork.id === 'eth' && (
                <div>
                  <p>Enter Seed Phrase:</p>
                  <input
                    type="text"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                  />
                  <button onClick={restoreWalletFromSeed}>Restore Wallet from Seed</button>
                </div>
              )}  
              {selectedNetwork.id === 'solana' && (
                <div>
                  {/* Solana-specific options */}
                  <button onClick={generateSolanaWallet}>Generate Solana Wallet</button>
                    {wallet && selectedNetwork.id === 'solana' && (
                      <div>
                        <h2>Solana Wallet</h2>
                        <p>Public Key: {wallet.publicKey.toBase58()}</p>
                        <button onClick={connectSolanaWallet}>Connect Solana Wallet</button>
                        {solanaWalletConnected && (
                          <div>
                            <h3>Solana Wallet Connected</h3>
                            {/* Solana-specific operations */}
                            <button onClick={sendSolanaTransaction}>Send Solana Transaction</button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}
              {selectedNetwork.id === 'terra' && (
                <div>
                  {/* Terra-specific options */}
                  <button onClick={generateTerraWallet}>Generate Terra Wallet</button>
                  <p>Enter Mnemonic Seed Phrase:</p>
                  <input
                    type="text"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                  />
                  <button onClick={restoreWalletFromSeed}>Restore Wallet from Seed</button>
                  {/* ... Other Terra-specific options */}
                  
                </div>
              )}
              <p>Enter MultiSig Address:</p>
              <input
                type="text"
                value={multiSigAddress}
                onChange={(e) => setMultiSigAddress(e.target.value)}
              />
              <button onClick={restoreMultiSigWallet}>Restore MultiSig Wallet</button>
            </div>
          )}
          
        </div>
      ): (
        <p>Select a network to get started.</p>
      )}
    </div>
  );
}

export default App;
