// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

/**
 * @title Secondary P2P Marketplace for Hybrid Permission-based NFTs
 */

contract Market is
    ReentrancyGuard,
    ERC1155Holder,
    BaseRelayRecipient,
    Pausable
{

    using Address for address;
    using SafeERC20 for IERC20;

    enum Role {
        UNAUTHORIZED,
        ADMIN
    }

    enum TokenType {
        ERC20,
        ERC1155,
        ETHER,
        FIAT
    }

    struct Order {
        address assetAddress;
        uint256 tokenId;
        uint256 tokenValue;
        TokenType tokenType;
        address owner;
        address pairAssetAddress;
        uint256 pairIdOrAmount;
        TokenType pairTokenType;
        bool active;
        bool ended;
    }

    // ACL
    mapping(address => Role) private permissions;
    // Fees (for ERC-20 / Ether)
    uint256 public swapFee;
    // Dev address
    address public devAddress;
    // Order's IPFS CID => Order
    mapping(uint256 => Order) public orders;
    uint256 public orderIdCount;
    // Max. orders can be executed at a time
    uint256 maxBatchOrders;
    // ETHER ADDRESS
    address constant ETHER_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    event OrderCreated(
        address indexed owner,
        uint256 orderId,
        address assetAddress,
        uint256 tokenId,
        uint256 tokenValue,
        TokenType tokenType
    );

    event OrderCanceled(uint256 orderId, address indexed owner);
    event OrderEnded(uint256 orderId, address indexed owner);
    event Swapped(uint256 orderId, address indexed fromAddress, address toAddress);
    event Withdrawn( address tokenAddress,address indexed toAddress, uint256 amount);

    constructor(address _forwarder) {
        maxBatchOrders = 100;

        permissions[_msgSender()] = Role.ADMIN;

        devAddress = _msgSender();

        _setTrustedForwarder(_forwarder);

        // set fees for ERC-20 / Ether
        swapFee = 1000; // 10%
    }

    /// @notice create an order
    /// @param _orderId ID for the order
    /// @param _assetAddress NFT contract address being listed
    /// @param _tokenId NFT token ID being listed
    /// @param _tokenValue total NFT amount being listed
    /// @param _type Token type that want to swap
    /// @param _pairAssetAddress pair asset address to be traded
    /// @param _pairIdOrAmount amount or id of pair asset
    /// @param _pairTokenType the type of pair asset
    function create(
        uint256 _orderId,
        address _assetAddress,
        uint256 _tokenId,
        uint256 _tokenValue,
        TokenType _type,
        address _pairAssetAddress,
        uint256 _pairIdOrAmount,
        TokenType _pairTokenType
    ) external nonReentrant whenNotPaused {
        _create(_orderId, _assetAddress, _tokenId, _tokenValue, _type, _pairAssetAddress, _pairIdOrAmount, _pairTokenType);

        emit OrderCreated(
            _msgSender(),
            _orderId,
            _assetAddress,
            _tokenId,
            _tokenValue,
            _type
        );
    }

    /// @notice create multiple orders
    /// @param _cids ID for the order
    /// @param _assetAddresses NFT contract address being listed
    /// @param _tokenIds NFT token ID being listed
    /// @param _tokenValues NFT token amount being listed 
    /// @param _pairAssetAddress pair asset address to be traded
    /// @param _pairIdOrAmount amount or id of pair asset
    /// @param _pairTokenType the type of pair asset
    function createBatch(
        uint256[] calldata _cids,
        address[] calldata _assetAddresses,
        uint256[] calldata _tokenIds,
        uint256[] calldata _tokenValues,
        // TokenType[] calldata _types,
        address _pairAssetAddress,
        uint256 _pairIdOrAmount,
        TokenType _pairTokenType
    ) external nonReentrant whenNotPaused {
        require(maxBatchOrders >= _cids.length, "Exceed batch size");

        for (uint256 i = 0; i < _cids.length; i++) {
            _create(
                _cids[i],
                _assetAddresses[i],
                _tokenIds[i],
                _tokenValues[i],
                TokenType.ERC1155, // only ERC1155 is allowed
                _pairAssetAddress,
                _pairIdOrAmount,
                _pairTokenType
            );

            emit OrderCreated(
                _msgSender(),
                _cids[i],
                _assetAddresses[i],
                _tokenIds[i],
                _tokenValues[i],
                TokenType.ERC1155
            );
        }
    }

    /// @notice cancel the order
    /// @param _cid ID that want to cancel
    function cancel(uint256 _cid) external nonReentrant whenNotPaused {
        _cancel(_cid);

        emit OrderCanceled(_cid, _msgSender());
    }

    /// @notice cancel multiple orders
    /// @param _cids ID that want to cancel
    function cancelBatch(uint256[] calldata _cids) external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < _cids.length; i++) {
            _cancel(_cids[i]);
            emit OrderCanceled(_cids[i], _msgSender());
        }
    }

    /// @notice buy the NFT from the given order ID
    /// @param _cid ID for the order
    function swap(
        uint256 _cid
    ) external validateId(_cid) nonReentrant whenNotPaused {
        _swap(_cid);

        emit Swapped(_cid, orders[_cid].owner , _msgSender());
    }

    /// @notice buy the NFT from the given order ID with ETH
    /// @param _cid ID for the order 
    function swapWithEth(uint256 _cid)
        external
        payable
        validateId(_cid)
        nonReentrant
        whenNotPaused
    {
        _swapWithEth(_cid);

        emit Swapped(_cid, orders[_cid].owner , _msgSender());
    }

    /// @notice buy the NFT from the fiat (only admin can proceed)
    /// @param _cid ID for the order
    function swapWithFiat(
        uint256 _cid,
        address _toAddress
    ) external onlyAdmin validateId(_cid) nonReentrant {
        _swapWithFiat(_cid, _toAddress);

        emit Swapped(_cid, orders[_cid].owner , _toAddress);
    }

    /// @notice buy the NFT in batch
    /// @param _cids ID for the order
    function swapBatch(
        uint256[] calldata _cids
    ) external validateIds(_cids) nonReentrant whenNotPaused {
        for (uint256 i = 0; i < _cids.length; i++) {
            _swap(
                _cids[i]
            );
            emit Swapped(_cids[i], orders[_cids[i]].owner , _msgSender());
        }
    }

    /// @notice buy the NFT in batch
    /// @param _cids ID for the order 
    function swapBatchWithEth(
        uint256[] calldata _cids
    ) external validateIds(_cids) nonReentrant whenNotPaused {
        for (uint256 i = 0; i < _cids.length; i++) {
            _swapWithEth(_cids[i] );
            emit Swapped(_cids[i], orders[_cids[i]].owner , _msgSender());
        }
    }

    /// @notice buy the NFT in batch from the fiat (only admin can proceed)
    /// @param _cids ID for the order
    function swapBatchWithFiat(
        uint256[] calldata _cids,
        address _toAddress
    ) external onlyAdmin validateIds(_cids) nonReentrant {
        for (uint256 i = 0; i < _cids.length; i++) {
            _swapWithFiat(
                _cids[i],
                _toAddress
            );
            emit Swapped(_cids[i], orders[_cids[i]].owner , _toAddress);
        }
    }

    // ADMIN

    // give a specific permission to the given address
    function grant(address _address, Role _role) external onlyAdmin {
        require(_address != _msgSender(), "You cannot grant yourself");
        permissions[_address] = _role;
    }

    // remove any permission binded to the given address
    function revoke(address _address) external onlyAdmin {
        require(_address != _msgSender(), "You cannot revoke yourself");
        permissions[_address] = Role.UNAUTHORIZED;
    }

    // update swap fees
    function setSwapFee(uint256 _fee) external onlyAdmin {
        swapFee = _fee;
    }

    // update dev address
    function setDevAddress(address _devAddress) external onlyAdmin {
        devAddress = _devAddress;
    }

    // set max. orders can be created and swapped per time
    function setMaxBatchOrders(uint256 _value) external onlyAdmin {
        require(_value != 0, "Invalid value");
        maxBatchOrders = _value;
    }

    function setPaused(bool _paused) external onlyAdmin {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    // withdraw locked funds
    function withdrawErc20(address _tokenAddress, address _toAddress, uint256 _amount)
        external
        nonReentrant
        onlyAdmin
    {
        IERC20(_tokenAddress).safeTransfer(_toAddress, _amount);

        emit Withdrawn( _tokenAddress, _toAddress, _amount );
    }

    // widthdraw ETH
    function withdraw(address _toAddress, uint256 _amount)
        external
        nonReentrant
        onlyAdmin
    {
        (bool sent, ) = _toAddress.call{value: _amount}("");
        require(sent, "Failed to send Ether");

        emit Withdrawn(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, _toAddress, _amount);
    }

    // INTERNAL FUNCTIONS
    modifier onlyAdmin() {
        require(
            permissions[_msgSender()] == Role.ADMIN,
            "Caller is not the admin"
        );
        _;
    }

    modifier validateId(uint256 _orderId) {
        require(orders[_orderId].active == true, "Given ID is invalid");
        require(
            orders[_orderId].ended == false,
            "The order has been fulfilled"
        );
        _;
    }

    modifier validateIds(uint256[] memory _orderIds) {
        require(maxBatchOrders >= _orderIds.length, "Exceed batch size");
        for (uint256 i = 0; i < _orderIds.length; i++) {
            require(orders[_orderIds[i]].active == true, "Given ID is invalid");
            require(
                orders[_orderIds[i]].ended == false,
                "The order has been fulfilled"
            );
        }
        _;
    }

    function _create(
        uint256 _cid,
        address _assetAddress,
        uint256 _tokenId,
        uint256 _tokenValue,
        TokenType _type,
        address _pairAssetAddress,
        uint256 _pairIdOrAmount,
        TokenType _pairTokenType
    ) internal {
        require(orders[_cid].active == false, "Given ID is occupied");
        require(_tokenValue > 0, "Invalid Token Value");

        orders[_cid].active = true;
        orders[_cid].assetAddress = _assetAddress;
        orders[_cid].tokenId = _tokenId;
        orders[_cid].tokenValue = _tokenValue;
        orders[_cid].tokenType = _type;
        orders[_cid].pairAssetAddress = _pairAssetAddress;
        orders[_cid].pairIdOrAmount = _pairIdOrAmount;
        orders[_cid].pairTokenType = _pairTokenType;
        orders[_cid].owner = _msgSender();

        orderIdCount += 1;
    }

    function _cancel(uint256 _orderId) internal {
        require(orders[_orderId].active == true, "Given ID is invalid");
        require(orders[_orderId].owner == _msgSender(), "You are not the owner");

        orders[_orderId].ended = true;
    }

    function _swap(
        uint256 _orderId
    ) internal {
 
        TokenType _type = orders[_orderId].pairTokenType;

        require(_type != TokenType.ETHER, "ETHER is not support");
        require(_type != TokenType.FIAT, "Fiat is not support");

        address _assetAddress = orders[_orderId].pairAssetAddress;
        uint256 _tokenId = orders[_orderId].pairIdOrAmount; 
        
        // taking NFT / ERC-20
        _take(_assetAddress, _tokenId,  _type , orders[_orderId].owner);

        // giving NFT
        _give(
            orders[_orderId].owner,
            orders[_orderId].assetAddress,
            orders[_orderId].tokenId,
            orders[_orderId].tokenType,
            _msgSender()
        );

        orders[_orderId].tokenValue -= 1;

        if (orders[_orderId].tokenValue == 0) {
            orders[_orderId].ended = true;
            emit OrderEnded(_orderId, orders[_orderId].owner);
        }

    }

    function _swapWithEth(uint256 _orderId)
        internal
    {

        TokenType _type = orders[_orderId].pairTokenType;
        require(_type == TokenType.ETHER, "ETHER only");

        require( msg.value == orders[_orderId].pairIdOrAmount , "Invalid amount");

        // taking ETH

        uint256 amount = msg.value;

        // taking swap fees
        if (swapFee != 0) {
            uint256 fee = (amount * (swapFee)) / (10000);
            (bool successDev, ) = devAddress.call{value: fee}("");
            require(successDev, "Failed to send Ether to dev");
            amount -= fee;
        }

        // lock in the contract until admin release
        (bool sent, ) = orders[_orderId].owner.call{value: amount}("");
        require(sent, "Failed to send Ether");

        // giving NFT
        _give(
            orders[_orderId].owner,
            orders[_orderId].assetAddress,
            orders[_orderId].tokenId,
            orders[_orderId].tokenType,
            _msgSender()
        );

        orders[_orderId].tokenValue -= 1;

        if (orders[_orderId].tokenValue == 0) {
            orders[_orderId].ended = true;
            emit OrderEnded(_orderId, orders[_orderId].owner);
        }
    }

    function _swapWithFiat(
        uint256 _orderId,
        address _toAddress
    ) internal {

        TokenType _type = orders[_orderId].pairTokenType;
        require(_type == TokenType.FIAT, "FIAT only");

        // giving NFT
        _give(
            orders[_orderId].owner,
            orders[_orderId].assetAddress,
            orders[_orderId].tokenId,
            orders[_orderId].tokenType,
            _toAddress
        );

        orders[_orderId].tokenValue -= 1;

        if (orders[_orderId].tokenValue == 0) {
            orders[_orderId].ended = true;
            emit OrderEnded(_orderId, orders[_orderId].owner);
        }
    }

    function _take(
        address _assetAddress,
        uint256 _tokenIdOrAmount,
        TokenType _type,
        address _to
    ) internal {
        if (_type == TokenType.ERC1155) {
            IERC1155(_assetAddress).safeTransferFrom(
                _msgSender(),
                _to,
                _tokenIdOrAmount,
                1,
                "0x00"
            );
        } else if (_type == TokenType.ERC20) {
            uint256 amount = _tokenIdOrAmount;

            // taking swap fees
            if (swapFee != 0) {
                uint256 fee = (amount * (swapFee)) / (10000);
                IERC20(_assetAddress).safeTransferFrom(
                    _msgSender(),
                    devAddress,
                    fee
                );
                amount -= fee;
            }

            IERC20(_assetAddress).safeTransferFrom(_msgSender(), _to, amount);

        }
    }

    function _give(
        address _fromAddress,
        address _assetAddress,
        uint256 _tokenIdOrAmount,
        TokenType _type,
        address _to
    ) internal {
        if (_type == TokenType.ERC1155) {
            IERC1155(_assetAddress).safeTransferFrom(
                _fromAddress,
                _to,
                _tokenIdOrAmount,
                1,
                "0x00"
            );
        } else if (_type == TokenType.ETHER) {
            if (_fromAddress == address(this)) {
                uint256 amount = _tokenIdOrAmount;

                // taking swap fees
                if (swapFee != 0) {
                    uint256 fee = (_tokenIdOrAmount * (swapFee)) / (10000);
                    (bool successDev, ) = devAddress.call{value: fee}("");
                    require(successDev, "Failed to send Ether to dev");
                    amount -= fee;
                }

                (bool success, ) = _to.call{value: amount}("");
                require(success, "Failed to send Ether to user");
            }
        } else if (_type == TokenType.ERC20) {
            uint256 amount = _tokenIdOrAmount;

            if (swapFee != 0) {
                uint256 fee = (_tokenIdOrAmount * (swapFee)) / (10000);
                if (_fromAddress == address(this)) {
                    IERC20(_assetAddress).safeTransfer(devAddress, fee);
                } else {
                    IERC20(_assetAddress).safeTransferFrom(
                        _fromAddress,
                        devAddress,
                        fee
                    );
                }
                amount -= fee;
            }

            if (_fromAddress == address(this)) {
                IERC20(_assetAddress).safeTransfer(_msgSender(), amount);
            } else {
                IERC20(_assetAddress).safeTransferFrom(
                    _fromAddress,
                    _msgSender(),
                    amount
                );
            }
        }
    }

    function versionRecipient() public pure override returns(string memory) { return "2.2.5"; }

    function _msgSender()
        internal
        view
        override(Context, BaseRelayRecipient)
        returns (address sender)
    {
        sender = BaseRelayRecipient._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, BaseRelayRecipient)
        returns (bytes calldata)
    {
        return BaseRelayRecipient._msgData();
    }

    receive() external payable {}

    fallback() external payable {}


}
