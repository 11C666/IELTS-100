/* Main-editor corrections after cross-book duplicate and length review. */
const days={};for(const file of ['./manual-days-081-087.js','./manual-days-088-093.js','./manual-days-094-100.js','./manual-days-095-097.js','./manual-days-098-100.js'])Object.assign(days,require(file));

days[89].expressions[1]={text:'put down roots',cn:'在新地方扎根',example:'Stable work and supportive neighbours helped the family put down roots.'};
days[96].expressions[0]={text:'get back on my feet',cn:'恢复健康或重新振作',example:'Good follow-up care helped her get back on her feet after the illness.'};
days[84].speaking[1].answer+=' Strategic reserves can then cover the time needed to switch suppliers when an unexpected disruption occurs.';
days[82].speaking[0].answer+=' I still review the plan once a month and adjust it when regular costs change.';
days[83].speaking[0].answer+=' The experience also changed how I understood the relationship between talent, support and access to opportunity.';
days[84].speaking[0].answer+=' I also like that the design has lasted for years, which makes the international purchase feel less wasteful.';
days[85].speaking[0].answer+=' The experience made the trade-off between flexibility and predictable income much more concrete to me.';
days[85].speaking[1].answer+=' Clear written terms would also make comparison between platforms easier.';
days[86].speaking[1].answer+=' Transport costs should be included as well.';
days[87].speaking[0].answer+=' It made population change visible through ordinary services rather than through an abstract national statistic.';
days[86].reading.paragraphs[4]+=' The calculation changes further when transport and household energy costs are included.';

days[90].speaking[0]={part:'Part 2',question:'Describe a change in a city that improved people’s daily lives.',answer:'A useful change in my city was the conversion of a wide road beside a metro station into a mixed transport street. One traffic lane was replaced by a protected cycle route, wider pavements and safer crossings. Before the work, pedestrians had to wait through several signal changes, and buses were often trapped behind turning cars. The redesign looked disruptive while it was being built, but the finished street is easier to cross and the bus stops have proper shelters. Small shops have added outdoor seating because traffic noise has fallen. What impressed me is that the project did not depend on a landmark building. It improved ordinary journeys by giving limited street space to more kinds of users.'};
days[91].speaking[0]={part:'Part 2',question:'Describe an international influence that changed something in your local area.',answer:'An international influence I noticed was the arrival of a night market inspired by food markets in several Asian cities. Local organisers did not copy one place exactly; they invited residents from different backgrounds to sell dishes, crafts and ingredients that were difficult to find nearby. The market encouraged an underused square to remain active in the evening, and established shops benefited from the extra visitors. It also introduced people to unfamiliar food through small, affordable portions rather than formal restaurants. There were early complaints about litter, so organisers introduced reusable cups and a deposit system. I like the example because global influence produced a local event with its own rules and participants instead of simply importing another international chain.'};

module.exports=Object.fromEntries(Array.from({length:20},(_,i)=>[i+81,days[i+81]]));
