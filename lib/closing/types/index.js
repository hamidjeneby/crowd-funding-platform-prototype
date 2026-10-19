import * as murabaha from "./murabaha.js";
import * as ijara from "./ijara.js";
import * as mudarabah from "./mudarabah.js";
import * as spvEquity from "./spv_equity.js";

const HOOKS_BY_TYPE = {
  murabaha,
  ijara,
  mudarabah,
  spv_equity: spvEquity,
};

export function getContractTypeHooks(shariaContractType) {
  const key = String(shariaContractType || "murabaha").toLowerCase().trim();
  const hooks = HOOKS_BY_TYPE[key];
  if (!hooks) {
    throw new Error(`Unsupported sharia_contract_type: ${shariaContractType}`);
  }
  return hooks;
}
