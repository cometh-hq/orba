import assert from 'assert'
import { privateKeyToAccount } from 'viem/accounts'
import { type DeployFunction } from 'hardhat-deploy/types'
import { Hex } from 'viem'

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const contractName = 'FundProvider'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const coSignerPrivateKey = process.env.COSIGNER_PRIVATE_KEY
    if (!coSignerPrivateKey) {
        throw new Error("COSIGNER_PRIVATE_KEY is not set")
    }
    const coSigner = privateKeyToAccount(coSignerPrivateKey as Hex)

    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

    assert(deployer, 'Missing named deployer account')

    console.log(`Deploying on Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)
    const networkName = hre.network.name.toUpperCase()


    const { address } = await deploy(contractName, {
        from: deployer,
        args: [coSigner.address, usdcAddress],
        log: true,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy