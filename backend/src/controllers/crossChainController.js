const { AxelarClient } = require('@axelar-network/axelarjs-sdk');

const axelarClient = new AxelarClient({
  nodeUrl: 'https://axelar-node-url', // Replace with actual Axelar node URL
  mnemonic: 'your-mnemonic', // Replace with your mnemonic
});

exports.transferToPrimaryAddress = async (req, res) => {
  try {
    const primaryAddress = 'primary-ethereum-address'; // Replace with the actual primary Ethereum address
    const amount = '1'; // Replace with the desired amount

    const transferResponse = await axelarClient.transfer({
      to: primaryAddress,
      amount: amount,
      denom: 'eth', // Replace with the desired denom
      fee: {
        gas: '200000',
        amount: '0.001', // Replace with the desired fee amount
        denom: 'eth', // Replace with the desired fee denom
      },
    });

    res.status(200).json({ message: 'Transfer initiated', data: transferResponse });
  } catch (error) {
    console.error('Error transferring assets:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
};
