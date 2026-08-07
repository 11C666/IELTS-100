/* Final targeted review: generalise unsupported precision in Reading only. */
const days=require('./manual-days-081-100-editorial.js');

days[81].reading.paragraphs[1]='To examine whether that boundary affected behaviour, a community bank offered new customers either a standard account or an additional account labelled with a goal of their choice. Customers were not prevented from withdrawing the money, and the interest paid was identical. Over the following year, those with a labelled account accumulated more, although the difference was concentrated among people who also scheduled an automatic transfer. Interviews suggested that naming the account made withdrawals feel like abandoning a stated plan rather than simply moving cash.';

days[85].reading.paragraphs[1]='Researchers at a transport institute followed a group of couriers over several weeks, using voluntary location diaries alongside platform records. Payment per active delivery appeared comfortably above the local minimum wage. Once the analysis included time spent waiting while logged in and deducted bicycle maintenance or fuel, median hourly earnings fell substantially. The effect varied: workers who knew busy locations and switched between two apps waited less, while newcomers and those restricted by childcare experienced longer inactive periods.';

days[86].reading.paragraphs=[
'A widely used affordability measure defines a home as affordable when housing consumes no more than a fixed share of household income. The threshold is easy to calculate and compare across neighbourhoods and over time, but families moving into a new development beyond the city boundary soon exposed its weakness. Their rents met the official test. Their combined spending on housing and transport did not.',
days[86].reading.paragraphs[1].replace('A survey after two years found that transport absorbed nearly a fifth of income in some lower-paid households.','A follow-up survey found that transport absorbed a substantial share of income in some lower-paid households.'),
days[86].reading.paragraphs[2],
days[86].reading.paragraphs[3].replace('The agency did not abandon the thirty-per-cent measure','The agency did not abandon the fixed-share measure')+' The calculation changes further when transport and household energy costs are included.'
];

days[88].reading.paragraphs[0]=days[88].reading.paragraphs[0].replace('in a small Dutch town','in a small town');
days[88].reading.paragraphs[2]='A multi-year evaluation recorded a large number of attempted repairs and found that a clear majority restored an object to use. Surveys also suggested that regular volunteers reported a stronger sense of purpose than before joining. The researchers were cautious: people who chose to volunteer might already have been more socially active, so the workshop could not be credited with causing every reported improvement. Nevertheless, interviews showed that scheduled responsibility mattered. Volunteers were expected, not merely invited, to attend.';

days[89].reading.paragraphs[0]=days[89].reading.paragraphs[0].replace('On arriving in Canada, a civil engineer with twelve years of experience','On arriving in a new country, an experienced civil engineer');
days[89].reading.paragraphs[2]='A provincial pilot programme replaced a single document check with several forms of evidence. Applicants submitted portfolios, completed practical simulations and, where a specific gap was identified, attended a short course. Participants entered work related to their previous professions more often than a comparison group using the conventional route, although researchers cautioned that volunteers for the pilot may have been especially motivated.';
days[89].reading.questions[1].prompt='Every participant in the pilot found work related to a previous profession.';
days[89].reading.questions[1].explanation='The passage says participants entered related work more often, not that every participant did so.';

days[90].reading.paragraphs[0]='When a growing city opened a rapid bus corridor, transport officials measured success mainly through passenger numbers and journey times. Both improved. Years later, however, planners examining the neighbourhoods around its stations found a less straightforward result: access to fast transport had altered where developers built homes, but not always where lower-income passengers could afford to live.';
days[90].reading.paragraphs[1]=days[90].reading.paragraphs[1].replace('Between 2015 and 2022, these station areas added 18 per cent more housing than comparable districts away from the route.','Over the following years, these station areas added substantially more housing than comparable districts away from the route.');
days[90].reading.paragraphs[3]=days[90].reading.paragraphs[3].replace('Bellford changed its planning rules in 2023.','The city later changed its planning rules.');
days[90].reading.paragraphs[4]=days[90].reading.paragraphs[4].replace('Bellford’s experience','The city’s experience');

days[91].reading.paragraphs[1]='Traditional purchasing records identify the supplier that sends an invoice. That firm, however, may buy materials from subcontractors whose own sources change according to price and availability. A survey of mid-sized manufacturers found that most could name their direct suppliers, while only a small minority had reliable information two stages further back. Auditing the final assembly plant therefore offered reassurance about only a fraction of the production network.';
days[91].reading.questions[0].prompt='Most manufacturers in the survey had reliable information about suppliers two stages back.';
days[91].reading.questions[0].explanation='The passage says only a small minority had such information.';

days[93].reading.paragraphs[2]=days[93].reading.paragraphs[2].replace('An independent review examined 600 cases.','An independent review examined a substantial sample of cases.');
days[93].reading.paragraphs[4]=days[93].reading.paragraphs[4].replace('Six months later they fell below their former level','After an initial rise, they later fell below their former level');

days[95].reading.paragraphs[0]='A city seeking to reduce household energy use offered smart thermostats to a large group of volunteer households. After the first winter, participating homes used less heating energy than before, and newspapers described the pilot as proof that free devices should be distributed across the city. The result was encouraging. It was not, however, a reliable estimate of what a universal programme would achieve.';
days[95].reading.paragraphs[3]=days[95].reading.paragraphs[3].replace('The second trial produced a smaller average reduction of 5 per cent.','The second trial produced a smaller average reduction.');

days[82].reading.paragraphs[1]=days[82].reading.paragraphs[1].replace('Half received conventional disclosure documents','One group received conventional disclosure documents');
days[92].reading.paragraphs[2]=days[92].reading.paragraphs[2].replace('tested two smaller machines','tested several smaller machines');

module.exports=days;
