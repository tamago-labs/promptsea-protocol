# PromptSea

PromptSea is a set of components that extends traditional NFTs to include private data that can be shared with token holders. 

- PromptNFT - A shared ERC1155 smart contract for NFT management
- PromptMarket - A secondary marketplace for trading PromptNFT tokens
- PromptNetwork - A KMS to protect private data stored on public blockchain and IPFS networks

More details on https://docs.promptsea.io

## How To Test

The smart contract on the repository is open source and has been developed using Hardhat. It can simply simulate all actions on the three components by running:

```
cd contracts-evm
npm install
npx hardhat test
```

For testing, we're using the MockAPI for PromptNetwork to demonstrate, while the production API has been deployed and is running on AWS cloud, based on serverless architecture.

## Deployment

### Polygon (Chain id : 137) 

Contract Name | Contract Address 
--- | --- 
Market | 0x838596631568713c2c7D3d7a1fFa44347e361550
Item | 0x3c62f937B252080DE878a1f99ED9390cb8d36554
Paymaster | 0x2d357877E55697Cf30404aE835e0702648e75df6

### BNB (Chain id : 56) 

Contract Name | Contract Address 
--- | --- 
Market | 0xe0bdB97D7e1e1Cea6187B4e8e78C94089D0D4FFa
Item | 0x1E234256AE9f543d1d4FE5f0293F75a993B75262

## License

[MIT](./LICENSE)