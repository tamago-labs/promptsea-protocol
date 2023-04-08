// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@opengsn/contracts/src/BasePaymaster.sol";

contract Paymaster is BasePaymaster {


    mapping(address => bool) public targets;

    event TargetAdded(address newTarget);
    event TargetRemoved(address _address);

    constructor(address _target) {
        targets[_target] = true;
    }

    function versionPaymaster() external view override virtual returns (string memory){
        return "2.2.3+opengsn.accepteverything.ipaymaster";
    }

    function setTarget(address _target) external onlyOwner {
        emit TargetAdded( _target);
        targets[_target] = true;
    }

    function removeTarget(address _target) external onlyOwner {
        emit TargetRemoved( _target);
        targets[_target] = false;
    }

    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
    external
    override
    virtual
    returns (bytes memory context, bool revertOnRecipientRevert) {
        (relayRequest, signature, approvalData, maxPossibleGas);
        require( targets[relayRequest.request.to], "wrong target");
	//returning "true" means this paymaster accepts all requests that
	// are not rejected by the recipient contract.
        return ("", true);
    }

    function postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    ) external override virtual {
        (context, success, gasUseWithoutPost, relayData);
    }

}