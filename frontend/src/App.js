import React, { useState } from 'react';
import { ethers } from 'ethers';
import { utils } from 'ethers';

import CryptoJS from 'crypto-js'; // For AES encryption

function App() {
  const [wallet, setWallet] = useState(loadWallet());
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [isSignatureValid, setIsSignatureValid] = useState(false);
  const [showKeystore, setShowKeystore] = useState(false);
  const [keystorePassword, setKeystorePassword] = useState('');
  const [exportedKeystore, setExportedKeystore] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [hardwareWalletConnected, setHardwareWalletConnected] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [multiSigAddress, setMultiSigAddress] = useState('');

  const encryptionSalt = CryptoJS.lib.WordArray.random(128 / 8); // For PBKDF2 salt

  function loadWallet() {
    try {
      const encryptedKeystoreJson = localStorage.getItem('encryptedKeystore');
      if (encryptedKeystoreJson) {
        const decryptedKeystoreJson = decryptKeystore(encryptedKeystoreJson, keystorePassword);
        if (decryptedKeystoreJson) {
          return new ethers.Wallet.fromEncryptedJsonSync(decryptedKeystoreJson, keystorePassword);
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

  function refreshWallet() {
    setWallet(loadWallet());
  }

  function saveWallet(keystore) {
    localStorage.setItem('encryptedKeystore', keystore);
  }

  const generateWallet = () => {
    const newWallet = ethers.Wallet.createRandom();
    const encryptedKeystore = encryptKeystore(newWallet.encrypt(), keystorePassword);
    saveWallet(encryptedKeystore);
    setWallet(newWallet);
    setShowKeystore(false);
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
      <h1>Ethers.js Secure Wallet & Signature Example</h1>
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
          <button onClick={connectHardwareWallet}>Connect Hardware Wallet</button>
          {hardwareWalletConnected && <p>Hardware wallet connected.</p>}
          <p>Enter Seed Phrase:</p>
          <input
            type="text"
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.target.value)}
          />
          <button onClick={restoreWalletFromSeed}>Restore Wallet from Seed</button>
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
  );
}

export default App;
