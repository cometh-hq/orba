import assert from 'assert'

import {type DeployFunction} from 'hardhat-deploy/types'

const contractName = 'FundProvider'

const deploy: DeployFunction = async (hre) => {
    const {getNamedAccounts, deployments} = hre

    const {deploy} = deployments
    const {deployer} = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Deploying on Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)
    const networkName = hre.network.name.toUpperCase()


    const {address} = await deploy(contractName, {
        from: deployer,
        args: [process.env.COSIGNER_ADDRESS, "0x036CbD53842c5426634e7929541eC2318f3dCF7e"],
        log: true,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy