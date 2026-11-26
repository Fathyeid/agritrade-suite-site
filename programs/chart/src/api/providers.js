// Reports which optional provider keys are configured as environment variables. Returns true/false only, never values.
const SLOTS = {
  live_data: ['POLYGON_API_KEY', 'TWELVEDATA_API_KEY', 'DXFEED_TOKEN', 'BARCHART_API_KEY'],
  fundamentals: ['FMP_API_KEY', 'EOD_API_KEY'],
  bonds: ['BOND_DATA_API_KEY'],
  news_licensed: ['NEWS_API_KEY'],
  llm: ['LLM_API_KEY'],
  security: ['GOPLUS_API_KEY'],
  options_chain: ['OPTIONS_DATA_API_KEY'],
  broker: ['BROKER_API_KEY'],
};
export default function handler(req, res) {
  const out = {};
  for (const [k, names] of Object.entries(SLOTS)) out[k] = names.some(n => !!process.env[n]);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ configured: out });
}
