//change to require statement
const TonWeb = require("tonweb");

const tonWeb = new TonWeb();

// var regexp = new RegExp("^(cosmos)1([" + ALLOWED_CHARS + "]+)$"); // cosmos + bech32 separated by '1'

module.exports = {
  isValidAddress: function (address, currency, networkType) {
    // let match = regexp.exec(address);
    return this.tonValidator(address);
  },

  tonValidator: function (address) {
    if (TonWeb.utils.Address.isValid(address)) {
      return true;
    } else {
      return false;
    }
  },
};
