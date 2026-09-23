/* ─── Question Data: 25 Knowledge Questions & 25 Compatibility Questions ─── */

export interface KQuestion {
  id: string;
  text: string;
  category: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export interface CQuestion {
  id: string;
  text: string;
  category: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export const K_CATS = [
  "Pond Management",
  "Fish Stocking",
  "Feeding & Feed Management",
  "Water Quality Management",
  "Fish Health & Treatments",
  "Mortality Management",
  "Farm Hygiene & Biosecurity",
  "Fish Handling & Grading",
  "Feed Inventory & Storage",
  "Basic Farm Operations",
];

export const C_CATS = [
  "Work Attitude",
  "Reliability & Attendance",
  "Responsibility & Accountability",
  "Teamwork & Collaboration",
  "Following Instructions & SOPs",
  "Work Discipline",
  "Problem-Solving Approach",
  "Farm Conditions & Resilience",
  "Role Suitability & Adaptability",
];

/* ─── 25 Knowledge Questions (Understanding of Fish Farming) ─── */
export const INIT_K: KQuestion[] = [
  {
    id: "KQ-1",
    text: "What is the primary purpose of liming an earthen pond bottom prior to stocking fish?",
    category: "Pond Management",
    options: [
      "To clarify the water for sight feeding",
      "To neutralize soil acidity, stabilize pH, and eradicate parasites and harmful pathogens",
      "To reduce pond depth",
      "To increase water salinity"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-2",
    text: "Why must fingerlings undergo temperature and water acclimatization before being released into a new pond?",
    category: "Fish Stocking",
    options: [
      "To allow the fingerlings to sleep before swimming",
      "To prevent thermal and chemical shock, which causes high mortality",
      "To make the fish feed immediately upon stocking",
      "To alter the pigmentation of the fish skin"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-3",
    text: "What does a Feed Conversion Ratio (FCR) of 1.2 indicate in commercial fish production?",
    category: "Feeding & Feed Management",
    options: [
      "The fish are fed 1.2 times per day",
      "It requires 1.2 kg of feed to produce 1.0 kg of live fish body weight gain",
      "The farm experiences 1.2% mortality during each feeding",
      "Feed costs 1.2 times more than the selling price of fish"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-4",
    text: "What is the generally recommended optimal pH range for freshwater aquaculture ponds (such as catfish and tilapia)?",
    category: "Water Quality Management",
    options: [
      "3.0 to 5.0",
      "6.5 to 8.5",
      "9.5 to 11.5",
      "12.0 to 14.0"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-5",
    text: "Catfish exhibiting open skin ulcers, fin rot, and eroded barbels (whiskers) are most likely suffering from:",
    category: "Fish Health & Treatments",
    options: [
      "Over-aeration of pond water",
      "Bacterial infection, often triggered by poor water quality and organic waste buildup",
      "Excessive dietary protein",
      "Natural seasonal skin shedding"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-6",
    text: "When dead fish are observed floating or at the bottom of a pond, what is the correct immediate procedure?",
    category: "Mortality Management",
    options: [
      "Leave them in the pond as organic fertilizer",
      "Remove them immediately, count and log the mortality, examine for disease symptoms, and dispose of them hygienically away from water sources",
      "Transfer them to adjacent nursery ponds as feed",
      "Discard them into the water inlet canal"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-7",
    text: "Why should harvesting nets, sampling buckets, and grading bowls be disinfected between different ponds?",
    category: "Farm Hygiene & Biosecurity",
    options: [
      "To improve net buoyancy",
      "To prevent cross-contamination and the spread of pathogens or parasites between ponds",
      "To soften the net mesh fibers",
      "To scent the nets so fish are easier to catch"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-8",
    text: "What is the primary danger of continuous overfeeding in concrete or earthen ponds?",
    category: "Feeding & Feed Management",
    options: [
      "Fish grow too quickly and tear the pond liners",
      "Uneaten feed decomposes, depleting dissolved oxygen, generating toxic ammonia, and degrading water quality",
      "The water becomes sterile and clear",
      "Pond water temperature drops sharply"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-9",
    text: "At what time of day is dissolved oxygen (DO) typically at its lowest critical concentration in static aquaculture ponds?",
    category: "Water Quality Management",
    options: [
      "At mid-day around 1:00 PM to 2:00 PM",
      "Just before dawn (early morning), due to nighttime respiration by fish and algae without photosynthesis",
      "Late afternoon around 5:00 PM",
      "Dissolved oxygen remains identical throughout all 24 hours"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-10",
    text: "Why is regular size grading essential during the nursery and fingerling phase of African catfish?",
    category: "Fish Handling & Grading",
    options: [
      "To group fish by swimming speed",
      "To prevent cannibalism where larger shooters consume smaller fingerlings, ensuring uniform growth",
      "To measure water evaporation rates",
      "To train fingerlings to consume only floating pellets"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-11",
    text: "What is the primary operational role of an overflow standpipe or monk system in a pond?",
    category: "Pond Management",
    options: [
      "To chemically aerate bottom sediment",
      "To maintain desired water depth, discharge stagnant bottom water, and prevent flood overflow during heavy rains",
      "To prevent birds from drinking pond water",
      "To heat incoming spring water"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-12",
    text: "How should bagged commercial fish feed be arranged inside a farm store to preserve nutritional quality?",
    category: "Feed Inventory & Storage",
    options: [
      "Stacked directly on cold concrete floors touching perimeter walls",
      "Stacked neatly on wooden or plastic pallets at least 15–20 cm off the floor and away from walls in a dry, ventilated room",
      "Stored outdoors in direct sunlight covered with black plastic",
      "Stored in the generator shed alongside engine oil and diesel"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-13",
    text: "Why must fish feeding be withheld or reduced 24 hours prior to long-distance transport or grading?",
    category: "Fish Handling & Grading",
    options: [
      "To save feed expenditure",
      "To empty the gut, minimizing stress, oxygen consumption, and ammonia fouling in transport containers",
      "Because fish are unable to swim with food in their stomach",
      "To reduce fish body length for easier packing"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-14",
    text: "In Total Ammonia Nitrogen (TAN), which form is highly toxic to fish and increases significantly as water pH and temperature rise?",
    category: "Water Quality Management",
    options: [
      "Ionized ammonium (NH4+)",
      "Un-ionized ammonia (NH3)",
      "Nitrate (NO3-)",
      "Atmospheric nitrogen (N2)"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-15",
    text: "What is the standard pellet size progression for juvenile catfish growing from 10g to 100g?",
    category: "Feeding & Feed Management",
    options: [
      "9.0 mm down to 2.0 mm",
      "Gradual transition from 2.0 mm to 3.0 mm and then 4.0 mm matching mouth gape development",
      "Feeding 6.0 mm pellets continuously from 10g onward",
      "Feeding powdered mash until market harvest"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-16",
    text: "What does Secchi disk visibility measure when dipped into an earthen aquaculture pond?",
    category: "Water Quality Management",
    options: [
      "Bottom sediment hardness",
      "Water clarity, turbidity, and phytoplankton (planktonic algae) density",
      "Total water volume in cubic meters",
      "Salinity concentration in parts per thousand"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-17",
    text: "What is a proven, safe, and cost-effective bath treatment for external parasites and fungal stress in freshwater fish?",
    category: "Fish Health & Treatments",
    options: [
      "Non-iodized sodium chloride (unrefined salt) bath at appropriate dosage",
      "Kerosene application on skin lesions",
      "Detergent soap wash in holding tanks",
      "Powdered chlorine bleach applied directly onto swimming fish"
    ],
    correctIndex: 0
  },
  {
    id: "KQ-18",
    text: "What does the 'First In, First Out' (FIFO) rule ensure in farm feed inventory management?",
    category: "Feed Inventory & Storage",
    options: [
      "The first attendant on duty receives feed first",
      "Older stock is utilized before newer stock to prevent nutrient deterioration and mold formation",
      "All bags are opened simultaneously upon arrival",
      "Newest purchases are fed first while older stock remains in reserve"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-19",
    text: "Which pond water condition clearly warns that a newly prepared pond is NOT ready for fish stocking?",
    category: "Fish Stocking",
    options: [
      "Water temperature measured at 27°C",
      "High levels of free ammonia, toxic nitrite, or residual chemical disinfectant in the water",
      "Dissolved oxygen measured at 6.0 mg/L",
      "Water depth filled to standard operational level"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-20",
    text: "What does 'Specific Growth Rate' (SGR) measure in aquaculture monitoring?",
    category: "Basic Farm Operations",
    options: [
      "The percentage average daily increase in fish body weight over a given culture period",
      "The swimming velocity of fish during feeding",
      "The weekly mortality percentage per pond",
      "The rate of water outflow through drainage valves"
    ],
    correctIndex: 0
  },
  {
    id: "KQ-21",
    text: "Why should predator netting be installed over outdoor fingerling nursery tanks and ponds?",
    category: "Farm Hygiene & Biosecurity",
    options: [
      "To prevent sunlight from reaching the pond bottom",
      "To shield vulnerable small fish from kingfishers, herons, snakes, and frogs that cause massive stock depletion",
      "To prevent atmospheric oxygen from entering pond water",
      "To keep pond water at freezing temperatures"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-22",
    text: "Why must fish feeding response be actively observed throughout every feeding session?",
    category: "Feeding & Feed Management",
    options: [
      "It allows the attendant to evaluate appetite, detect health or water issues early, and adjust rations to eliminate waste",
      "Farm regulations require staff to stand still for 30 minutes",
      "To count the exact number of pellets swallowed by individual fish",
      "Fish appetite never changes so observation is merely ceremonial"
    ],
    correctIndex: 0
  },
  {
    id: "KQ-23",
    text: "What is the primary benefit of draining and sun-drying an earthen pond bottom between production cycles?",
    category: "Pond Management",
    options: [
      "To solidify soil into construction grade bricks",
      "To oxidize organic sludge, eradicate pathogenic bacteria and parasite eggs, and mineralize bottom nutrients",
      "To encourage weed and terrestrial plant growth for fish grazing",
      "To seal the pond bottom permanently so water cannot seep in"
    ],
    correctIndex: 1
  },
  {
    id: "KQ-24",
    text: "What is the recommended practice when scooping and handling live fish during sampling or grading?",
    category: "Fish Handling & Grading",
    options: [
      "Use knotless dip nets, handle with wet hands, and return fish to oxygenated water as rapidly as possible",
      "Drop fish directly onto dry concrete surfaces for sorting",
      "Hold fish by their gills or tail fins",
      "Squeeze the fish tightly around the abdomen to calm them"
    ],
    correctIndex: 0
  },
  {
    id: "KQ-25",
    text: "Why is daily logging of feed amounts, water temperature, mortality, and water changes essential for farm profitability?",
    category: "Basic Farm Operations",
    options: [
      "It enables accurate calculation of FCR, cost per kg of fish produced, growth rates, and early identification of farm issues",
      "It is only maintained for showing external visitors",
      "It allows farm owners to assign blame arbitrarily",
      "It replaces the physical requirement of inspecting ponds"
    ],
    correctIndex: 0
  }
];

/* ─── 25 Compatibility Questions (Job Fit, Work Attitude & Discipline) ─── */
export const INIT_C: CQuestion[] = [
  {
    id: "CQ-1",
    text: "When assigned routine, repetitive farm duties such as cleaning water filters, scrubbing tanks, or inspecting dykes daily, your attitude is:",
    category: "Work Attitude",
    options: [
      "I rush through them casually so I can relax earlier",
      "I perform them thoroughly and consistently because routine farm tasks are foundational to preventing catastrophic fish loss",
      "I only clean thoroughly when the farm owner or manager is on site",
      "I try to pass repetitive tasks to newer workers"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-2",
    text: "Morning feeding is scheduled strictly for 6:30 AM to catch the cool hours. What is your attendance standard?",
    category: "Reliability & Attendance",
    options: [
      "Arrive 10 to 15 minutes before 6:30 AM to inspect pond conditions and prepare feed portions on time",
      "Arrive between 6:30 AM and 6:45 AM depending on morning traffic",
      "Start feeding whenever I arrive as long as it gets done during the morning",
      "Come in early only if promised extra overtime allowance"
    ],
    correctIndex: 0
  },
  {
    id: "CQ-3",
    text: "While draining a settling pond, you accidentally leave a drain valve open, causing the water level to drop significantly. What is your immediate action?",
    category: "Responsibility & Accountability",
    options: [
      "Close it quietly and hope nobody notices the low water mark",
      "Blame the worker on the previous shift for not checking the valve",
      "Immediately close the valve, check fish condition, report the mistake honestly to the supervisor, and help restore the water level",
      "Wait to see if the supervisor discovers it before admitting anything"
    ],
    correctIndex: 2
  },
  {
    id: "CQ-4",
    text: "Farm Standard Operating Procedures (SOP) state that every opened feed bag must be logged immediately upon opening. You are in a rush to feed. What do you do?",
    category: "Following Instructions & SOPs",
    options: [
      "Log the opened bag in the system immediately as required by SOP before distributing any feed",
      "Open the bag and assume you will remember to record it at the end of the day",
      "Skip recording if you only took a few kilograms out of the bag",
      "Let another worker guess how many bags were used later"
    ],
    correctIndex: 0
  },
  {
    id: "CQ-5",
    text: "During harvest, another team member is struggling to haul in a heavy seine net. Your personal assigned task is finished for the moment. How do you respond?",
    category: "Teamwork & Collaboration",
    options: [
      "Take a break on the side since your specific task is already complete",
      "Immediately step in without waiting to be asked and assist your teammate to complete the harvest safely",
      "Watch from the bank to see if they can manage on their own",
      "Criticize the coworker for working too slowly"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-6",
    text: "No supervisor is present on the farm during your late afternoon shift. How do you conduct yourself?",
    category: "Work Discipline",
    options: [
      "Leave the farm an hour early since nobody is monitoring the gate",
      "Relax in the staff room and browse social media until shift end",
      "Maintain full work discipline, complete all evening feeding, pond checks, and security lockups with high integrity",
      "Perform only the bare minimum visible tasks that can be verified tomorrow"
    ],
    correctIndex: 2
  },
  {
    id: "CQ-7",
    text: "During your inspection rounds, you notice a water pipe connection spraying water heavily near the pump house. What is your approach?",
    category: "Problem-Solving Approach",
    options: [
      "Walk past it because plumbing repair is not in your official job title",
      "Assess the leak, shut off the appropriate local valve or apply an emergency clamp, and report the breakdown to the supervisor immediately",
      "Place a bucket under it and mention it only if someone asks",
      "Shut off the entire farm's water supply without notifying any pond attendants"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-8",
    text: "Fish farming involves working outdoors in heavy rain, bright tropical sun, muddy dykes, and humid hatchery conditions. How do you adapt?",
    category: "Farm Conditions & Resilience",
    options: [
      "Refuse outdoor tasks whenever the weather is wet or excessively hot",
      "Wear appropriate protective gear (rain boots, overalls, hat) and maintain strong work stamina regardless of outdoor conditions",
      "Complain continuously to colleagues about outdoor farm conditions",
      "Request sick leave on rainy mornings"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-9",
    text: "The farm manager asks you to temporarily pause your regular tasks to assist with an urgent fish sorting and mortality count. How do you respond?",
    category: "Role Suitability & Adaptability",
    options: [
      "Refuse because sorting fish was not written in your original contract",
      "Readily assist with a constructive attitude, listen to sorting instructions, and adapt to the farm's immediate operational need",
      "Perform the task slowly and sulk to show your dissatisfaction",
      "Make an excuse about sudden personal business and leave"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-10",
    text: "Heavy weekend rains flood the public road leading to the farm on a morning when you are rostered on sole feeding duty. What do you do?",
    category: "Reliability & Attendance",
    options: [
      "Assume the farm knows it rained and stay home without calling",
      "Immediately contact the farm supervisor, communicate the obstacle, explore alternative routes or transport, and ensure fish are not neglected",
      "Wait until Monday morning to explain why you didn't show up",
      "Post about the flooded roads online instead of contacting the farm"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-11",
    text: "The farm manager gives you a strict treatment dosage for a sick pond. A coworker tells you to pour in triple the chemical to 'finish the disease fast.' What do you do?",
    category: "Following Instructions & SOPs",
    options: [
      "Follow the coworker's advice to accelerate the treatment",
      "Strictly adhere to the supervisor's authorized written dosage and politely explain the fatal risk of chemical overdose to the coworker",
      "Pour in an arbitrary amount between the two recommendations",
      "Abandon the treatment completely"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-12",
    text: "You notice that feed bags are frequently being misplaced because the pallet labels are torn. How do you handle this?",
    category: "Work Attitude",
    options: [
      "Ignore it because warehouse management is not your department",
      "Take initiative to re-label the pallets clearly or suggest a simple layout fix to your supervisor to avoid feeding errors",
      "Move bags randomly and let other staff search for them",
      "Complain about other workers' carelessness without offering a solution"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-13",
    text: "You spot an unauthorized stranger carrying an empty sack near the production ponds during your evening patrol. What is your response?",
    category: "Responsibility & Accountability",
    options: [
      "Walk away and assume they are an invited guest of the owner",
      "Maintain a safe distance, politely challenge their presence, and immediately alert farm security and management",
      "Help them carry whatever they pick up",
      "Hide and say nothing to avoid getting involved"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-14",
    text: "A coworker makes an honest mistake during grading that requires re-sorting 500 fingerlings. How do you treat them?",
    category: "Teamwork & Collaboration",
    options: [
      "Mock them in front of the whole team and refuse to work with them",
      "Support them constructively in re-sorting the batch quickly and encourage them so morale stays positive",
      "Refuse to speak with them for the remainder of the shift",
      "Exaggerate the mistake to management to improve your own standing"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-15",
    text: "What is your standard regarding personal mobile phone usage while on active duty on the farm?",
    category: "Work Discipline",
    options: [
      "Keep it on silent mode, only check it during official breaks or for urgent farm communication, and keep full focus on pond safety",
      "Watch video reels and chat while walking along slippery pond dykes",
      "Make lengthy personal phone calls while operating water pumps or weighing fish",
      "Wear earbuds listening to music during fish transfers so you cannot hear coworker warnings"
    ],
    correctIndex: 0
  },
  {
    id: "CQ-16",
    text: "While throwing feed into Pond 2, you observe that fish are not eating and are hanging lethargically at the water surface. What do you do?",
    category: "Problem-Solving Approach",
    options: [
      "Continue dumping the entire scheduled feeding ration into the pond anyway",
      "Halt feeding immediately to avoid feed waste, check aeration and water inflow, test water quality parameters, and report to the supervisor urgently",
      "Leave the feed floating and go home for lunch",
      "Drain the pond completely without informing anyone"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-17",
    text: "The farm schedule requires hauling heavy 15kg feed bags and pulling harvest nets across deep earthen ponds. How do you approach the physical demands?",
    category: "Farm Conditions & Resilience",
    options: [
      "I expect others to do all physical hauling while I only watch",
      "I maintain good physical fitness, use safe lifting techniques with knees bent, and participate actively in all necessary physical farm duties",
      "I attempt one bag, declare it too heavy, and sit down",
      "I demand that all tasks be automated"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-18",
    text: "Your supervisor points out that you scattered feed too close to the pond outlet, causing valuable pellets to wash away. How do you respond?",
    category: "Role Suitability & Adaptability",
    options: [
      "Defend yourself aggressively and deny that any pellets were lost",
      "Listen with humility, accept the feedback, observe the recommended feeding zones, and ensure zero feed is lost going forward",
      "Feel insulted and intentionally feed carelessly on the next round",
      "Complain to coworkers that the supervisor is targeting you"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-19",
    text: "You are assigned the 7:00 PM evening pond aeration and dissolved oxygen check. A friend invites you to an impromptu gathering at 6:30 PM. What is your choice?",
    category: "Reliability & Attendance",
    options: [
      "Leave early without telling anyone and attend the social gathering",
      "Fulfill your scheduled farm duty completely and reliably before attending personal activities",
      "Mark the check as completed in the register without actually visiting the ponds",
      "Send an untrained non-employee acquaintance to do the check for you"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-20",
    text: "Farm safety regulations forbid smoking near the feed storage and fuel generator rooms. You see a colleague lighting up there. What do you do?",
    category: "Following Instructions & SOPs",
    options: [
      "Join them and ask for a light",
      "Respectfully and firmly remind them of the strict farm fire safety rule and the danger to millions in stock and equipment",
      "Ignore it and pretend you didn't notice",
      "Post a video on social media without warning them of the immediate hazard"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-21",
    text: "How do you view the daily administrative requirement of recording mortality numbers, opened feed bags, and water metrics?",
    category: "Work Attitude",
    options: [
      "A pointless waste of time that prevents actual work",
      "An essential management discipline that protects the farm from stock theft, disease outbreak, and financial loss",
      "Something to fill in randomly at the end of the month with fabricated numbers",
      "Only necessary when external visitors are on the farm"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-22",
    text: "A bag of 2.0 mm Coppens feed tears during offloading, spilling feed on the store floor. What do you do?",
    category: "Responsibility & Accountability",
    options: [
      "Kick the spilled feed under a wooden pallet to hide it",
      "Immediately sweep up the clean feed into a clean container, patch and weigh the bag, log the occurrence, and store it safely off the floor",
      "Leave the spill for the weekend cleaners",
      "Throw the entire bag into the outdoor waste dump"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-23",
    text: "Your daily tasks are complete at 4:30 PM, but your colleague is struggling to finish cleaning and disinfecting the nursery grading vats before 5:00 PM. What do you do?",
    category: "Teamwork & Collaboration",
    options: [
      "Sign out immediately and walk past them",
      "Step in willingly to help them finish the disinfection thoroughly so the team completes the day successfully",
      "Laugh at them for not working faster",
      "Take photos of their unfinished work to report them to the owner"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-24",
    text: "How do you handle sensitive and expensive farm equipment, such as digital DO meters, pH pens, and water pump starters?",
    category: "Work Discipline",
    options: [
      "Handle them roughly and leave them outside exposed to rain and mud",
      "Operate strictly according to instructions, rinse sensors after use, dry them, and store them securely in their designated protective cases",
      "Allow unauthorized visitors to play with the testing instruments",
      "Attempt to dismantle electronic meters when they run out of battery"
    ],
    correctIndex: 1
  },
  {
    id: "CQ-25",
    text: "The main borehole water pump suddenly trips its electrical breaker during pond filling. What is your immediate course of action?",
    category: "Problem-Solving Approach",
    options: [
      "Keep forcing the breaker back on repeatedly until smoke appears",
      "Stop, inspect for visible pump blockage or leaks, notify the supervisor or farm technician immediately, and follow electrical safety protocols",
      "Abandon the pond and leave the farm",
      "Blame the electric company without checking the pump"
    ],
    correctIndex: 1
  }
];
