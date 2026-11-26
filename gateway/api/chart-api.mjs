import h_calendar from '../server/chart/calendar.mjs';
import h_chart from '../server/chart/chart.mjs';
import h_contracts from '../server/chart/contracts.mjs';
import h_detail from '../server/chart/detail.mjs';
import h_econ from '../server/chart/econ.mjs';
import h_market from '../server/chart/market.mjs';
import h_mktcountry from '../server/chart/mktcountry.mjs';
import h_news from '../server/chart/news.mjs';
import h_providers from '../server/chart/providers.mjs';
import h_quotes from '../server/chart/quotes.mjs';
import h_search from '../server/chart/search.mjs';
import h_universe from '../server/chart/universe.mjs';
const M={calendar:h_calendar,chart:h_chart,contracts:h_contracts,detail:h_detail,econ:h_econ,market:h_market,mktcountry:h_mktcountry,news:h_news,providers:h_providers,quotes:h_quotes,search:h_search,universe:h_universe};
export default function handler(req,res){const fn=String((req.query&&req.query.fn)||'');const h=M[fn];if(!h){res.status(404).json({error:'unknown endpoint'});return}return h(req,res)}
