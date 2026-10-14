// Moon radii and periods: NASA/JPL; full references in assets/research/moon-stories.json.
export const FAMILIES={"earth": ["moon"], "jupiter": ["io", "europa", "ganymede", "callisto"], "saturn": ["mimas", "enceladus", "tethys", "dione", "rhea", "titan", "iapetus"]};
export const MOONS={
 "moon": {
  "title": "The Moon",
  "parent": "earth",
  "number": "MOON",
  "chapter": "OUR NEAREST NEIGHBOUR",
  "lead": "Our nearest world, holding the marks of ancient impacts.",
  "text": "Bright highlands surround dark plains of ancient lava. The Moon turns once during each journey around Earth, keeping the same side towards us.",
  "question": "The far side has daylight too.",
  "hint": "Move the sunlight from full light to a crescent. Turn the Moon to explore the side we cannot see from Earth.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "THE MOON / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "27.3",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn the Moon",
  "color": "#b5b4ae",
  "map": "moons/moon.jpg",
  "radius": 1737.4,
  "period": 27.322,
  "semimajorKm": 384400,
  "stories": [
   {
    "title": "The far side has sunshine too.",
    "text": "We usually see the same side of the Moon because its turn and its orbit take the same time. The hidden side still has day and night. It is a far side, not a permanently dark side.",
    "source": "https://science.nasa.gov/moon/facts/"
   },
   {
    "title": "Footsteps that stay.",
    "text": "There is no wind or rain to wash away the astronauts’ tracks. A spacecraft orbiting the Moon has photographed the trails they left decades ago.",
    "source": "https://science.nasa.gov/resource/apollo-11-landing-site/",
    "supportingSource": "https://science.nasa.gov/solar-system/moon/10-cool-things-nasas-lunar-reconnaissance-orbiter-is-teaching-us-about-the-moon/"
   }
  ]
 },
 "io": {
  "title": "Io",
  "parent": "jupiter",
  "number": "MOON",
  "chapter": "THE VOLCANIC MOON",
  "lead": "A small world constantly rebuilding itself with volcanoes.",
  "text": "Yellow, orange and dark volcanic deposits cover Io. Jupiter and neighbouring moons keep flexing its interior, helping power the most active volcanoes in the solar system.",
  "question": "A world painted by volcanoes.",
  "hint": "Turn Io and look for dark volcanic deposits among the yellows and oranges. This spacecraft map captures a world that keeps changing.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "IO / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "1.8",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Io",
  "color": "#c9b675",
  "map": "moons/io.jpg",
  "radius": 1821.49,
  "period": 1.769138,
  "semimajorKm": 421800,
  "stories": [
   {
    "title": "Hundreds of volcanoes.",
    "text": "Io has hundreds of volcanoes. Fresh lava keeps covering old ground and filling impact craters. A map of this moon can change while we are watching.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/io/facts/"
   },
   {
    "title": "Tides in solid ground.",
    "text": "Jupiter’s pull can make Io’s rocky surface rise and fall by about 100 metres. Imagine the ground beneath you lifting as high as a tall building. All that flexing heats the moon inside.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/io/facts/"
   },
   {
    "title": "Fountains made of lava.",
    "text": "Some of Io’s volcanoes throw fountains of lava kilometres into the sky. Imagine a fountain whose spray is glowing rock. Io may be small, but its eruptions are enormous.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/io/facts/"
   }
  ]
 },
 "europa": {
  "title": "Europa",
  "parent": "jupiter",
  "number": "MOON",
  "chapter": "AN OCEAN UNDER ICE",
  "lead": "A cracked shell of ice, with an ocean hidden underneath.",
  "text": "Long dark lines cross Europa’s bright ice. Measurements strongly suggest a deep, salty ocean beneath the frozen surface, making this moon an important place to explore.",
  "question": "What lies beneath the cracks?",
  "hint": "Turn the moon to follow the dark lines crossing its ice. The ocean beneath this shell is hidden from our view.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "EUROPA / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "3.6",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Europa",
  "color": "#c7b59b",
  "map": "moons/europa.jpg",
  "radius": 1560.8,
  "period": 3.551181,
  "semimajorKm": 671100,
  "stories": [
   {
    "title": "More ocean than Earth.",
    "text": "Europa is smaller than our Moon, yet its hidden ocean may hold more than twice as much water as all Earth’s oceans together. Scientists are investigating whether conditions there could support life. No life has been found.",
    "source": "https://science.nasa.gov/mission/europa-clipper/mission-faq/"
   },
   {
    "title": "An enormous ice puzzle.",
    "text": "Some dark bands have edges that fit together like jigsaw pieces. They suggest that Europa’s icy shell has cracked and moved apart, with new material filling the gaps.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/"
   },
   {
    "title": "A moon that gets squeezed warm.",
    "text": "Jupiter’s gravity stretches and relaxes Europa as it goes around. This repeated flexing creates heat inside. Even far from the Sun, a frozen surface can hide liquid water below.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/europa/europa-facts/",
    "related": "enceladus",
    "action": "Meet another ocean moon ↗"
   }
  ]
 },
 "ganymede": {
  "title": "Ganymede",
  "parent": "jupiter",
  "number": "MOON",
  "chapter": "THE LARGEST MOON",
  "lead": "The largest moon, with bright ice and its own magnetic field.",
  "text": "Dark old terrain meets lighter bands of grooved ice. Ganymede is larger than Mercury, and its magnetic field helps create glowing auroras near the poles.",
  "question": "Bigger than a planet. Still a moon.",
  "hint": "Look for dark ancient ground beside lighter, grooved ice. Then visit its orbit around Jupiter.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "GANYMEDE / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "7.2",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Ganymede",
  "color": "#958e7d",
  "map": "moons/ganymede.jpg",
  "radius": 2631.2,
  "period": 7.154553,
  "semimajorKm": 1070400,
  "stories": [
   {
    "title": "A moon bigger than a planet.",
    "text": "Ganymede is wider than Mercury. It is still a moon because it travels around Jupiter. A world’s size alone does not tell you whether it is a planet or a moon.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/"
   },
   {
    "title": "Northern lights on a moon.",
    "text": "Ganymede is the only moon known to make its own magnetic field. Glowing bands of gas form near its poles, rather like Earth’s northern and southern lights.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/"
   },
   {
    "title": "One, two, four. A rhythm in space.",
    "text": "While Ganymede makes one trip around Jupiter, Europa makes two and Io makes four. Their repeated gravitational tugs help keep this remarkable rhythm. Try counting the trips in their orrery.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/ganymede/facts/",
    "related": "jupiter-moons/ganymede",
    "action": "Watch their orbits ↗"
   }
  ]
 },
 "callisto": {
  "title": "Callisto",
  "parent": "jupiter",
  "number": "MOON",
  "chapter": "A MEMORY OF IMPACTS",
  "lead": "An ancient world that remembers countless collisions.",
  "text": "Bright impact marks cover Callisto’s dark mixture of ice and rock. Much of this surface has survived for billions of years, preserving clues to the early solar system.",
  "question": "Can a world remember a collision?",
  "hint": "Turn the world and trace its bright scars. New craters have landed on top of much older ones.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "CALLISTO / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "16.7",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Callisto",
  "color": "#9b9690",
  "map": "moons/callisto.jpg",
  "radius": 2410.3,
  "period": 16.689017,
  "semimajorKm": 1882700,
  "stories": [
   {
    "title": "A history written in craters.",
    "text": "Callisto’s surface is billions of years old and crowded with impact craters. Each scar marks a collision. With little resurfacing to erase them, the moon keeps a very long memory.",
    "source": "https://science.nasa.gov/jupiter/jupiter-moons/callisto/facts/"
   },
   {
    "title": "The mark of one enormous splash.",
    "text": "A huge impact left the Valhalla basin surrounded by circles in the crust. They look a little like ripples spreading from a stone dropped into a pond, frozen into the landscape.",
    "source": "https://science.nasa.gov/photojournal/the-valhalla-multi-ring-structure-on-callisto/"
   }
  ]
 },
 "titan": {
  "title": "Titan",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "RAIN BENEATH ORANGE SKIES",
  "lead": "Orange skies above rivers, lakes and seas of methane.",
  "text": "Titan’s thick atmosphere hides an icy landscape. Its clouds can rain liquid methane, which flows across the ground and gathers in lakes and seas.",
  "question": "What if rain was not water?",
  "hint": "Look at the orange haze, then switch to a reconstructed view beneath it. Titan’s surface is hidden from ordinary visible-light cameras.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "TITAN / THE ORANGE HAZE",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "15.9",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Titan",
  "color": "#c69c55",
  "map": "moons/titan.jpg",
  "radius": 2574.76,
  "period": 15.945421,
  "semimajorKm": 1221870,
  "stories": [
   {
    "title": "Rain made of something else.",
    "text": "Titan has clouds, rain and rivers, but its rain is methane. Here on warm Earth, methane is a gas. Titan is so cold that it can flow like water.",
    "source": "https://science.nasa.gov/saturn/moons/titan/facts/"
   },
   {
    "title": "A robot bounced here.",
    "text": "The Huygens probe landed on Titan in 2005. Scientists worked out that it bounced, slid and wobbled before coming to rest. Its pictures gave us a view from beneath the orange haze.",
    "source": "https://www.jpl.nasa.gov/news/bounce-skid-wobble-how-huygens-landed-on-titan/"
   },
   {
    "title": "Here, ice is the rock.",
    "text": "Titan is about −179°C at the surface. Water ice stays so hard that it plays the part of rock in the landscape. The rivers flowing over that frozen ground are made of liquid methane and ethane.",
    "source": "https://science.nasa.gov/saturn/moons/titan/facts/"
   }
  ]
 },
 "enceladus": {
  "title": "Enceladus",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "THE OCEAN THAT ESCAPES",
  "lead": "A bright little moon spraying ocean material into space.",
  "text": "Enceladus has a frozen white surface and a global ocean underneath. Near its south pole, long cracks release jets of water vapour and tiny grains of ice.",
  "question": "An ocean spraying into space.",
  "hint": "Drag downward to tilt the south pole towards you. Look for its long fractures: Cassini sampled the spray escaping from this tiny world.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "ENCELADUS / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "1.4",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Enceladus",
  "color": "#c9d2d2",
  "map": "moons/enceladus.jpg",
  "radius": 252.1,
  "period": 1.370218,
  "semimajorKm": 238020,
  "stories": [
   {
    "title": "An ocean we can sample from space.",
    "text": "Jets burst from cracks called tiger stripes. Cassini flew through the spray and sampled material from the hidden ocean. It found ingredients useful for life, but no evidence of living things.",
    "source": "https://science.nasa.gov/saturn/moons/enceladus/"
   },
   {
    "title": "A moon that feeds a ring.",
    "text": "Some ice grains escape Enceladus and spread around Saturn. They help make the faint E ring. This tiny moon keeps adding fresh material to an enormous ring.",
    "source": "https://science.nasa.gov/saturn/moons/enceladus/"
   },
   {
    "title": "Hot springs beneath a frozen world.",
    "text": "Tiny grains found by Cassini suggest that hot water meets rock deep beneath the ice. Scientists think Enceladus may have hot springs on its ocean floor, far below the freezing surface.",
    "source": "https://science.nasa.gov/saturn/moons/enceladus/",
    "related": "europa",
    "action": "Visit Europa’s hidden ocean ↗"
   }
  ]
 },
 "mimas": {
  "title": "Mimas",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "ONE ENORMOUS COLLISION",
  "lead": "A small icy moon with one astonishingly large crater.",
  "text": "Mimas is covered in impact scars. The largest, Herschel, takes up a striking part of its face, with steep walls and a mountain rising from the middle.",
  "question": "How did this little moon survive?",
  "hint": "Turn Mimas and look for Herschel, the enormous crater. It takes up about a third of the moon’s width.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "MIMAS / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "0.9",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Mimas",
  "color": "#b7bbb9",
  "map": "moons/mimas.jpg",
  "radius": 198.2,
  "period": 0.9424218,
  "semimajorKm": 185520,
  "stories": [
   {
    "title": "An impact it almost did not survive.",
    "text": "Herschel crater is about 130 kilometres wide, roughly a third of Mimas’s diameter. The collision that made it may have come close to breaking the little moon apart.",
    "source": "https://science.nasa.gov/saturn/moons/mimas/"
   },
   {
    "title": "Around Saturn before tomorrow.",
    "text": "Mimas completes an orbit in about 23 hours. It could make one whole trip around Saturn between one morning on Earth and the next, always keeping the same face towards the planet.",
    "source": "https://science.nasa.gov/saturn/moons/mimas/"
   }
  ]
 },
 "rhea": {
  "title": "Rhea",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "A WORLD OF ICE CLIFFS",
  "lead": "A frozen world crossed by bright cliffs of ice.",
  "text": "Saturn’s second-largest moon has a surface rich in water ice. Ancient craters and bright fracture walls record a history of impacts and cracking.",
  "question": "Here, ice behaves like rock.",
  "hint": "Turn the moon to look for bright lines among the craters. Close-up spacecraft images revealed cliffs of clean ice.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "RHEA / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "4.5",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Rhea",
  "color": "#bcbdb7",
  "map": "moons/rhea.jpg",
  "radius": 763.5,
  "period": 4.5175,
  "semimajorKm": 527040,
  "stories": [
   {
    "title": "Ice that behaves like rock.",
    "text": "Rhea is so cold that its water ice acts like hard rock. Bright lines once looked like wisps in distant pictures. Close-up images revealed steep, shining walls of ice.",
    "source": "https://science.nasa.gov/saturn/moons/rhea/"
   },
   {
    "title": "Oxygen, but no air to breathe.",
    "text": "Cassini found a very thin cloud of oxygen and carbon dioxide around Rhea. The oxygen is trillions of times less dense than on Earth. Finding oxygen does not always mean finding breathable air.",
    "source": "https://science.nasa.gov/saturn/moons/rhea/"
   }
  ]
 },
 "iapetus": {
  "title": "Iapetus",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "THE TWO-TONE MOON",
  "lead": "A two-tone moon with mountains along its middle.",
  "text": "One side of Iapetus is much darker than the other. Along part of its equator, a strange ridge makes the moon resemble a walnut with a raised seam.",
  "question": "Why is one side so dark?",
  "hint": "Turn Iapetus to compare its bright and dark regions. This contrast is real: dark ground absorbs more sunlight.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "IAPETUS / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "79.3",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Iapetus",
  "color": "#a39b8e",
  "map": "moons/iapetus.jpg",
  "radius": 734.3,
  "period": 79.330183,
  "semimajorKm": 3560850,
  "stories": [
   {
    "title": "A mountain seam around a moon.",
    "text": "A line of mountains follows part of Iapetus’s equator. Some rise about ten kilometres. Scientists are still debating how this unusual ridge formed.",
    "source": "https://science.nasa.gov/saturn/moons/iapetus/"
   },
   {
    "title": "Dark ground gets darker.",
    "text": "Dark material absorbs more sunshine than bright ice. On Iapetus, that extra warmth helps ice escape from darker places and settle in colder ones, making the contrast even stronger.",
    "source": "https://science.nasa.gov/saturn/moons/iapetus/"
   }
  ]
 },
 "dione": {
  "title": "Dione",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "BRIGHT FRACTURES IN ICE",
  "lead": "A moon of ice cliffs travelling with two tiny companions.",
  "text": "Bright fractures cut across Dione’s cratered surface. Two smaller moons share its path around Saturn, one travelling ahead and the other behind.",
  "question": "Lines that turned out to be cliffs.",
  "hint": "Explore the fine bright fractures in the dark ground. These are walls of ice, exposed where the crust broke.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "DIONE / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "2.7",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Dione",
  "color": "#afbdbd",
  "map": "moons/dione.jpg",
  "radius": 561.4,
  "period": 2.736915,
  "semimajorKm": 377400,
  "stories": [
   {
    "title": "Lines that became cliffs.",
    "text": "From far away, Dione’s bright markings looked like delicate streaks. Cassini came closer and found canyon walls hundreds of metres high, where clean ice shines through darker dust.",
    "source": "https://science.nasa.gov/saturn/moons/dione/"
   },
   {
    "title": "Three moons on one track.",
    "text": "Dione shares its orbit with little Helene and Polydeuces. One travels about a sixth of a circle ahead; the other trails behind. Gravity keeps them near these special places.",
    "source": "https://science.nasa.gov/saturn/moons/dione/"
   }
  ]
 },
 "tethys": {
  "title": "Tethys",
  "parent": "saturn",
  "number": "MOON",
  "chapter": "A VALLEY AROUND A WORLD",
  "lead": "An icy moon split by a valley more than half a world long.",
  "text": "Tethys has two enormous landmarks: a broad, shallow impact crater and the long valley called Ithaca Chasma. Both record dramatic events in this moon’s past.",
  "question": "A crack more than half a world long.",
  "hint": "Turn the moon to look for broad Odysseus crater and the long valley Ithaca Chasma.",
  "gesture": "DRAG TO TURN & TILT · ARROW KEYS TO EXPLORE",
  "caption": "TETHYS / SPACECRAFT SURFACE MOSAIC",
  "note": "OBSERVED MOSAIC · COVERAGE & COLOUR VARY · SEE FIELD NOTES",
  "fact": "1.9",
  "unit": "EARTH DAYS / ONE ORBIT",
  "play": "Turn Tethys",
  "color": "#c0c5c3",
  "map": "moons/tethys.jpg",
  "radius": 531.1,
  "period": 1.887802,
  "semimajorKm": 294660,
  "stories": [
   {
    "title": "A valley 2,000 kilometres long.",
    "text": "Ithaca Chasma stretches roughly 2,000 kilometres across Tethys. It is so long that it reaches more than halfway around this little moon. Scientists are still working out what split the ice.",
    "source": "https://science.nasa.gov/saturn/moons/tethys/"
   },
   {
    "title": "A crater almost half a moon wide.",
    "text": "Odysseus crater is about 400 kilometres across, nearly two-fifths of Tethys’s width. Its walls have slumped over time, leaving a shallow bowl where a huge collision once struck.",
    "source": "https://science.nasa.gov/saturn/moons/tethys/"
   }
  ]
 }
};

// Circular teaching model: measured periods, illustrative phases and composed radii.
export function moonPosition(id,days,r,index=0){
 const angle=1.1+index*2.399963+days/MOONS[id].period*Math.PI*2;
 const inclination=id==='iapetus'?.27:id==='moon'?.09:0;
 return [Math.cos(angle)*r,Math.sin(angle)*r*Math.sin(inclination),Math.sin(angle)*r*Math.cos(inclination)];
}
