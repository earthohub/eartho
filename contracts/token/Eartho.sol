// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../dependencies/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../dependencies/contracts/token/ERC721/ERC721.sol";
import "../dependencies/contracts/access/Ownable.sol";
import "../utils/VersionedInitializable.sol";

contract Eartho is ERC721, Ownable {

    /**** event ****/
    event UpdateMinter(address minter, bool update);
    event ChangeOwner(address from, address to);
    event UpdateBaseURI(string uri);
    event Mint(address to, uint256 tokenId, int16 longitude, int16 latitude, uint8 level);
    event Burn(address owner, uint256 tokenId, int16 longitude, int16 latitude);

    modifier nftOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "NFT not owner");
        _;
    }

    /**** the key parameter for earth ****/

    /*
    * the context of earth
    *  longitude for earth: 0° - 180° W; - 0° - 180° E
    *  latitude for earth: 0°-90° N; 0°-90° S
    */
    struct earthoContext {
        int16 longitude;                // [-1800, 1800]: -1800 mean: 180°.00'W; 121 mean: 12°.10'E
        int16 latitude;                 // [-900, 900]: -900 mean: 90°.00'S; 121 mead: 12°.10'N
        uint8 level;                    // the level for nft 1,2,3 ... smaller value higher level
        string link;                    // the link for nft: https://www.xxxx.com
    }

    struct mintInput {
        earthoContext context;
        address to;
    }

    /**** the variable of earth ****/
    int16 public constant LONGITUDE_MAX = 1800;
    int16 public constant LATITUDE_MAX = 900;
    int16 public LATITUDE_DOWN_GUARD;
    int16 public LATITUDE_UP_GUARD;
    // base uri for eartho
    string private _baseUri;
    // the index of token
    uint256 private _tokenId;

    // earthos set: key is owner; value is the nft set for owner
    mapping(address => uint256[]) private _earthos;
    // earth context set for nft: key is nft tokenId, value is the context of earth
    mapping(uint256 => earthoContext) private _tokens;
    /*
    * indicates the nft has been minted:
    *   key is coordinate: ( longitude+1800 * (2**16) + latitude+900)
    *   value is minted status ( bool: mint; false: no mint )
    */
    mapping(uint32 => bool) private _nfts;
    // the minter who can mint NFT
    mapping(address => bool) private _minters;

    /**** function for oil Empire land ****/
    constructor(
        string memory uri
    ) ERC721("Earthopoin", "EARTHO") {
        _tokenId = 0;
        _baseUri = uri;

        LATITUDE_DOWN_GUARD = -600;
        LATITUDE_UP_GUARD = 900;
    }

    /*
    * @dev setLatitudeDownGuard set the down guard of Latitude
    */
    function setLatitudeDownGuard(int16 down) external onlyOwner {
        require((down <= LATITUDE_MAX && down >= -1*LATITUDE_MAX), "Set Latitude Down Guard");
        LATITUDE_DOWN_GUARD = down;
    }

    /*
    * @dev setLatitudeUpGuard set the up guard of Latitude
    */
    function setLatitudeUpGuard(int16 up) external onlyOwner {
        require((up <= LATITUDE_MAX && up >= -1*LATITUDE_MAX), "Set Latitude Up Guard");
        LATITUDE_UP_GUARD = up;
    }

    /*
    * @dev updateLevel update the level of tokenId
    * @params: level for nft
    * @params: tokenId for the index of nft
    * @params: account who is the owner of nft
    */
    function updateLevel(uint8 level, uint256 tokenId, address account) external {
        require(_minters[_msgSender()], "Update level fail for not minter");
        require(ownerOf(tokenId) == account, "Update level fail for the owner is not belong to account");
        earthoContext storage context = _tokens[tokenId];
        context.level = level;
    }

    /*
    * @dev updateLink update the link of tokenId
    * @params: link for nft
    * @params: tokenId for the index of nft
    */
    function updateLink(string memory link, uint256 tokenId) external nftOwner(tokenId) {
        earthoContext storage context = _tokens[tokenId];
        context.link = link;
    }

    /*
    * @dev updateBaseURI update base uri for oil Empire Land by owner
    */
    function updateBaseURI(string memory uri) external onlyOwner {
        _baseUri = uri;
        emit UpdateBaseURI(uri);
    }

    /*
    * @dev baseURI get base uri for nft
    */
    function baseURI() public view returns (string memory) {
        return _baseUri;
    }

    /*
    * @dev updateMinter: update minter for eartho nft by owner
    * @params: minter who is own/remove the power of mint
    * @params: update true is own; false is remove
    */
    function updateMinter(address minter, bool update) external onlyOwner {
        _minters[minter] = update;
        emit UpdateMinter(minter, update);
    }

    /*
    * @dev isMinter: check user is minter
    *   return: true is minter; false is no minter
    */
    function isMinter(address user) public view returns(bool) {
        return _minters[user];
    }

    /*
    * @dev mint: mint the eartho nft for user
    * @params input: the initialize params for eartho
    */
    function mint(mintInput calldata input) external {
        require(_minters[_msgSender()], "NFT mint fail for invalid minter");
        bool isValid = true;

        if ( (input.context.longitude > LONGITUDE_MAX) || (input.context.longitude < (-1*LONGITUDE_MAX)) ) {
            isValid = false;
        }
        if ( (input.context.latitude > LATITUDE_UP_GUARD) || (input.context.latitude < LATITUDE_DOWN_GUARD) ) {
            isValid = false;
        }
        require(isValid, "NFT mint fail for invalid longitude/latitude");

        uint32 local = _computeLocal(input.context.longitude, input.context.latitude);
        require(!_nfts[local], "NFT mint fail for longitude/latitude has exist");

        _tokenId = _tokenId + 1;
        _safeMint(input.to, _tokenId);

        _nfts[local] = true;
        _earthos[input.to].push(_tokenId);
        _tokens[_tokenId] = input.context;

        emit Mint(input.to, _tokenId, input.context.longitude, input.context.latitude, input.context.level);
    }

    /*
    * @dev burn: burn the oil empire land nft by owner
    * @params tokenId: the unique identification for nft
    */
    function burn(uint256 tokenId) external nftOwner(tokenId) {
        address user = _msgSender();
        uint256[] storage eartho = _earthos[user];
        uint256 i = _findTokenId(eartho, tokenId);

        if ( i < eartho.length ) {
            _burn(tokenId);
            emit Burn(user, tokenId, _tokens[tokenId].longitude, _tokens[tokenId].latitude);
            uint32 local = _computeLocal(_tokens[tokenId].longitude, _tokens[tokenId].latitude);
            delete _nfts[local];
            delete _tokens[tokenId];

            eartho[i] = eartho[eartho.length - 1];
            eartho.pop();
        }
    }

    /*
    * @dev get the set eratho of msg.sender
    *  return the set of tokenId
    */
    function getEarthos(address user) public view returns (uint256[] memory) {
        return _earthos[user];
    }

    /*
    * @dev checkEarthCoordinates check coordinates of earth by longitude and latitude
    * return: true has been minted or else false
    */
    function checkEarthCoordinates(int16 longitude, int16 latitude) public view returns(bool) {
        uint32 local = _computeLocal(longitude, latitude);
        return _nfts[local];
    }

    /*
    * @dev getNFTContext obtain the context of nft by tokenId
    */
    function getNFTContext(uint256 tokenId) public view returns(earthoContext memory) {
        return _tokens[tokenId];
    }

    // _beforeTokenTransfer will update tokenId in the set of eartho for from and to
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        if ( from == address(0) || to == address(0) )
            return;

        uint256[] storage earthoFrom = _earthos[from];
        uint256[] storage earthoTo = _earthos[to];
        uint256 i = _findTokenId(earthoFrom, tokenId);

        if ( i < earthoFrom.length ) {
            earthoFrom[i] = earthoFrom[earthoFrom.length - 1];
            earthoFrom.pop();
            earthoTo.push(tokenId);
        }
    }

    // compute local by longitude and latitude with our policy
    function _computeLocal(int16 longitude, int16 latitude) internal virtual pure returns(uint32) {
        int16 i16_longitude = longitude + LONGITUDE_MAX;
        int16 i16_latitude = latitude + LATITUDE_MAX;
        uint16 u16_longitude = uint16(i16_longitude);
        uint16 u16_latitude = uint16(i16_latitude);
        return (uint32(u16_longitude))*(2**16) + uint32(u16_latitude);
    }

    // _findTokenId to find tokenId in user earthos
    function _findTokenId(uint256[] memory eartho, uint256 tokenId) internal virtual returns(uint256) {
        uint256 i = 0;

        while ( i < eartho.length ) {
            if (eartho[i] == tokenId) {
                break;
            } else {
                i++;
            }
        }
        return i;
    }
}