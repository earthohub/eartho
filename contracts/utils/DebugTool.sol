// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

library DebugTool {

    function uintToString(uint256 i)
        internal
        pure
    returns (string memory) {
        if ( i == 0 ) {
            return "0";
        }

        uint256 j = i;
        uint256 length = 0;
        while (j != 0) {
            length = length + 1;
            j = j/10;
        }

        bytes memory bstr = new bytes(length);
        uint256 k = length - 1;
        while (i != 0) {
            //bstr[k--] = bytes1((uint8)(48 + i%10));
            bstr[k] = bytes1((uint8)(48 + i%10));
            i = i/10;
            k = k - 1;
            if ( k == 0 )
                break;
        }
        bstr[0] = bytes1((uint8)(48 + i%10));
        string memory str = string(bstr);
        return str;
    }

    function strConcat(string memory _a, string memory _b)
        internal
        pure
    returns (string memory) {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        string memory ret = new string(_ba.length + _bb.length);
        bytes memory bret = bytes(ret);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) {
            bret[k++] = _ba[i];
        }
        for (uint i = 0; i < _bb.length; i++) {
            bret[k++] = _bb[i];
        }
        return ret;
    }
}