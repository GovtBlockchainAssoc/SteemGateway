# SteemGateway
The bridge between the core PoA Ethereum Blockchain and the Steem blockchain

Cross-blockchain token is complete!  

Current version uses TestToken Ethereum contract and your Ganache local blockchain.  You will need the OpenZeppelin CLI to load the contract on Ganache (and to call it for the Ethereum to Steem transfer).

Next version will use the CBToken Ethereum Contract and the Azure PoA blockchain with an option to fall back to Ganache.  There will be a DApp for the Ethereum to Steem transfer, again with. an option to fall back to Ganache. 

  To Transfer from Ethereum to Steem
  
    Use Ethereum Contract
      Current
        To = <Ethereum cold storage wallet>
        Memo = Steem
      Next
        To = <Ethereum cold storage wallet>
        Blockchain = Steem
        CBAddress = Steem Name
  
  To Transfer from Steem to Ethereum
  
    Use Steem Engine
      Current
        To = <Steem cold storage wallet>
        Memo = Destination Ethereum Address
      Next
        To = <Steem cold storage wallet>
        Memo = JSON with blockchain & cbaddress

