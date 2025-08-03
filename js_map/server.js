const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const net = require('net');

const app = express();
const PORT = 5000;

const ServerType = Object.freeze({
  ACORE: 'acore',
  TCORE: 'tcore'
})

const SELECTED_SERVER = process.env.SELECTED_SERVER || ServerType.ACORE
//const SELECTED_SERVER = ServerType.TCORE

// Map to human-readable names
const CoreNames = {
  [ServerType.ACORE]: 'AzerothCore',
  [ServerType.TCORE]: 'TrinityCore'
}

// Per-core DB credentials
const RealmDBCreds = {
  [ServerType.ACORE]: { user: 'acore',   password: 'acore',   database: 'acore_auth' },
  [ServerType.TCORE]: { user: 'trinity', password: 'trinity', database: 'auth'       }
}
const WorldDBCreds = {
  [ServerType.ACORE]: { user: 'acore',   password: 'acore',   database: 'acore_world' },
  [ServerType.TCORE]: { user: 'trinity', password: 'trinity', database: 'world'        }
}
const CharactersDBCreds = {
  [ServerType.ACORE]: { user: 'acore',   password: 'acore',   database: 'acore_characters' },
  [ServerType.TCORE]: { user: 'trinity', password: 'trinity', database: 'characters'        }
}

// And the two different GM-account queries
const GMQueries = {
  [ServerType.ACORE]: "SELECT GROUP_CONCAT(`id` SEPARATOR ' ')   AS ids FROM `account_access` WHERE `gmlevel`>'0'",
  [ServerType.TCORE]: "SELECT GROUP_CONCAT(`AccountID` SEPARATOR ' ') AS ids FROM `account_access` WHERE `SecurityLevel`>'0'"
}

// Configuration
const CONFIG = {
    selected_server: SELECTED_SERVER,      
    core_name:       CoreNames[SELECTED_SERVER],

    language: 'en',
    site_encoding: 'utf8',
    db_type: 'MySQL',
    realm_id: 1,
    
    // Database configurations
    realm_db: {
        host: '127.0.0.1',
        port: 3306,
        ...RealmDBCreds[SELECTED_SERVER],
        charset: 'utf8'
    },
    
    world_db: {
        1: {
            host: '127.0.0.1',
            port: 3306,
            ...WorldDBCreds[SELECTED_SERVER],
            charset: 'utf8'
        }
    },
    
    characters_db: {
        1: {
            host: '127.0.0.1',
            port: 3306,
            ...CharactersDBCreds[SELECTED_SERVER],
            charset: 'utf8'
        }
    },

    // Server configuration
    server: {
        1: {
            addr: '127.0.0.1',
            addr_wan: '127.0.0.1',
            game_port: 8085,
            rev: '',
            both_factions: true
        }
    },

    gmQuery: GMQueries[SELECTED_SERVER],
    
    // GM and map settings
    gm_online: true,
    gm_online_count: 100,
    map_gm_show_online_only_gmoff: 1,
    map_gm_show_online_only_gmvisible: 1,
    map_gm_add_suffix: 1,
    map_status_gm_include_all: 0,
    map_show_status: 1,
    map_show_time: 1,
    map_time: 5,
    map_time_to_show_uptime: 3000,
    map_time_to_show_maxonline: 3000,
    map_time_to_show_gmonline: 3000,
    
    // Constants
    maps_for_points: "0,1,530,571,609",
    img_base: "img/map/",
    img_base2: "img/c_icons/",
    PLAYER_FLAGS: 0
};

// Language definitions
const LANG_DEFS = {
    maps_names: ['Azeroth', 'Outland', 'Northrend'],
    total: 'Total',
    faction: ['Alliance', 'Horde'],
    name: 'Name',
    race: 'Race',
    class: 'Class',
    level: 'lvl',
    click_to_next: 'Click: go to next',
    click_to_first: 'Click: go to first'
};

const CHARACTER_RACE = {
    1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead',
    6: 'Tauren', 7: 'Gnome', 8: 'Troll', 9: 'Goblin', 10: 'Blood Elf', 11: 'Draenei'
};

const CHARACTER_CLASS = {
    1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest',
    6: 'Death Knight', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid'
};

// TODO: put into json file...
const ZONES = {
    1: 'Dun Morogh',
    2: 'Longshore',
    3: 'Badlands',
    4: 'Blasted Lands',
    7: 'Blackwater Cove',
    8: 'Swamp of Sorrows',
    9: 'Northshire Valley',
    10: 'Duskwood',
    11: 'Wetlands',
    12: 'Elwynn Forest',
    13: 'The World Tree',
    14: 'Durotar',
    15: 'Dustwallow Marsh',
    16: 'Azshara',
    17: 'The Barrens',
    18: 'Crystal Lake',
    19: 'Zul`Gurub',
    20: 'Moonbrook',
    21: 'Kul Tiras',
    22: 'Programmer Isle',
    23: 'Northshire River',
    24: 'Northshire Abbey',
    25: 'Blackrock Mountain',
    26: 'Lighthouse',
    28: 'Western Plaguelands',
    30: 'Nine',
    32: 'The Cemetary',
    33: 'Stranglethorn Vale',
    34: 'Echo Ridge Mine',
    35: 'Booty Bay',
    36: 'Alterac Mountains',
    37: 'Lake Nazferiti',
    38: 'Loch Modan',
    40: 'Westfall',
    41: 'Deadwind Pass',
    42: 'Darkshire',
    43: 'Wild Shore',
    44: 'Redridge Mountains',
    45: 'Arathi Highlands',
    46: 'Burning Steppes',
    47: 'The Hinterlands',
    49: 'Dead Man`s Hole',
    51: 'Searing Gorge',
    53: 'Thieves Camp',
    54: 'Jasperlode Mine',
    55: 'Valley of Heroes UNUSED',
    56: 'Heroes` Vigil',
    57: 'Fargodeep Mine',
    59: 'Northshire Vineyards',
    60: 'Forest`s Edge',
    61: 'Thunder Falls',
    62: 'Brackwell Pumpkin Patch',
    63: 'The Stonefield Farm',
    64: 'The Maclure Vineyards',
    65: 'Dragonblight',
    66: 'Zul`Drak',
    67: 'The Storm Peaks',
    68: 'Lake Everstill',
    69: 'Lakeshire',
    70: 'Stonewatch',
    71: 'Stonewatch Falls',
    72: 'The Dark Portal',
    73: 'The Tainted Scar',
    74: 'Pool of Tears',
    75: 'Stonard',
    76: 'Fallow Sanctuary',
    77: 'Anvilmar',
    80: 'Stormwind Mountains',
    81: 'Jeff NE Quadrant Changed',
    82: 'Jeff NW Quadrant',
    83: 'Jeff SE Quadrant',
    84: 'Jeff SW Quadrant',
    85: 'Tirisfal Glades',
    86: 'Stone Cairn Lake',
    87: 'Goldshire',
    88: 'Eastvale Logging Camp',
    89: 'Mirror Lake Orchard',
    91: 'Tower of Azora',
    92: 'Mirror Lake',
    93: 'Vul`Gol Ogre Mound',
    94: 'Raven Hill',
    95: 'Redridge Canyons',
    96: 'Tower of Ilgalar',
    97: 'Alther`s Mill',
    98: 'Rethban Caverns',
    99: 'Rebel Camp',
    100: 'Nesingwary`s Expedition',
    101: 'Kurzen`s Compound',
    102: 'Ruins of Zul`Kunda',
    103: 'Ruins of Zul`Mamwe',
    104: 'The Vile Reef',
    105: 'Mosh`Ogg Ogre Mound',
    106: 'The Stockpile',
    107: 'Saldean`s Farm',
    108: 'Sentinel Hill',
    109: 'Furlbrow`s Pumpkin Farm',
    111: 'Jangolode Mine',
    113: 'Gold Coast Quarry',
    115: 'Westfall Lighthouse',
    116: 'Misty Valley',
    117: 'Grom`gol Base Camp',
    118: 'Whelgar`s Excavation Site',
    120: 'Westbrook Garrison',
    121: 'Tranquil Gardens Cemetery',
    122: 'Zuuldaia Ruins',
    123: 'Bal`lal Ruins',
    125: 'Kal`ai Ruins',
    126: 'Tkashi Ruins',
    127: 'Balia`mah Ruins',
    128: 'Ziata`jai Ruins',
    129: 'Mizjah Ruins',
    130: 'Silverpine Forest',
    131: 'Kharanos',
    132: 'Coldridge Valley',
    133: 'Gnomeregan',
    134: 'Gol`Bolar Quarry',
    135: 'Frostmane Hold',
    136: 'The Grizzled Den',
    137: 'Brewnall Village',
    138: 'Misty Pine Refuge',
    139: 'Eastern Plaguelands',
    141: 'Teldrassil',
    142: 'Ironband`s Excavation Site',
    143: 'Mo`grosh Stronghold',
    144: 'Thelsamar',
    145: 'Algaz Gate',
    146: 'Stonewrought Dam',
    147: 'The Farstrider Lodge',
    148: 'Darkshore',
    149: 'Silver Stream Mine',
    150: 'Menethil Harbor',
    151: 'Designer Island',
    152: 'The Bulwark',
    153: 'Ruins of Lordaeron',
    154: 'Deathknell',
    155: 'Night Web`s Hollow',
    156: 'Solliden Farmstead',
    157: 'Agamand Mills',
    158: 'Agamand Family Crypt',
    159: 'Brill',
    160: 'Whispering Gardens',
    161: 'Terrace of Repose',
    162: 'Brightwater Lake',
    163: 'Gunther`s Retreat',
    164: 'Garren`s Haunt',
    165: 'Balnir Farmstead',
    166: 'Cold Hearth Manor',
    167: 'Crusader Outpost',
    168: 'The North Coast',
    169: 'Whispering Shore',
    170: 'Lordamere Lake',
    172: 'Fenris Isle',
    173: 'Faol`s Rest',
    186: 'Dolanaar',
    187: 'Darnassus UNUSED',
    188: 'Shadowglen',
    189: 'Steelgrill`s Depot',
    190: 'Hearthglen',
    192: 'Northridge Lumber Camp',
    193: 'Ruins of Andorhal',
    195: 'School of Necromancy',
    196: 'Uther`s Tomb',
    197: 'Sorrow Hill',
    198: 'The Weeping Cave',
    199: 'Felstone Field',
    200: 'Dalson`s Tears',
    201: 'Gahrron`s Withering',
    202: 'The Writhing Haunt',
    203: 'Mardenholde Keep',
    204: 'Pyrewood Village',
    205: 'Dun Modr',
    206: 'Utgarde Keep',
    207: 'The Great Sea',
    208: 'Unused Ironcladcove',
    209: 'Shadowfang Keep',
    210: 'Icecrown',
    211: 'Iceflow Lake',
    212: 'Helm`s Bed Lake',
    213: 'Deep Elem Mine',
    214: 'The Great Sea',
    215: 'Mulgore',
    219: 'Alexston Farmstead',
    220: 'Red Cloud Mesa',
    221: 'Camp Narache',
    222: 'Bloodhoof Village',
    223: 'Stonebull Lake',
    224: 'Ravaged Caravan',
    225: 'Red Rocks',
    226: 'The Skittering Dark',
    227: 'Valgan`s Field',
    228: 'The Sepulcher',
    229: 'Olsen`s Farthing',
    230: 'The Greymane Wall',
    231: 'Beren`s Peril',
    232: 'The Dawning Isles',
    233: 'Ambermill',
    235: 'Fenris Keep',
    236: 'Shadowfang Keep',
    237: 'The Decrepit Ferry',
    238: 'Malden`s Orchard',
    239: 'The Ivar Patch',
    240: 'The Dead Field',
    241: 'The Rotting Orchard',
    242: 'Brightwood Grove',
    243: 'Forlorn Rowe',
    244: 'The Whipple Estate',
    245: 'The Yorgen Farmstead',
    246: 'The Cauldron',
    247: 'Grimesilt Dig Site',
    249: 'Dreadmaul Rock',
    250: 'Ruins of Thaurissan',
    251: 'Flame Crest',
    252: 'Blackrock Stronghold',
    253: 'The Pillar of Ash',
    254: 'Blackrock Mountain',
    255: 'Altar of Storms',
    256: 'Aldrassil',
    257: 'Shadowthread Cave',
    258: 'Fel Rock',
    259: 'Lake Al`Ameth',
    260: 'Starbreeze Village',
    261: 'Gnarlpine Hold',
    262: 'Ban`ethil Barrow Den',
    263: 'The Cleft',
    264: 'The Oracle Glade',
    265: 'Wellspring River',
    266: 'Wellspring Lake',
    267: 'Hillsbrad Foothills',
    268: 'Azshara Crater',
    269: 'Dun Algaz',
    271: 'Southshore',
    272: 'Tarren Mill',
    275: 'Durnholde Keep',
    276: 'UNUSED Stonewrought Pass',
    277: 'The Foothill Caverns',
    278: 'Lordamere Internment Camp',
    279: 'Dalaran Crater',
    280: 'Strahnbrad',
    281: 'Ruins of Alterac',
    282: 'Crushridge Hold',
    283: 'Slaughter Hollow',
    284: 'The Uplands',
    285: 'Southpoint Tower',
    286: 'Hillsbrad Fields',
    287: 'Hillsbrad',
    288: 'Azurelode Mine',
    289: 'Nethander Stead',
    290: 'Dun Garok',
    293: 'Thoradin`s Wall',
    294: 'Eastern Strand',
    295: 'Western Strand',
    296: 'South Seas UNUSED',
    297: 'Jaguero Isle',
    298: 'Baradin Bay',
    299: 'Menethil Bay',
    300: 'Misty Reed Strand',
    301: 'The Savage Coast',
    302: 'The Crystal Shore',
    303: 'Shell Beach',
    305: 'North Tide`s Run',
    306: 'South Tide`s Run',
    307: 'The Overlook Cliffs',
    308: 'The Forbidding Sea',
    309: 'Ironbeard`s Tomb',
    310: 'Crystalvein Mine',
    311: 'Ruins of Aboraz',
    312: 'Janeiro`s Point',
    313: 'Northfold Manor',
    314: 'Go`Shek Farm',
    315: 'Dabyrie`s Farmstead',
    316: 'Boulderfist Hall',
    317: 'Witherbark Village',
    318: 'Drywhisker Gorge',
    320: 'Refuge Pointe',
    321: 'Hammerfall',
    322: 'Blackwater Shipwrecks',
    323: 'O`Breen`s Camp',
    324: 'Stromgarde Keep',
    325: 'The Tower of Arathor',
    326: 'The Sanctum',
    327: 'Faldir`s Cove',
    328: 'The Drowned Reef',
    330: 'Thandol Span',
    331: 'Ashenvale',
    332: 'The Great Sea',
    333: 'Circle of East Binding',
    334: 'Circle of West Binding',
    335: 'Circle of Inner Binding',
    336: 'Circle of Outer Binding',
    337: 'Apocryphan`s Rest',
    338: 'Angor Fortress',
    339: 'Lethlor Ravine',
    340: 'Kargath',
    341: 'Camp Kosh',
    342: 'Camp Boff',
    343: 'Camp Wurg',
    344: 'Camp Cagg',
    345: 'Agmond`s End',
    346: 'Hammertoe`s Digsite',
    347: 'Dustbelch Grotto',
    348: 'Aerie Peak',
    349: 'Wildhammer Keep',
    350: 'Quel`Danil Lodge',
    351: 'Skulk Rock',
    352: 'Zun`watha',
    353: 'Shadra`Alor',
    354: 'Jintha`Alor',
    355: 'The Altar of Zul',
    356: 'Seradane',
    357: 'Feralas',
    358: 'Brambleblade Ravine',
    359: 'Bael Modan',
    360: 'The Venture Co. Mine',
    361: 'Felwood',
    362: 'Razor Hill',
    363: 'Valley of Trials',
    364: 'The Den',
    365: 'Burning Blade Coven',
    366: 'Kolkar Crag',
    367: 'Sen`jin Village',
    368: 'Echo Isles',
    369: 'Thunder Ridge',
    370: 'Drygulch Ravine',
    371: 'Dustwind Cave',
    372: 'Tiragarde Keep',
    373: 'Scuttle Coast',
    374: 'Bladefist Bay',
    375: 'Deadeye Shore',
    377: 'Southfury River',
    378: 'Camp Taurajo',
    379: 'Far Watch Post',
    380: 'The Crossroads',
    381: 'Boulder Lode Mine',
    382: 'The Sludge Fen',
    383: 'The Dry Hills',
    384: 'Dreadmist Peak',
    385: 'Northwatch Hold',
    386: 'The Forgotten Pools',
    387: 'Lushwater Oasis',
    388: 'The Stagnant Oasis',
    390: 'Field of Giants',
    391: 'The Merchant Coast',
    392: 'Ratchet',
    393: 'Darkspear Strand',
    394: 'Grizzly Hills',
    395: 'Grizzlemaw',
    396: 'Winterhoof Water Well',
    397: 'Thunderhorn Water Well',
    398: 'Wildmane Water Well',
    399: 'Skyline Ridge',
    400: 'Thousand Needles',
    401: 'The Tidus Stair',
    403: 'Shady Rest Inn',
    404: 'Bael`dun Digsite',
    405: 'Desolace',
    406: 'Stonetalon Mountains',
    407: 'Orgrimmar UNUSED',
    408: 'Gillijim`s Isle',
    409: 'Island of Doctor Lapidis',
    410: 'Razorwind Canyon',
    411: 'Bathran`s Haunt',
    412: 'The Ruins of Ordil`Aran',
    413: 'Maestra`s Post',
    414: 'The Zoram Strand',
    415: 'Astranaar',
    416: 'The Shrine of Aessina',
    417: 'Fire Scar Shrine',
    418: 'The Ruins of Stardust',
    419: 'The Howling Vale',
    420: 'Silverwind Refuge',
    421: 'Mystral Lake',
    422: 'Fallen Sky Lake',
    424: 'Iris Lake',
    425: 'Moonwell',
    426: 'Raynewood Retreat',
    427: 'The Shady Nook',
    428: 'Night Run',
    429: 'Xavian',
    430: 'Satyrnaar',
    431: 'Splintertree Post',
    432: 'The Dor`Danil Barrow Den',
    433: 'Falfarren River',
    434: 'Felfire Hill',
    435: 'Demon Fall Canyon',
    436: 'Demon Fall Ridge',
    437: 'Warsong Lumber Camp',
    438: 'Bough Shadow',
    439: 'The Shimmering Flats',
    440: 'Tanaris',
    441: 'Lake Falathim',
    442: 'Auberdine',
    443: 'Ruins of Mathystra',
    444: 'Tower of Althalaxx',
    445: 'Cliffspring Falls',
    446: 'Bashal`Aran',
    447: 'Ameth`Aran',
    448: 'Grove of the Ancients',
    449: 'The Master`s Glaive',
    450: 'Remtravel`s Excavation',
    452: 'Mist`s Edge',
    453: 'The Long Wash',
    454: 'Wildbend River',
    455: 'Blackwood Den',
    456: 'Cliffspring River',
    457: 'The Veiled Sea',
    458: 'Gold Road',
    459: 'Scarlet Watch Post',
    460: 'Sun Rock Retreat',
    461: 'Windshear Crag',
    463: 'Cragpool Lake',
    464: 'Mirkfallon Lake',
    465: 'The Charred Vale',
    466: 'Valley of the Bloodfuries',
    467: 'Stonetalon Peak',
    468: 'The Talon Den',
    469: 'Greatwood Vale',
    470: 'Thunder Bluff UNUSED',
    471: 'Brave Wind Mesa',
    472: 'Fire Stone Mesa',
    473: 'Mantle Rock',
    474: 'Hunter Rise UNUSED',
    475: 'Spirit RiseUNUSED',
    476: 'Elder RiseUNUSED',
    477: 'Ruins of Jubuwal',
    478: 'Pools of Arlithrien',
    479: 'The Rustmaul Dig Site',
    480: 'Camp E`thok',
    481: 'Splithoof Crag',
    482: 'Highperch',
    483: 'The Screeching Canyon',
    484: 'Freewind Post',
    485: 'The Great Lift',
    486: 'Galak Hold',
    487: 'Roguefeather Den',
    488: 'The Weathered Nook',
    489: 'Thalanaar',
    490: 'Un`Goro Crater',
    491: 'Razorfen Kraul',
    492: 'Raven Hill Cemetery',
    493: 'Moonglade',
    495: 'Howling Fjord',
    496: 'Brackenwall Village',
    497: 'Swamplight Manor',
    498: 'Bloodfen Burrow',
    499: 'Darkmist Cavern',
    500: 'Moggle Point',
    501: 'Beezil`s Wreck',
    502: 'Witch Hill',
    503: 'Sentry Point',
    504: 'North Point Tower',
    505: 'West Point Tower',
    506: 'Lost Point',
    507: 'Bluefen',
    508: 'Stonemaul Ruins',
    509: 'The Den of Flame',
    510: 'The Dragonmurk',
    511: 'Wyrmbog',
    512: 'Blackhoof Village',
    513: 'Theramore Isle',
    514: 'Foothold Citadel',
    515: 'Ironclad Prison',
    516: 'Dustwallow Bay',
    517: 'Tidefury Cove',
    518: 'Dreadmurk Shore',
    536: 'Addle`s Stead',
    537: 'Fire Plume Ridge',
    538: 'Lakkari Tar Pits',
    539: 'Terror Run',
    540: 'The Slithering Scar',
    541: 'Marshal`s Refuge',
    542: 'Fungal Rock',
    543: 'Golakka Hot Springs',
    556: 'The Loch',
    576: 'Beggar`s Haunt',
    596: 'Kodo Graveyard',
    597: 'Ghost Walker Post',
    598: 'Sar`theris Strand',
    599: 'Thunder Axe Fortress',
    600: 'Bolgan`s Hole',
    602: 'Mannoroc Coven',
    603: 'Sargeron',
    604: 'Magram Village',
    606: 'Gelkis Village',
    607: 'Valley of Spears',
    608: 'Nijel`s Point',
    609: 'Kolkar Village',
    616: 'Hyjal',
    618: 'Winterspring',
    636: 'Blackwolf River',
    637: 'Kodo Rock',
    638: 'Hidden Path',
    639: 'Spirit Rock',
    640: 'Shrine of the Dormant Flame',
    656: 'Lake Elune`ara',
    657: 'The Harborage',
    676: 'Outland',
    696: 'Craftsmen`s Terrace UNUSED',
    697: 'Tradesmen`s Terrace UNUSED',
    698: 'The Temple Gardens UNUSED',
    699: 'Temple of Elune UNUSED',
    700: 'Cenarion Enclave UNUSED',
    701: 'Warrior`s Terrace UNUSED',
    702: 'Rut`theran Village',
    716: 'Ironband`s Compound',
    717: 'The Stockade',
    718: 'Wailing Caverns',
    719: 'Blackfathom Deeps',
    720: 'Fray Island',
    721: 'Gnomeregan',
    722: 'Razorfen Downs',
    736: 'Ban`ethil Hollow',
    796: 'Scarlet Monastery',
    797: 'Jerod`s Landing',
    798: 'Ridgepoint Tower',
    799: 'The Darkened Bank',
    800: 'Coldridge Pass',
    801: 'Chill Breeze Valley',
    802: 'Shimmer Ridge',
    803: 'Amberstill Ranch',
    804: 'The Tundrid Hills',
    805: 'South Gate Pass',
    806: 'South Gate Outpost',
    807: 'North Gate Pass',
    808: 'North Gate Outpost',
    809: 'Gates of Ironforge',
    810: 'Stillwater Pond',
    811: 'Nightmare Vale',
    812: 'Venomweb Vale',
    813: 'The Bulwark',
    814: 'Southfury River',
    815: 'Southfury River',
    816: 'Razormane Grounds',
    817: 'Skull Rock',
    818: 'Palemane Rock',
    819: 'Windfury Ridge',
    820: 'The Golden Plains',
    821: 'The Rolling Plains',
    836: 'Dun Algaz',
    837: 'Dun Algaz',
    838: 'North Gate Pass',
    839: 'South Gate Pass',
    856: 'Twilight Grove',
    876: 'GM Island',
    877: 'Delete ME',
    878: 'Southfury River',
    879: 'Southfury River',
    880: 'Thandol Span',
    881: 'Thandol Span',
    896: 'Purgation Isle',
    916: 'The Jansen Stead',
    917: 'The Dead Acre',
    918: 'The Molsen Farm',
    919: 'Stendel`s Pond',
    920: 'The Dagger Hills',
    921: 'Demont`s Place',
    922: 'The Dust Plains',
    923: 'Stonesplinter Valley',
    924: 'Valley of Kings',
    925: 'Algaz Station',
    926: 'Bucklebree Farm',
    927: 'The Shining Strand',
    928: 'North Tide`s Hollow',
    936: 'Grizzlepaw Ridge',
    956: 'The Verdant Fields',
    976: 'Gadgetzan',
    977: 'Steamwheedle Port',
    978: 'Zul`Farrak',
    979: 'Sandsorrow Watch',
    980: 'Thistleshrub Valley',
    981: 'The Gaping Chasm',
    982: 'The Noxious Lair',
    983: 'Dunemaul Compound',
    984: 'Eastmoon Ruins',
    985: 'Waterspring Field',
    986: 'Zalashji`s Den',
    987: 'Land`s End Beach',
    988: 'Wavestrider Beach',
    989: 'Uldum',
    990: 'Valley of the Watchers',
    991: 'Gunstan`s Post',
    992: 'Southmoon Ruins',
    996: 'Render`s Camp',
    997: 'Render`s Valley',
    998: 'Render`s Rock',
    999: 'Stonewatch Tower',
    1000: 'Galardell Valley',
    1001: 'Lakeridge Highway',
    1002: 'Three Corners',
    1016: 'Direforge Hill',
    1017: 'Raptor Ridge',
    1018: 'Black Channel Marsh',
    1019: 'The Green Belt',
    1020: 'Mosshide Fen',
    1021: 'Thelgen Rock',
    1022: 'Bluegill Marsh',
    1023: 'Saltspray Glen',
    1024: 'Sundown Marsh',
    1025: 'The Green Belt',
    1036: 'Angerfang Encampment',
    1037: 'Grim Batol',
    1038: 'Dragonmaw Gates',
    1039: 'The Lost Fleet',
    1056: 'Darrow Hill',
    1057: 'Thoradin`s Wall',
    1076: 'Webwinder Path',
    1097: 'The Hushed Bank',
    1098: 'Manor Mistmantle',
    1099: 'Camp Mojache',
    1100: 'Grimtotem Compound',
    1101: 'The Writhing Deep',
    1102: 'Wildwind Lake',
    1103: 'Gordunni Outpost',
    1104: 'Mok`Gordun',
    1105: 'Feral Scar Vale',
    1106: 'Frayfeather Highlands',
    1107: 'Idlewind Lake',
    1108: 'The Forgotten Coast',
    1109: 'East Pillar',
    1110: 'West Pillar',
    1111: 'Dream Bough',
    1112: 'Jademir Lake',
    1113: 'Oneiros',
    1114: 'Ruins of Ravenwind',
    1115: 'Rage Scar Hold',
    1116: 'Feathermoon Stronghold',
    1117: 'Ruins of Solarsal',
    1118: 'Lower Wilds UNUSED',
    1119: 'The Twin Colossals',
    1120: 'Sardor Isle',
    1121: 'Isle of Dread',
    1136: 'High Wilderness',
    1137: 'Lower Wilds',
    1156: 'Southern Barrens',
    1157: 'Southern Gold Road',
    1176: 'Zul`Farrak',
    1196: 'Utgarde Pinnacle',
    1216: 'Timbermaw Hold',
    1217: 'Vanndir Encampment',
    1218: 'TESTAzshara',
    1219: 'Legash Encampment',
    1220: 'Thalassian Base Camp',
    1221: 'Ruins of Eldarath ',
    1222: 'Hetaera`s Clutch',
    1223: 'Temple of Zin-Malor',
    1224: 'Bear`s Head',
    1225: 'Ursolan',
    1226: 'Temple of Arkkoran',
    1227: 'Bay of Storms',
    1228: 'The Shattered Strand',
    1229: 'Tower of Eldara',
    1230: 'Jagged Reef',
    1231: 'Southridge Beach',
    1232: 'Ravencrest Monument',
    1233: 'Forlorn Ridge',
    1234: 'Lake Mennar',
    1235: 'Shadowsong Shrine',
    1236: 'Haldarr Encampment',
    1237: 'Valormok',
    1256: 'The Ruined Reaches',
    1276: 'The Talondeep Path',
    1277: 'The Talondeep Path',
    1296: 'Rocktusk Farm',
    1297: 'Jaggedswine Farm',
    1316: 'Razorfen Downs',
    1336: 'Lost Rigger Cove',
    1337: 'Uldaman',
    1338: 'Lordamere Lake',
    1339: 'Lordamere Lake',
    1357: 'Gallows` Corner',
    1377: 'Silithus',
    1397: 'Emerald Forest',
    1417: 'Sunken Temple',
    1437: 'Dreadmaul Hold',
    1438: 'Nethergarde Keep',
    1439: 'Dreadmaul Post',
    1440: 'Serpent`s Coil',
    1441: 'Altar of Storms',
    1442: 'Firewatch Ridge',
    1443: 'The Slag Pit',
    1444: 'The Sea of Cinders',
    1445: 'Blackrock Mountain',
    1446: 'Thorium Point',
    1457: 'Garrison Armory',
    1477: 'The Temple of Atal`Hakkar',
    1497: 'Undercity',
    1517: 'Uldaman',
    1518: 'Not Used Deadmines',
    1519: 'Stormwind City',
    1537: 'Ironforge',
    1557: 'Splithoof Hold',
    1577: 'The Cape of Stranglethorn',
    1578: 'Southern Savage Coast',
    1579: 'Unused The Deadmines 002',
    1580: 'Unused Ironclad Cove 003',
    1581: 'The Deadmines',
    1582: 'Ironclad Cove',
    1583: 'Blackrock Spire',
    1584: 'Blackrock Depths',
    1597: 'Raptor Grounds UNUSED',
    1598: 'Grol`dom Farm UNUSED',
    1599: 'Mor`shan Base Camp',
    1600: 'Honor`s Stand UNUSED',
    1601: 'Blackthorn Ridge UNUSED',
    1602: 'Bramblescar UNUSED',
    1603: 'Agama`gor UNUSED',
    1617: 'Valley of Heroes',
    1637: 'Orgrimmar',
    1638: 'Thunder Bluff',
    1639: 'Elder Rise',
    1640: 'Spirit Rise',
    1641: 'Hunter Rise',
    1657: 'Darnassus',
    1658: 'Cenarion Enclave',
    1659: 'Craftsmen`s Terrace',
    1660: 'Warrior`s Terrace',
    1661: 'The Temple Gardens',
    1662: 'Tradesmen`s Terrace',
    1677: 'Gavin`s Naze',
    1678: 'Sofera`s Naze',
    1679: 'Corrahn`s Dagger',
    1680: 'The Headland',
    1681: 'Misty Shore',
    1682: 'Dandred`s Fold',
    1683: 'Growless Cave',
    1684: 'Chillwind Point',
    1697: 'Raptor Grounds',
    1698: 'Bramblescar',
    1699: 'Thorn Hill',
    1700: 'Agama`gor',
    1701: 'Blackthorn Ridge',
    1702: 'Honor`s Stand',
    1703: 'The Mor`shan Rampart',
    1704: 'Grol`dom Farm',
    1717: 'Razorfen Kraul',
    1718: 'The Great Lift',
    1737: 'Mistvale Valley',
    1738: 'Nek`mani Wellspring',
    1739: 'Bloodsail Compound',
    1740: 'Venture Co. Base Camp',
    1741: 'Gurubashi Arena',
    1742: 'Spirit Den',
    1757: 'The Crimson Veil',
    1758: 'The Riptide',
    1759: 'The Damsel`s Luck',
    1760: 'Venture Co. Operations Center',
    1761: 'Deadwood Village',
    1762: 'Felpaw Village',
    1763: 'Jaedenar',
    1764: 'Bloodvenom River',
    1765: 'Bloodvenom Falls',
    1766: 'Shatter Scar Vale',
    1767: 'Irontree Woods',
    1768: 'Irontree Cavern',
    1769: 'Timbermaw Hold',
    1770: 'Shadow Hold',
    1771: 'Shrine of the Deceiver',
    1777: 'Itharius`s Cave',
    1778: 'Sorrowmurk',
    1779: 'Draenil`dur Village',
    1780: 'Splinterspear Junction',
    1797: 'Stagalbog',
    1798: 'The Shifting Mire',
    1817: 'Stagalbog Cave',
    1837: 'Witherbark Caverns',
    1857: 'Thoradin`s Wall',
    1858: 'Boulder`gor',
    1877: 'Valley of Fangs',
    1878: 'The Dustbowl',
    1879: 'Mirage Flats',
    1880: 'Featherbeard`s Hovel',
    1881: 'Shindigger`s Camp',
    1882: 'Plaguemist Ravine',
    1883: 'Valorwind Lake',
    1884: 'Agol`watha',
    1885: 'Hiri`watha',
    1886: 'The Creeping Ruin',
    1887: 'Bogen`s Ledge',
    1897: 'The Maker`s Terrace',
    1898: 'Dustwind Gulch',
    1917: 'Shaol`watha',
    1937: 'Noonshade Ruins',
    1938: 'Broken Pillar',
    1939: 'Abyssal Sands',
    1940: 'Southbreak Shore',
    1941: 'Caverns of Time',
    1942: 'The Marshlands',
    1943: 'Ironstone Plateau',
    1957: 'Blackchar Cave',
    1958: 'Tanner Camp',
    1959: 'Dustfire Valley',
    1977: 'Zul`Gurub',
    1978: 'Misty Reed Post',
    1997: 'Bloodvenom Post ',
    1998: 'Talonbranch Glade ',
    2017: 'Stratholme',
    2037: 'Quel`thalas',
    2057: 'Scholomance',
    2077: 'Twilight Vale',
    2078: 'Twilight Shore',
    2079: 'Alcaz Island',
    2097: 'Darkcloud Pinnacle',
    2098: 'Dawning Wood Catacombs',
    2099: 'Stonewatch Keep',
    2100: 'Maraudon',
    2101: 'Stoutlager Inn',
    2102: 'Thunderbrew Distillery',
    2103: 'Menethil Keep',
    2104: 'Deepwater Tavern',
    2117: 'Shadow Grave',
    2118: 'Brill Town Hall',
    2119: 'Gallows` End Tavern',
    2137: 'The Pools of VisionUNUSED',
    2138: 'Dreadmist Den',
    2157: 'Bael`dun Keep',
    2158: 'Emberstrife`s Den',
    2159: 'Onyxia`s Lair',
    2160: 'Windshear Mine',
    2161: 'Roland`s Doom',
    2177: 'Battle Ring',
    2197: 'The Pools of Vision',
    2198: 'Shadowbreak Ravine',
    2217: 'Broken Spear Village',
    2237: 'Whitereach Post',
    2238: 'Gornia',
    2239: 'Zane`s Eye Crater',
    2240: 'Mirage Raceway',
    2241: 'Frostsaber Rock',
    2242: 'The Hidden Grove',
    2243: 'Timbermaw Post',
    2244: 'Winterfall Village',
    2245: 'Mazthoril',
    2246: 'Frostfire Hot Springs',
    2247: 'Ice Thistle Hills',
    2248: 'Dun Mandarr',
    2249: 'Frostwhisper Gorge',
    2250: 'Owl Wing Thicket',
    2251: 'Lake Kel`Theril',
    2252: 'The Ruins of Kel`Theril',
    2253: 'Starfall Village',
    2254: 'Ban`Thallow Barrow Den',
    2255: 'Everlook',
    2256: 'Darkwhisper Gorge',
    2257: 'Deeprun Tram',
    2258: 'The Fungal Vale',
    2259: 'UNUSEDThe Marris Stead',
    2260: 'The Marris Stead',
    2261: 'The Undercroft',
    2262: 'Darrowshire',
    2263: 'Crown Guard Tower',
    2264: 'Corin`s Crossing',
    2265: 'Scarlet Base Camp',
    2266: 'Tyr`s Hand',
    2267: 'The Scarlet Basilica',
    2268: 'Light`s Hope Chapel',
    2269: 'Browman Mill',
    2270: 'The Noxious Glade',
    2271: 'Eastwall Tower',
    2272: 'Northdale',
    2273: 'Zul`Mashar',
    2274: 'Mazra`Alor',
    2275: 'Northpass Tower',
    2276: 'Quel`Lithien Lodge',
    2277: 'Plaguewood',
    2278: 'Scourgehold',
    2279: 'Stratholme',
    2280: 'DO NOT USE',
    2297: 'Darrowmere Lake',
    2298: 'Caer Darrow',
    2299: 'Darrowmere Lake',
    2300: 'Caverns of Time',
    2301: 'Thistlefur Village',
    2302: 'The Quagmire',
    2303: 'Windbreak Canyon',
    2317: 'South Seas',
    2318: 'The Great Sea',
    2319: 'The Great Sea',
    2320: 'The Great Sea',
    2321: 'The Great Sea',
    2322: 'The Veiled Sea',
    2323: 'The Veiled Sea',
    2324: 'The Veiled Sea',
    2325: 'The Veiled Sea',
    2326: 'The Veiled Sea',
    2337: 'Razor Hill Barracks',
    2338: 'South Seas',
    2339: 'The Great Sea',
    2357: 'Bloodtooth Camp',
    2358: 'Forest Song',
    2359: 'Greenpaw Village',
    2360: 'Silverwing Outpost',
    2361: 'Nighthaven',
    2362: 'Shrine of Remulos',
    2363: 'Stormrage Barrow Dens',
    2364: 'The Great Sea',
    2365: 'The Great Sea',
    2366: 'The Black Morass',
    2367: 'Old Hillsbrad Foothills',
    2368: 'Tarren Mill',
    2369: 'Southshore',
    2370: 'Durnholde Keep',
    2371: 'Dun Garok',
    2372: 'Hillsbrad Fields',
    2373: 'Eastern Strand',
    2374: 'Nethander Stead',
    2375: 'Darrow Hill',
    2376: 'Southpoint Tower',
    2377: 'Thoradin`s Wall',
    2378: 'Western Strand',
    2379: 'Azurelode Mine',
    2397: 'The Great Sea',
    2398: 'The Great Sea',
    2399: 'The Great Sea',
    2400: 'The Forbidding Sea',
    2401: 'The Forbidding Sea',
    2402: 'The Forbidding Sea',
    2403: 'The Forbidding Sea',
    2404: 'Tethris Aran',
    2405: 'Ethel Rethor',
    2406: 'Ranazjar Isle',
    2407: 'Kormek`s Hut',
    2408: 'Shadowprey Village',
    2417: 'Blackrock Pass',
    2418: 'Morgan`s Vigil',
    2419: 'Slither Rock',
    2420: 'Terror Wing Path',
    2421: 'Draco`dar',
    2437: 'Ragefire Chasm',
    2457: 'Nightsong Woods',
    2477: 'The Veiled Sea',
    2478: 'Morlos`Aran',
    2479: 'Emerald Sanctuary',
    2480: 'Jadefire Glen',
    2481: 'Ruins of Constellas',
    2497: 'Bitter Reaches',
    2517: 'Rise of the Defiler',
    2518: 'Lariss Pavilion',
    2519: 'Woodpaw Hills',
    2520: 'Woodpaw Den',
    2521: 'Verdantis River',
    2522: 'Ruins of Isildien',
    2537: 'Grimtotem Post',
    2538: 'Camp Aparaje',
    2539: 'Malaka`jin',
    2540: 'Boulderslide Ravine',
    2541: 'Sishir Canyon',
    2557: 'Dire Maul',
    2558: 'Deadwind Ravine',
    2559: 'Diamondhead River',
    2560: 'Ariden`s Camp',
    2561: 'The Vice',
    2562: 'Karazhan',
    2563: 'Morgan`s Plot',
    2577: 'Dire Maul',
    2597: 'Alterac Valley',
    2617: 'Scrabblescrew`s Camp',
    2618: 'Jadefire Run',
    2619: 'Thondroril River',
    2620: 'Thondroril River',
    2621: 'Lake Mereldar',
    2622: 'Pestilent Scar',
    2623: 'The Infectis Scar',
    2624: 'Blackwood Lake',
    2625: 'Eastwall Gate',
    2626: 'Terrorweb Tunnel',
    2627: 'Terrordale',
    2637: 'Kargathia Keep',
    2657: 'Valley of Bones',
    2677: 'Blackwing Lair',
    2697: 'Deadman`s Crossing',
    2717: 'Molten Core',
    2737: 'The Scarab Wall',
    2738: 'Southwind Village',
    2739: 'Twilight Base Camp',
    2740: 'The Crystal Vale',
    2741: 'The Scarab Dais',
    2742: 'Hive`Ashi',
    2743: 'Hive`Zora',
    2744: 'Hive`Regal',
    2757: 'Shrine of the Fallen Warrior',
    2777: 'UNUSED Alterac Valley',
    2797: 'Blackfathom Deeps',
    2817: 'Crystalsong Forest',
    2837: 'The Master`s Cellar',
    2838: 'Stonewrought Pass',
    2839: 'Alterac Valley',
    2857: 'The Rumble Cage',
    2877: 'Chunk Test',
    2897: 'Zoram`gar Outpost',
    2917: 'Hall of Legends',
    2918: 'Champions` Hall',
    2937: 'Grosh`gok Compound',
    2938: 'Sleeping Gorge',
    2957: 'Irondeep Mine',
    2958: 'Stonehearth Outpost',
    2959: 'Dun Baldar',
    2960: 'Icewing Pass',
    2961: 'Frostwolf Village',
    2962: 'Tower Point',
    2963: 'Coldtooth Mine',
    2964: 'Winterax Hold',
    2977: 'Iceblood Garrison',
    2978: 'Frostwolf Keep',
    2979: 'Tor`kren Farm',
    3017: 'Frost Dagger Pass',
    3037: 'Ironstone Camp',
    3038: 'Weazel`s Crater',
    3039: 'Tahonda Ruins',
    3057: 'Field of Strife',
    3058: 'Icewing Cavern',
    3077: 'Valor`s Rest',
    3097: 'The Swarming Pillar',
    3098: 'Twilight Post',
    3099: 'Twilight Outpost',
    3100: 'Ravaged Twilight Camp',
    3117: 'Shalzaru`s Lair',
    3137: 'Talrendis Point',
    3138: 'Rethress Sanctum',
    3139: 'Moon Horror Den',
    3140: 'Scalebeard`s Cave',
    3157: 'Boulderslide Cavern',
    3177: 'Warsong Labor Camp',
    3197: 'Chillwind Camp',
    3217: 'The Maul',
    3237: 'The Maul UNUSED',
    3257: 'Bones of Grakkarond',
    3277: 'Warsong Gulch',
    3297: 'Frostwolf Graveyard',
    3298: 'Frostwolf Pass',
    3299: 'Dun Baldar Pass',
    3300: 'Iceblood Graveyard',
    3301: 'Snowfall Graveyard',
    3302: 'Stonehearth Graveyard',
    3303: 'Stormpike Graveyard',
    3304: 'Icewing Bunker',
    3305: 'Stonehearth Bunker',
    3306: 'Wildpaw Ridge',
    3317: 'Revantusk Village',
    3318: 'Rock of Durotan',
    3319: 'Silverwing Grove',
    3320: 'Warsong Lumber Mill',
    3321: 'Silverwing Hold',
    3337: 'Wildpaw Cavern',
    3338: 'The Veiled Cleft',
    3357: 'Yojamba Isle',
    3358: 'Arathi Basin',
    3377: 'The Coil',
    3378: 'Altar of Hir`eek',
    3379: 'Shadra`zaar',
    3380: 'Hakkari Grounds',
    3381: 'Naze of Shirvallah',
    3382: 'Temple of Bethekk',
    3383: 'The Bloodfire Pit',
    3384: 'Altar of the Blood God',
    3397: 'Zanza`s Rise',
    3398: 'Edge of Madness',
    3417: 'Trollbane Hall',
    3418: 'Defiler`s Den',
    3419: 'Pagle`s Pointe',
    3420: 'Farm',
    3421: 'Blacksmith',
    3422: 'Lumber Mill',
    3423: 'Gold Mine',
    3424: 'Stables',
    3425: 'Cenarion Hold',
    3426: 'Staghelm Point',
    3427: 'Bronzebeard Encampment',
    3428: 'Ahn`Qiraj',
    3429: 'Ruins of Ahn`Qiraj',
    3430: 'Eversong Woods',
    3431: 'Sunstrider Isle',
    3432: 'Shrine of Dath`Remar',
    3433: 'Ghostlands',
    3434: 'Scarab Terrace',
    3435: 'General`s Terrace',
    3436: 'The Reservoir',
    3437: 'The Hatchery',
    3438: 'The Comb',
    3439: 'Watchers` Terrace',
    3440: 'Scarab Terrace',
    3441: 'General`s Terrace',
    3442: 'The Reservoir',
    3443: 'The Hatchery',
    3444: 'The Comb',
    3445: 'Watchers` Terrace',
    3446: 'Twilight`s Run',
    3447: 'Ortell`s Hideout',
    3448: 'Scarab Terrace',
    3449: 'General`s Terrace',
    3450: 'The Reservoir',
    3451: 'The Hatchery',
    3452: 'The Comb',
    3453: 'Watchers` Terrace',
    3454: 'Ruins of Ahn`Qiraj',
    3455: 'The North Sea',
    3456: 'Naxxramas',
    3457: 'Karazhan',
    3459: 'City',
    3460: 'Golden Strand',
    3461: 'Sunsail Anchorage',
    3462: 'Fairbreeze Village',
    3463: 'Magisters Gate',
    3464: 'Farstrider Retreat',
    3465: 'North Sanctum',
    3466: 'West Sanctum',
    3467: 'East Sanctum',
    3468: 'Saltheril`s Haven',
    3469: 'Thuron`s Livery',
    3470: 'Stillwhisper Pond',
    3471: 'The Living Wood',
    3472: 'Azurebreeze Coast',
    3473: 'Lake Elrendar',
    3474: 'The Scorched Grove',
    3475: 'Zeb`Watha',
    3476: 'Tor`Watha',
    3477: 'Azjol-Nerub',
    3478: 'Gates of Ahn`Qiraj',
    3479: 'The Veiled Sea',
    3480: 'Duskwither Grounds',
    3481: 'Duskwither Spire',
    3482: 'The Dead Scar',
    3483: 'Hellfire Peninsula',
    3484: 'The Sunspire',
    3485: 'Falthrien Academy',
    3486: 'Ravenholdt Manor',
    3487: 'Silvermoon City',
    3488: 'Tranquillien',
    3489: 'Suncrown Village',
    3490: 'Goldenmist Village',
    3491: 'Windrunner Village',
    3492: 'Windrunner Spire',
    3493: 'Sanctum of the Sun',
    3494: 'Sanctum of the Moon',
    3495: 'Dawnstar Spire',
    3496: 'Farstrider Enclave',
    3497: 'An`daroth',
    3498: 'An`telas',
    3499: 'An`owyn',
    3500: 'Deatholme',
    3501: 'Bleeding Ziggurat',
    3502: 'Howling Ziggurat',
    3503: 'Shalandis Isle',
    3504: 'Toryl Estate',
    3505: 'Underlight Mines',
    3506: 'Andilien Estate',
    3507: 'Hatchet Hills',
    3508: 'Amani Pass',
    3509: 'Sungraze Peak',
    3510: 'Amani Catacombs',
    3511: 'Tower of the Damned',
    3512: 'Zeb`Sora',
    3513: 'Lake Elrendar',
    3514: 'The Dead Scar',
    3515: 'Elrendar River',
    3516: 'Zeb`Tela',
    3517: 'Zeb`Nowa',
    3518: 'Nagrand',
    3519: 'Terokkar Forest',
    3520: 'Shadowmoon Valley',
    3521: 'Zangarmarsh',
    3522: 'Blade`s Edge Mountains',
    3523: 'Netherstorm',
    3524: 'Azuremyst Isle',
    3525: 'Bloodmyst Isle',
    3526: 'Ammen Vale',
    3527: 'Crash Site',
    3528: 'Silverline Lake',
    3529: 'Nestlewood Thicket',
    3530: 'Shadow Ridge',
    3531: 'Skulking Row',
    3532: 'Dawning Lane',
    3533: 'Ruins of Silvermoon',
    3534: 'Feth`s Way',
    3535: 'Hellfire Citadel',
    3536: 'Thrallmar',
    3537: 'Borean Tundra',
    3538: 'Honor Hold',
    3539: 'The Stair of Destiny',
    3540: 'Twisting Nether',
    3541: 'Forge Camp: Mageddon',
    3542: 'The Path of Glory',
    3543: 'The Great Fissure',
    3544: 'Plain of Shards',
    3545: 'Hellfire Citadel',
    3546: 'Expedition Armory',
    3547: 'Throne of Kil`jaeden',
    3548: 'Forge Camp: Rage',
    3549: 'Invasion Point: Annihilator',
    3550: 'Borune Ruins',
    3551: 'Ruins of Sha`naar',
    3552: 'Temple of Telhamat',
    3553: 'Pools of Aggonar',
    3554: 'Falcon Watch',
    3555: 'Mag`har Post',
    3556: 'Den of Haal`esh',
    3557: 'The Exodar',
    3558: 'Elrendar Falls',
    3559: 'Nestlewood Hills',
    3560: 'Ammen Fields',
    3561: 'The Sacred Grove',
    3562: 'Hellfire Ramparts',
    3563: 'Hellfire Citadel',
    3564: 'Emberglade',
    3565: 'Cenarion Refuge',
    3566: 'Moonwing Den',
    3567: 'Pod Cluster',
    3568: 'Pod Wreckage',
    3569: 'Tides` Hollow',
    3570: 'Wrathscale Point',
    3571: 'Bristlelimb Village',
    3572: 'Stillpine Hold',
    3573: 'Odesyus` Landing',
    3574: 'Valaar`s Berth',
    3575: 'Silting Shore',
    3576: 'Azure Watch',
    3577: 'Geezle`s Camp',
    3578: 'Menagerie Wreckage',
    3579: 'Traitor`s Cove',
    3580: 'Wildwind Peak',
    3581: 'Wildwind Path',
    3582: 'Zeth`Gor',
    3583: 'Beryl Coast',
    3584: 'Blood Watch',
    3585: 'Bladewood',
    3586: 'The Vector Coil',
    3587: 'The Warp Piston',
    3588: 'The Cryo-Core',
    3589: 'The Crimson Reach',
    3590: 'Wrathscale Lair',
    3591: 'Ruins of Loreth`Aran',
    3592: 'Nazzivian',
    3593: 'Axxarien',
    3594: 'Blacksilt Shore',
    3595: 'The Foul Pool',
    3596: 'The Hidden Reef',
    3597: 'Amberweb Pass',
    3598: 'Wyrmscar Island',
    3599: 'Talon Stand',
    3600: 'Bristlelimb Enclave',
    3601: 'Ragefeather Ridge',
    3602: 'Kessel`s Crossing',
    3603: 'Tel`athion`s Camp',
    3604: 'The Bloodcursed Reef',
    3605: 'Hyjal Past',
    3606: 'Hyjal Summit',
    3607: 'Serpentshrine Cavern',
    3608: 'Vindicator`s Rest',
    3609: 'Unused3',
    3610: 'Burning Blade Ruins',
    3611: 'Clan Watch',
    3612: 'Bloodcurse Isle',
    3613: 'Garadar',
    3614: 'Skysong Lake',
    3615: 'Throne of the Elements',
    3616: 'Laughing Skull Ruins',
    3617: 'Warmaul Hill',
    3618: 'Gruul`s Lair',
    3619: 'Auren Ridge',
    3620: 'Auren Falls',
    3621: 'Lake Sunspring',
    3622: 'Sunspring Post',
    3623: 'Aeris Landing',
    3624: 'Forge Camp: Fear',
    3625: 'Forge Camp: Hate',
    3626: 'Telaar',
    3627: 'Northwind Cleft',
    3628: 'Halaa',
    3629: 'Southwind Cleft',
    3630: 'Oshu`gun',
    3631: 'Spirit Fields',
    3632: 'Shamanar',
    3633: 'Ancestral Grounds',
    3634: 'Windyreed Village',
    3635: 'Unused2',
    3636: 'Elemental Plateau',
    3637: 'Kil`sorrow Fortress',
    3638: 'The Ring of Trials',
    3639: 'Silvermyst Isle',
    3640: 'Daggerfen Village',
    3641: 'Umbrafen Village',
    3642: 'Feralfen Village',
    3643: 'Bloodscale Enclave',
    3644: 'Telredor',
    3645: 'Zabra`jin',
    3646: 'Quagg Ridge',
    3647: 'The Spawning Glen',
    3648: 'The Dead Mire',
    3649: 'Sporeggar',
    3650: 'Ango`rosh Grounds',
    3651: 'Ango`rosh Stronghold',
    3652: 'Funggor Cavern',
    3653: 'Serpent Lake',
    3654: 'The Drain',
    3655: 'Umbrafen Lake',
    3656: 'Marshlight Lake',
    3657: 'Portal Clearing',
    3658: 'Sporewind Lake',
    3659: 'The Lagoon',
    3660: 'Blades` Run',
    3661: 'Blade Tooth Canyon',
    3662: 'Commons Hall',
    3663: 'Derelict Manor',
    3664: 'Huntress of the Sun',
    3665: 'Falconwing Square',
    3666: 'Halaani Basin',
    3667: 'Hewn Bog',
    3668: 'Boha`mu Ruins',
    3669: 'The Stadium',
    3670: 'The Overlook',
    3671: 'Broken Hill',
    3672: 'Mag`hari Procession',
    3673: 'Nesingwary Safari',
    3674: 'Cenarion Thicket',
    3675: 'Tuurem',
    3676: 'Veil Shienor',
    3677: 'Veil Skith',
    3678: 'Veil Shalas',
    3679: 'Skettis',
    3680: 'Blackwind Valley',
    3681: 'Firewing Point',
    3682: 'Grangol`var Village',
    3683: 'Stonebreaker Hold',
    3684: 'Allerian Stronghold',
    3685: 'Bonechewer Ruins',
    3686: 'Veil Lithic',
    3687: 'Olembas',
    3688: 'Auchindoun',
    3689: 'Veil Reskk',
    3690: 'Blackwind Lake',
    3691: 'Lake Ere`Noru',
    3692: 'Lake Jorune',
    3693: 'Skethyl Mountains',
    3694: 'Misty Ridge',
    3695: 'The Broken Hills',
    3696: 'The Barrier Hills',
    3697: 'The Bone Wastes',
    3698: 'Nagrand Arena',
    3699: 'Laughing Skull Courtyard',
    3700: 'The Ring of Blood',
    3701: 'Arena Floor',
    3702: 'Blade`s Edge Arena',
    3703: 'Shattrath City',
    3704: 'The Shepherd`s Gate',
    3705: 'Telaari Basin',
    3706: 'The Dark Portal',
    3707: 'Alliance Base',
    3708: 'Horde Encampment',
    3709: 'Night Elf Village',
    3710: 'Nordrassil',
    3711: 'Sholazar Basin',
    3712: 'Area 52',
    3713: 'The Blood Furnace',
    3714: 'The Shattered Halls',
    3715: 'The Steamvault',
    3716: 'The Underbog',
    3717: 'The Slave Pens',
    3718: 'Swamprat Post',
    3719: 'Bleeding Hollow Ruins',
    3720: 'Twin Spire Ruins',
    3721: 'The Crumbling Waste',
    3722: 'Manaforge Ara',
    3723: 'Arklon Ruins',
    3724: 'Cosmowrench',
    3725: 'Ruins of Enkaat',
    3726: 'Manaforge B`naar',
    3727: 'The Scrap Field',
    3728: 'The Vortex Fields',
    3729: 'The Heap',
    3730: 'Manaforge Coruu',
    3731: 'The Tempest Rift',
    3732: 'Kirin`Var Village',
    3733: 'The Violet Tower',
    3734: 'Manaforge Duro',
    3735: 'Voidwind Plateau',
    3736: 'Manaforge Ultris',
    3737: 'Celestial Ridge',
    3738: 'The Stormspire',
    3739: 'Forge Base: Oblivion',
    3740: 'Forge Base: Gehenna',
    3741: 'Ruins of Farahlon',
    3742: 'Socrethar`s Seat',
    3743: 'Legion Hold',
    3744: 'Shadowmoon Village',
    3745: 'Wildhammer Stronghold',
    3746: 'The Hand of Gul`dan',
    3747: 'The Fel Pits',
    3748: 'The Deathforge',
    3749: 'Coilskar Cistern',
    3750: 'Coilskar Point',
    3751: 'Sunfire Point',
    3752: 'Illidari Point',
    3753: 'Ruins of Baa`ri',
    3754: 'Altar of Sha`tar',
    3755: 'The Stair of Doom',
    3756: 'Ruins of Karabor',
    3757: 'Ata`mal Terrace',
    3758: 'Netherwing Fields',
    3759: 'Netherwing Ledge',
    3760: 'The Barrier Hills',
    3761: 'The High Path',
    3762: 'Windyreed Pass',
    3763: 'Zangar Ridge',
    3764: 'The Twilight Ridge',
    3765: 'Razorthorn Trail',
    3766: 'Orebor Harborage',
    3767: 'Blades` Run',
    3768: 'Jagged Ridge',
    3769: 'Thunderlord Stronghold',
    3770: 'Blade Tooth Canyon',
    3771: 'The Living Grove',
    3772: 'Sylvanaar',
    3773: 'Bladespire Hold',
    3774: 'Gruul`s Lair',
    3775: 'Circle of Blood',
    3776: 'Bloodmaul Outpost',
    3777: 'Bloodmaul Camp',
    3778: 'Draenethyst Mine',
    3779: 'Trogma`s Claim',
    3780: 'Blackwing Coven',
    3781: 'Grishnath',
    3782: 'Veil Lashh',
    3783: 'Veil Vekh',
    3784: 'Forge Camp: Terror',
    3785: 'Forge Camp: Wrath',
    3786: 'Ogri`la',
    3787: 'Forge Camp: Anger',
    3788: 'The Low Path',
    3789: 'Shadow Labyrinth',
    3790: 'Auchenai Crypts',
    3791: 'Sethekk Halls',
    3792: 'Mana-Tombs',
    3793: 'Felspark Ravine',
    3794: 'Valley of Bones',
    3795: 'Sha`naari Wastes',
    3796: 'The Warp Fields',
    3797: 'Fallen Sky Ridge',
    3798: 'Haal`eshi Gorge',
    3799: 'Stonewall Canyon',
    3800: 'Thornfang Hill',
    3801: 'Mag`har Grounds',
    3802: 'Void Ridge',
    3803: 'The Abyssal Shelf',
    3804: 'The Legion Front',
    3805: 'Zul`Aman',
    3806: 'Supply Caravan',
    3807: 'Reaver`s Fall',
    3808: 'Cenarion Post',
    3809: 'Southern Rampart',
    3810: 'Northern Rampart',
    3811: 'Gor`gaz Outpost',
    3812: 'Spinebreaker Post',
    3813: 'The Path of Anguish',
    3814: 'East Supply Caravan',
    3815: 'Expedition Point',
    3816: 'Zeppelin Crash',
    3817: 'Testing',
    3818: 'Bloodscale Grounds',
    3819: 'Darkcrest Enclave',
    3820: 'Eye of the Storm',
    3821: 'Warden`s Cage',
    3822: 'Eclipse Point',
    3823: 'Isle of Tribulations',
    3824: 'Bloodmaul Ravine',
    3825: 'Dragons` End',
    3826: 'Daggermaw Canyon',
    3827: 'Vekhaar Stand',
    3828: 'Ruuan Weald',
    3829: 'Veil Ruuan',
    3830: 'Raven`s Wood',
    3831: 'Death`s Door',
    3832: 'Vortex Pinnacle',
    3833: 'Razor Ridge',
    3834: 'Ridge of Madness',
    3835: 'Dustquill Ravine',
    3836: 'Magtheridon`s Lair',
    3837: 'Sunfury Hold',
    3838: 'Spinebreaker Mountains',
    3839: 'Abandoned Armory',
    3840: 'The Black Temple',
    3841: 'Darkcrest Shore',
    3842: 'Tempest Keep',
    3844: 'Mok`Nathal Village',
    3845: 'Tempest Keep',
    3846: 'The Arcatraz',
    3847: 'The Botanica',
    3848: 'The Arcatraz',
    3849: 'The Mechanar',
    3850: 'Netherstone',
    3851: 'Midrealm Post',
    3852: 'Tuluman`s Landing',
    3854: 'Protectorate Watch Post',
    3855: 'Circle of Blood Arena',
    3856: 'Elrendar Crossing',
    3857: 'Ammen Ford',
    3858: 'Razorthorn Shelf',
    3859: 'Silmyr Lake',
    3860: 'Raastok Glade',
    3861: 'Thalassian Pass',
    3862: 'Churning Gulch',
    3863: 'Broken Wilds',
    3864: 'Bash`ir Landing',
    3865: 'Crystal Spine',
    3866: 'Skald',
    3867: 'Bladed Gulch',
    3868: 'Gyro-Plank Bridge',
    3869: 'Mage Tower',
    3870: 'Blood Elf Tower',
    3871: 'Draenei Ruins',
    3872: 'Fel Reaver Ruins',
    3873: 'The Proving Grounds',
    3874: 'Eco-Dome Farfield',
    3875: 'Eco-Dome Skyperch',
    3876: 'Eco-Dome Sutheron',
    3877: 'Eco-Dome Midrealm',
    3878: 'Ethereum Staging Grounds',
    3879: 'Chapel Yard',
    3880: 'Access Shaft Zeon',
    3881: 'Trelleum Mine',
    3882: 'Invasion Point: Destroyer',
    3883: 'Camp of Boom',
    3884: 'Spinebreaker Pass',
    3885: 'Netherweb Ridge',
    3886: 'Derelict Caravan',
    3887: 'Refugee Caravan',
    3888: 'Shadow Tomb',
    3889: 'Veil Rhaze',
    3890: 'Tomb of Lights',
    3891: 'Carrion Hill',
    3892: 'Writhing Mound',
    3893: 'Ring of Observance',
    3894: 'Auchenai Grounds',
    3895: 'Cenarion Watchpost',
    3896: 'Aldor Rise',
    3897: 'Terrace of Light',
    3898: 'Scryer`s Tier',
    3899: 'Lower City',
    3900: 'Invasion Point: Overlord',
    3901: 'Allerian Post',
    3902: 'Stonebreaker Camp',
    3903: 'Boulder`mok',
    3904: 'Cursed Hollow',
    3905: 'Coilfang Reservoir',
    3906: 'The Bloodwash',
    3907: 'Veridian Point',
    3908: 'Middenvale',
    3909: 'The Lost Fold',
    3910: 'Mystwood',
    3911: 'Tranquil Shore',
    3912: 'Goldenbough Pass',
    3913: 'Runestone Falithas',
    3914: 'Runestone Shan`dor',
    3915: 'Fairbridge Strand',
    3916: 'Moongraze Woods',
    3917: 'Auchindoun',
    3918: 'Toshley`s Station',
    3919: 'Singing Ridge',
    3920: 'Shatter Point',
    3921: 'Arklonis Ridge',
    3922: 'Bladespire Outpost',
    3923: 'Gruul`s Lair',
    3924: 'Northmaul Tower',
    3925: 'Southmaul Tower',
    3926: 'Shattered Plains',
    3927: 'Oronok`s Farm',
    3928: 'The Altar of Damnation',
    3929: 'The Path of Conquest',
    3930: 'Eclipsion Fields',
    3931: 'Bladespire Grounds',
    3932: 'Sketh`lon Base Camp',
    3933: 'Sketh`lon Wreckage',
    3934: 'Town Square',
    3935: 'Wizard Row',
    3936: 'Deathforge Tower',
    3937: 'Slag Watch',
    3938: 'Sanctum of the Stars',
    3939: 'Dragonmaw Fortress',
    3940: 'The Fetid Pool',
    3941: 'Test',
    3942: 'Razaan`s Landing',
    3943: 'Invasion Point: Cataclysm',
    3944: 'The Altar of Shadows',
    3945: 'Netherwing Pass',
    3946: 'Wayne`s Refuge',
    3947: 'The Scalding Pools',
    3948: 'Brian and Pat Test',
    3949: 'Magma Fields',
    3950: 'Crimson Watch',
    3951: 'Evergrove',
    3952: 'Wyrmskull Bridge',
    3953: 'Scalewing Shelf',
    3954: 'Wyrmskull Tunnel',
    3955: 'Hellfire Basin',
    3956: 'The Shadow Stair',
    3957: 'Sha`tari Outpost',
    3958: 'Sha`tari Base Camp',
    3959: 'Black Temple',
    3960: 'Soulgrinder`s Barrow',
    3961: 'Sorrow Wing Point',
    3962: 'Vim`gol`s Circle',
    3963: 'Dragonspine Ridge',
    3964: 'Skyguard Outpost',
    3965: 'Netherwing Mines',
    3966: 'Dragonmaw Base Camp',
    3967: 'Dragonmaw Skyway',
    3968: 'Ruins of Lordaeron',
    3969: 'Rivendark`s Perch',
    3970: 'Obsidia`s Perch',
    3971: 'Insidion`s Perch',
    3972: 'Furywing`s Perch',
    3973: 'Blackwind Landing',
    3974: 'Veil Harr`ik',
    3975: 'Terokk`s Rest',
    3976: 'Veil Ala`rak',
    3977: 'Upper Veil Shil`ak',
    3978: 'Lower Veil Shil`ak',
    3979: 'The Frozen Sea',
    3980: 'Daggercap Bay',
    3981: 'Valgarde',
    3982: 'Wyrmskull Village',
    3983: 'Utgarde Keep',
    3984: 'Nifflevar',
    3985: 'Falls of Ymiron',
    3986: 'Echo Reach',
    3987: 'The Isle of Spears',
    3988: 'Kamagua',
    3989: 'Garvan`s Reef',
    3990: 'Scalawag Point',
    3991: 'New Agamand',
    3992: 'The Ancient Lift',
    3993: 'Westguard Turret',
    3994: 'Halgrind',
    3995: 'The Laughing Stand',
    3996: 'Baelgun`s Excavation Site',
    3997: 'Explorers` League Outpost',
    3998: 'Westguard Keep',
    3999: 'Steel Gate',
    4000: 'Vengeance Landing',
    4001: 'Baleheim',
    4002: 'Skorn',
    4003: 'Fort Wildervar',
    4004: 'Vileprey Village',
    4005: 'Ivald`s Ruin',
    4006: 'Gjalerbron',
    4007: 'Tomb of the Lost Kings',
    4008: 'Shartuul`s Transporter',
    4009: 'Illidari Training Grounds',
    4010: 'Mudsprocket',
    4018: 'Camp Winterhoof',
    4019: 'Development Land',
    4020: 'Mightstone Quarry',
    4021: 'Bloodspore Plains',
    4022: 'Gammoth',
    4023: 'Amber Ledge',
    4024: 'Coldarra',
    4025: 'The Westrift',
    4026: 'The Transitus Stair',
    4027: 'Coast of Echoes',
    4028: 'Riplash Strand',
    4029: 'Riplash Ruins',
    4030: 'Coast of Idols',
    4031: 'Pal`ea',
    4032: 'Valiance Keep',
    4033: 'Winterfin Village',
    4034: 'The Borean Wall',
    4035: 'The Geyser Fields',
    4036: 'Fizzcrank Pumping Station',
    4037: 'Taunka`le Village',
    4038: 'Magnamoth Caverns',
    4039: 'Coldrock Quarry',
    4040: 'Njord`s Breath Bay',
    4041: 'Kaskala',
    4042: 'Transborea',
    4043: 'The Flood Plains',
    4046: 'Direhorn Post',
    4047: 'Nat`s Landing',
    4048: 'Ember Clutch',
    4049: 'Tabetha`s Farm',
    4050: 'Derelict Strand',
    4051: 'The Frozen Glade',
    4052: 'The Vibrant Glade',
    4053: 'The Twisted Glade',
    4054: 'Rivenwood',
    4055: 'Caldemere Lake',
    4056: 'Utgarde Catacombs',
    4057: 'Shield Hill',
    4058: 'Lake Cauldros',
    4059: 'Cauldros Isle',
    4060: 'Bleeding Vale',
    4061: 'Giants` Run',
    4062: 'Apothecary Camp',
    4063: 'Ember Spear Tower',
    4064: 'Shattered Straits',
    4065: 'Gjalerhorn',
    4066: 'Frostblade Peak',
    4067: 'Plaguewood Tower',
    4068: 'West Spear Tower',
    4069: 'North Spear Tower',
    4070: 'Chillmere Coast',
    4071: 'Whisper Gulch',
    4072: 'Sub zone',
    4073: 'Winter`s Terrace',
    4074: 'The Waking Halls',
    4075: 'Sunwell Plateau',
    4076: 'Reuse Me 7',
    4077: 'Sorlof`s Strand',
    4078: 'Razorthorn Rise',
    4079: 'Frostblade Pass',
    4080: 'Isle of Quel`Danas',
    4081: 'The Dawnchaser',
    4082: 'The Sin`loren',
    4083: 'Silvermoon`s Pride',
    4084: 'The Bloodoath',
    4085: 'Shattered Sun Staging Area',
    4086: 'Sun`s Reach Sanctum',
    4087: 'Sun`s Reach Harbor',
    4088: 'Sun`s Reach Armory',
    4089: 'Dawnstar Village',
    4090: 'The Dawning Square',
    4091: 'Greengill Coast',
    4092: 'The Dead Scar',
    4093: 'The Sun Forge',
    4094: 'Sunwell Plateau',
    4095: 'Magisters` Terrace',
    4096: 'Claytön`s WoWEdit Land',
    4097: 'Winterfin Caverns',
    4098: 'Glimmer Bay',
    4099: 'Winterfin Retreat',
    4100: 'The Culling of Stratholme',
    4101: 'Sands of Nasam',
    4102: 'Krom`s Landing',
    4103: 'Nasam`s Talon',
    4104: 'Echo Cove',
    4105: 'Beryl Point',
    4106: 'Garrosh`s Landing',
    4107: 'Warsong Jetty',
    4108: 'Fizzcrank Airstrip',
    4109: 'Lake Kum`uya',
    4110: 'Farshire Fields',
    4111: 'Farshire',
    4112: 'Farshire Lighthouse',
    4113: 'Unu`pe',
    4114: 'Death`s Stand',
    4115: 'The Abandoned Reach',
    4116: 'Scalding Pools',
    4117: 'Steam Springs',
    4118: 'Talramas',
    4119: 'Festering Pools',
    4120: 'The Nexus',
    4121: 'Transitus Shield',
    4122: 'Bor`gorok Outpost',
    4123: 'Magmoth',
    4124: 'The Dens of Dying',
    4125: 'Temple City of En`kilah',
    4126: 'The Wailing Ziggurat',
    4127: 'Steeljaw`s Caravan',
    4128: 'Naxxanar',
    4129: 'Warsong Hold',
    4130: 'Plains of Nasam',
    4131: 'Magisters` Terrace',
    4132: 'Ruins of Eldra`nath',
    4133: 'Charred Rise',
    4134: 'Blistering Pool',
    4135: 'Spire of Blood',
    4136: 'Spire of Decay',
    4137: 'Spire of Pain',
    4138: 'Frozen Reach',
    4139: 'Parhelion Plaza',
    4140: 'The Dead Scar',
    4141: 'Torp`s Farm',
    4142: 'Warsong Granary',
    4143: 'Warsong Slaughterhouse',
    4144: 'Warsong Farms Outpost',
    4145: 'West Point Station',
    4146: 'North Point Station',
    4147: 'Mid Point Station',
    4148: 'South Point Station',
    4149: 'D.E.H.T.A. Encampment',
    4150: 'Kaw`s Roost',
    4151: 'Westwind Refugee Camp',
    4152: 'Moa`ki Harbor',
    4153: 'Indu`le Village',
    4154: 'Snowfall Glade',
    4155: 'The Half Shell',
    4156: 'Surge Needle',
    4157: 'Moonrest Gardens',
    4158: 'Stars` Rest',
    4159: 'Westfall Brigade Encampment',
    4160: 'Lothalor Woodlands',
    4161: 'Wyrmrest Temple',
    4162: 'Icemist Falls',
    4163: 'Icemist Village',
    4164: 'The Pit of Narjun',
    4165: 'Agmar`s Hammer',
    4166: 'Lake Indu`le',
    4167: 'Obsidian Dragonshrine',
    4168: 'Ruby Dragonshrine',
    4169: 'Fordragon Hold',
    4170: 'Kor`kron Vanguard',
    4171: 'The Court of Skulls',
    4172: 'Angrathar the Wrathgate',
    4173: 'Galakrond`s Rest',
    4174: 'The Wicked Coil',
    4175: 'Bronze Dragonshrine',
    4176: 'The Mirror of Dawn',
    4177: 'Wintergarde Keep',
    4178: 'Wintergarde Mine',
    4179: 'Emerald Dragonshrine',
    4180: 'New Hearthglen',
    4181: 'Crusader`s Landing',
    4182: 'Sinner`s Folly',
    4183: 'Azure Dragonshrine',
    4184: 'Path of the Titans',
    4185: 'The Forgotten Shore',
    4186: 'Venomspite',
    4187: 'The Crystal Vice',
    4188: 'The Carrion Fields',
    4189: 'Onslaught Base Camp',
    4190: 'Thorson`s Post',
    4191: 'Light`s Trust',
    4192: 'Frostmourne Cavern',
    4193: 'Scarlet Point',
    4194: 'Jintha`kalar',
    4195: 'Ice Heart Cavern',
    4196: 'Drak`Tharon Keep',
    4197: 'Wintergrasp',
    4198: 'Kili`ua`s Atoll',
    4199: 'Silverbrook',
    4200: 'Vordrassil`s Heart',
    4201: 'Vordrassil`s Tears',
    4202: 'Vordrassil`s Tears',
    4203: 'Vordrassil`s Limb',
    4204: 'Amberpine Lodge',
    4205: 'Solstice Village',
    4206: 'Conquest Hold',
    4207: 'Voldrune',
    4208: 'Granite Springs',
    4209: 'Zeb`Halak',
    4210: 'Drak`Tharon Keep',
    4211: 'Camp Oneqwah',
    4212: 'Eastwind Shore',
    4213: 'The Broken Bluffs',
    4214: 'Boulder Hills',
    4215: 'Rage Fang Shrine',
    4216: 'Drakil`jin Ruins',
    4217: 'Blackriver Logging Camp',
    4218: 'Heart`s Blood Shrine',
    4219: 'Hollowstone Mine',
    4220: 'Dun Argol',
    4221: 'Thor Modan',
    4222: 'Blue Sky Logging Grounds',
    4223: 'Maw of Neltharion',
    4224: 'The Briny Pinnacle',
    4225: 'Glittering Strand',
    4226: 'Iskaal',
    4227: 'Dragon`s Fall',
    4228: 'The Oculus',
    4229: 'Prospector`s Point',
    4230: 'Coldwind Heights',
    4231: 'Redwood Trading Post',
    4232: 'Vengeance Pass',
    4233: 'Dawn`s Reach',
    4234: 'Naxxramas',
    4235: 'Heartwood Trading Post',
    4236: 'Evergreen Trading Post',
    4237: 'Spruce Point Post',
    4238: 'White Pine Trading Post',
    4239: 'Aspen Grove Post',
    4240: 'Forest`s Edge Post',
    4241: 'Eldritch Heights',
    4242: 'Venture Bay',
    4243: 'Wintergarde Crypt',
    4244: 'Bloodmoon Isle',
    4245: 'Shadowfang Tower',
    4246: 'Wintergarde Mausoleum',
    4247: 'Duskhowl Den',
    4248: 'The Conquest Pit',
    4249: 'The Path of Iron',
    4250: 'Ruins of Tethys',
    4251: 'Silverbrook Hills',
    4252: 'The Broken Bluffs',
    4253: '7th Legion Front',
    4254: 'The Dragon Wastes',
    4255: 'Ruins of Drak`Zin',
    4256: 'Drak`Mar Lake',
    4257: 'Dragonspine Tributary',
    4258: 'The North Sea',
    4259: 'Drak`ural',
    4260: 'Thorvald`s Camp',
    4261: 'Ghostblade Post',
    4262: 'Ashwood Post',
    4263: 'Lydell`s Ambush',
    4264: 'Halls of Stone',
    4265: 'The Nexus',
    4266: 'Harkor`s Camp',
    4267: 'Vordrassil Pass',
    4268: 'Ruuna`s Camp',
    4269: 'Shrine of Scales',
    4270: 'Drak`atal Passage',
    4271: 'Utgarde Pinnacle',
    4272: 'Halls of Lightning',
    4273: 'Ulduar',
    4275: 'The Argent Stand',
    4276: 'Altar of Sseratus',
    4277: 'Azjol-Nerub',
    4278: 'Drak`Sotra Fields',
    4279: 'Drak`Sotra',
    4280: 'Drak`Agal',
    4281: 'Acherus: The Ebon Hold',
    4282: 'The Avalanche',
    4283: 'The Lost Lands',
    4284: 'Nesingwary Base Camp',
    4285: 'The Seabreach Flow',
    4286: 'The Bones of Nozronn',
    4287: 'Kartak`s Hold',
    4288: 'Sparktouched Haven',
    4289: 'The Path of the Lifewarden',
    4290: 'River`s Heart',
    4291: 'Rainspeaker Canopy',
    4292: 'Frenzyheart Hill',
    4293: 'Wildgrowth Mangal',
    4294: 'Heb`Valok',
    4295: 'The Sundered Shard',
    4296: 'The Lifeblood Pillar',
    4297: 'Mosswalker Village',
    4298: 'Plaguelands: The Scarlet Enclave',
    4299: 'Kolramas',
    4300: 'Waygate',
    4302: 'The Skyreach Pillar',
    4303: 'Hardknuckle Clearing',
    4304: 'Sapphire Hive',
    4306: 'Mistwhisper Refuge',
    4307: 'The Glimmering Pillar',
    4308: 'Spearborn Encampment',
    4309: 'Drak`Tharon Keep',
    4310: 'Zeramas',
    4311: 'Reliquary of Agony',
    4312: 'Ebon Watch',
    4313: 'Thrym`s End',
    4314: 'Voltarus',
    4315: 'Reliquary of Pain',
    4316: 'Rageclaw Den',
    4317: 'Light`s Breach',
    4318: 'Pools of Zha`Jin',
    4319: 'Zim`Abwa',
    4320: 'Amphitheater of Anguish',
    4321: 'Altar of Rhunok',
    4322: 'Altar of Har`koa',
    4323: 'Zim`Torga',
    4324: 'Pools of Jin`Alai',
    4325: 'Altar of Quetz`lun',
    4326: 'Heb`Drakkar',
    4327: 'Drak`Mabwa',
    4328: 'Zim`Rhuk',
    4329: 'Altar of Mam`toth',
    4342: 'Acherus: The Ebon Hold',
    4343: 'New Avalon',
    4344: 'New Avalon Fields',
    4345: 'New Avalon Orchard',
    4346: 'New Avalon Town Hall',
    4347: 'Havenshire',
    4348: 'Havenshire Farms',
    4349: 'Havenshire Lumber Mill',
    4350: 'Havenshire Stables',
    4351: 'Scarlet Hold',
    4352: 'Chapel of the Crimson Flame',
    4353: 'Light`s Point Tower',
    4354: 'Light`s Point',
    4355: 'Crypt of Remembrance',
    4356: 'Death`s Breach',
    4357: 'The Noxious Glade',
    4358: 'Tyr`s Hand',
    4359: 'King`s Harbor',
    4360: 'Scarlet Overlook',
    4361: 'Light`s Hope Chapel',
    4362: 'Sinner`s Folly',
    4363: 'Pestilent Scar',
    4364: 'Browman Mill',
    4365: 'Havenshire Mine',
    4366: 'Ursoc`s Den',
    4367: 'The Blight Line',
    4368: 'The Bonefields',
    4369: 'Dorian`s Outpost',
    4371: 'Mam`toth Crater',
    4372: 'Zol`Maz Stronghold',
    4373: 'Zol`Heb',
    4374: 'Rageclaw Lake',
    4375: 'Gundrak',
    4376: 'The Savage Thicket',
    4377: 'New Avalon Forge',
    4378: 'Dalaran Arena',
    4379: 'Valgarde',
    4380: 'Westguard Inn',
    4381: 'Waygate',
    4382: 'The Shaper`s Terrace',
    4383: 'Lakeside Landing',
    4384: 'Strand of the Ancients',
    4385: 'Bittertide Lake',
    4386: 'Rainspeaker Rapids',
    4387: 'Frenzyheart River',
    4388: 'Wintergrasp River',
    4389: 'The Suntouched Pillar',
    4390: 'Frigid Breach',
    4391: 'Swindlegrin`s Dig',
    4392: 'The Stormwright`s Shelf',
    4393: 'Death`s Hand Encampment',
    4394: 'Scarlet Tavern',
    4395: 'Dalaran',
    4396: 'Nozzlerust Post',
    4399: 'Farshire Mine',
    4400: 'The Mosslight Pillar',
    4401: 'Saragosa`s Landing',
    4402: 'Vengeance Lift',
    4403: 'Balejar Watch',
    4404: 'New Agamand Inn',
    4405: 'Passage of Lost Fiends',
    4406: 'The Ring of Valor',
    4407: 'Hall of the Frostwolf',
    4408: 'Hall of the Stormpike',
    4411: 'Stormwind Harbor',
    4412: 'The Makers` Overlook',
    4413: 'The Makers` Perch',
    4414: 'Scarlet Tower',
    4415: 'The Violet Hold',
    4416: 'Gundrak',
    4417: 'Onslaught Harbor',
    4418: 'K3',
    4419: 'Snowblind Hills',
    4420: 'Snowblind Terrace',
    4421: 'Garm',
    4422: 'Brunnhildar Village',
    4423: 'Sifreldar Village',
    4424: 'Valkyrion',
    4425: 'The Forlorn Mine',
    4426: 'Bor`s Breath River',
    4427: 'Argent Vanguard',
    4428: 'Frosthold',
    4429: 'Grom`arsh Crash-Site',
    4430: 'Temple of Storms',
    4431: 'Engine of the Makers',
    4432: 'The Foot Steppes',
    4433: 'Dragonspine Peaks',
    4434: 'Nidavelir',
    4435: 'Narvir`s Cradle',
    4436: 'Snowdrift Plains',
    4437: 'Valley of Ancient Winters',
    4438: 'Dun Niffelem',
    4439: 'Frostfield Lake',
    4440: 'Thunderfall',
    4441: 'Camp Tunka`lo',
    4442: 'Brann`s Base-Camp',
    4443: 'Gate of Echoes',
    4444: 'Plain of Echoes',
    4445: 'Ulduar',
    4446: 'Terrace of the Makers',
    4447: 'Gate of Lightning',
    4448: 'Path of the Titans',
    4449: 'Uldis',
    4450: 'Loken`s Bargain',
    4451: 'Bor`s Fall',
    4452: 'Bor`s Breath',
    4453: 'Rohemdal Pass',
    4454: 'The Storm Foundry',
    4455: 'Hibernal Cavern',
    4456: 'Voldrune Dwelling',
    4457: 'Torseg`s Rest',
    4458: 'Sparksocket Minefield',
    4459: 'Ricket`s Folly',
    4460: 'Garm`s Bane',
    4461: 'Garm`s Rise',
    4462: 'Crystalweb Cavern',
    4463: 'Temple of Life',
    4464: 'Temple of Order',
    4465: 'Temple of Winter',
    4466: 'Temple of Invention',
    4467: 'Death`s Rise',
    4468: 'The Dead Fields',
    4469: 'Dargath`s Demise',
    4470: 'The Hidden Hollow',
    4471: 'Bernau`s Happy Fun Land',
    4472: 'Frostgrip`s Hollow',
    4473: 'The Frigid Tomb',
    4474: 'Twin Shores',
    4475: 'Zim`bo`s Hideout',
    4476: 'Abandoned Camp',
    4477: 'The Shadow Vault',
    4478: 'Coldwind Pass',
    4479: 'Winter`s Breath Lake',
    4480: 'The Forgotten Overlook',
    4481: 'Jintha`kalar Passage',
    4482: 'Arriga Footbridge',
    4483: 'The Lost Passage',
    4484: 'Bouldercrag`s Refuge',
    4485: 'The Inventor`s Library',
    4486: 'The Frozen Mine',
    4487: 'Frostfloe Deep',
    4488: 'The Howling Hollow',
    4489: 'Crusader Forward Camp',
    4490: 'Stormcrest',
    4491: 'Bonesnap`s Camp',
    4492: 'Ufrang`s Hall',
    4493: 'The Obsidian Sanctum',
    4494: 'Ahn`kahet: The Old Kingdom',
    4495: 'Fjorn`s Anvil',
    4496: 'Jotunheim',
    4497: 'Savage Ledge',
    4498: 'Halls of the Ancestors',
    4499: 'The Blighted Pool',
    4500: 'The Eye of Eternity',
    4501: 'The Argent Vanguard',
    4502: 'Mimir`s Workshop',
    4503: 'Ironwall Dam',
    4504: 'Valley of Echoes',
    4505: 'The Breach',
    4506: 'Scourgeholme',
    4507: 'The Broken Front',
    4508: 'Mord`rethar: The Death Gate',
    4509: 'The Bombardment',
    4510: 'Aldur`thar: The Desolation Gate',
    4511: 'The Skybreaker',
    4512: 'Orgrim`s Hammer',
    4513: 'Ymirheim',
    4514: 'Saronite Mines',
    4515: 'The Conflagration',
    4516: 'Ironwall Rampart',
    4517: 'Weeping Quarry',
    4518: 'Corp`rethar: The Horror Gate',
    4519: 'The Court of Bones',
    4520: 'Malykriss: The Vile Hold',
    4521: 'Cathedral of Darkness',
    4522: 'Icecrown Citadel',
    4523: 'Icecrown Glacier',
    4524: 'Valhalas',
    4525: 'The Underhalls',
    4526: 'Njorndar Village',
    4527: 'Balargarde Fortress',
    4528: 'Kul`galar Keep',
    4529: 'The Crimson Cathedral',
    4530: 'Sanctum of Reanimation',
    4531: 'The Fleshwerks',
    4532: 'Vengeance Landing Inn',
    4533: 'Sindragosa`s Fall',
    4534: 'Wildervar Mine',
    4535: 'The Pit of the Fang',
    4536: 'Frosthowl Cavern',
    4537: 'The Valley of Lost Hope',
    4538: 'The Sunken Ring',
    4539: 'The Broken Temple',
    4540: 'The Valley of Fallen Heroes',
    4541: 'Vanguard Infirmary',
    4542: 'Hall of the Shaper',
    4543: 'Temple of Wisdom',
    4544: 'Death`s Breach',
    4545: 'Abandoned Mine',
    4546: 'Ruins of the Scarlet Enclave',
    4547: 'Halls of Stone',
    4548: 'Halls of Lightning',
    4549: 'The Great Tree',
    4550: 'The Mirror of Twilight',
    4551: 'The Twilight Rivulet',
    4552: 'The Decrepit Flow',
    4553: 'Forlorn Woods',
    4554: 'Ruins of Shandaral',
    4555: 'The Azure Front',
    4556: 'Violet Stand',
    4557: 'The Unbound Thicket',
    4558: 'Sunreaver`s Command',
    4559: 'Windrunner`s Overlook',
    4560: 'The Underbelly',
    4564: 'Krasus` Landing',
    4567: 'The Violet Hold',
    4568: 'The Eventide',
    4569: 'Sewer Exit Pipe',
    4570: 'Circle of Wills',
    4571: 'Silverwing Flag Room',
    4572: 'Warsong Flag Room',
    4575: 'Wintergrasp Fortress',
    4576: 'Central Bridge',
    4577: 'Eastern Bridge',
    4578: 'Western Bridge',
    4579: 'Dubra`Jin',
    4580: 'Crusaders` Pinnacle',
    4581: 'Flamewatch Tower',
    4582: 'Winter`s Edge Tower',
    4583: 'Shadowsight Tower',
    4584: 'The Cauldron of Flames',
    4585: 'Glacial Falls',
    4586: 'Windy Bluffs',
    4587: 'The Forest of Shadows',
    4588: 'Blackwatch',
    4589: 'The Chilled Quagmire',
    4590: 'The Steppe of Life',
    4591: 'Silent Vigil',
    4592: 'Gimorak`s Den',
    4593: 'The Pit of Fiends',
    4594: 'Battlescar Spire',
    4595: 'Hall of Horrors',
    4596: 'The Circle of Suffering',
    4597: 'Rise of Suffering',
    4598: 'Krasus` Landing',
    4599: 'Sewer Exit Pipe',
    4601: 'Dalaran Island',
    4602: 'Force Interior',
    4603: 'Vault of Archavon',
    4604: 'Gate of the Red Sun',
    4605: 'Gate of the Blue Sapphire',
    4606: 'Gate of the Green Emerald',
    4607: 'Gate of the Purple Amethyst',
    4608: 'Gate of the Yellow Moon',
    4609: 'Courtyard of the Ancients',
    4610: 'Landing Beach',
    4611: 'Westspark Workshop',
    4612: 'Eastspark Workshop',
    4613: 'Dalaran City',
    4614: 'The Violet Citadel Spire',
    4615: 'Naz`anak: The Forgotten Depths',
    4616: 'Sunreaver`s Sanctuary',
    4617: 'Elevator',
    4618: 'Antonidas Memorial',
    4619: 'The Violet Citadel',
    4620: 'Magus Commerce Exchange',
    4621: 'UNUSED',
    4622: 'First Legion Forward Camp',
    4623: 'Hall of the Conquered Kings',
    4624: 'Befouled Terrace',
    4625: 'The Desecrated Altar',
    4626: 'Shimmering Bog',
    4627: 'Fallen Temple of Ahn`kahet',
    4628: 'Halls of Binding',
    4629: 'Winter`s Heart',
    4630: 'The North Sea',
    4631: 'The Broodmother`s Nest',
    4632: 'Dalaran Floating Rocks',
    4633: 'Raptor Pens',
    4635: 'Drak`Tharon Keep',
    4636: 'The Noxious Pass',
    4637: 'Vargoth`s Retreat',
    4638: 'Violet Citadel Balcony',
    4639: 'Band of Variance',
    4640: 'Band of Acceleration',
    4641: 'Band of Transmutation',
    4642: 'Band of Alignment',
    4646: 'Ashwood Lake',
    4650: 'Iron Concourse',
    4652: 'Formation Grounds',
    4653: 'Razorscale`s Aerie',
    4654: 'The Colossal Forge',
    4655: 'The Scrapyard',
    4656: 'The Conservatory of Life',
    4657: 'The Archivum',
    4658: 'Argent Tournament Grounds',
    4665: 'Expedition Base Camp',
    4666: 'Sunreaver Pavilion',
    4667: 'Silver Covenant Pavilion',
    4668: 'The Cooper Residence',
    4669: 'The Ring of Champions',
    4670: 'The Aspirants` Ring',
    4671: 'The Argent Valiants` Ring',
    4672: 'The Alliance Valiants` Ring',
    4673: 'The Horde Valiants` Ring',
    4674: 'Argent Pavilion',
    4676: 'Sunreaver Pavilion',
    4677: 'Silver Covenant Pavilion',
    4679: 'The Forlorn Cavern',
    4688: 'claytonio test area',
    4692: 'Quel`Delar`s Rest'
};

// Database utility class
class DBLayer {
    constructor(host, user, password, database, port = 3306) {
        this.config = {
            host: host,
            port: port,
            user: user,
            password: password,
            database: database,
            charset: 'utf8'
        };
        this.connection = null;
        this.num_queries = 0;
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log(`[db] Connected to database: ${this.config.database}`);
            return true;
        } catch (error) {
            console.log(`[db] Connection failed: ${error.message}`);
            this.connection = null;
            return false;
        }
    }

    isValid() {
        return this.connection !== null;
    }

    async query(sql) {
        if (!this.connection) {
            console.log("[db] No valid connection");
            return null;
        }

        try {
            console.log(`[db] Executing query: ${sql.substring(0, 100)}...`);
            const [rows] = await this.connection.execute(sql);
            this.num_queries++;
            return rows;
        } catch (error) {
            console.log(`[db] Query failed: ${error.message}`);
            return null;
        }
    }

    async queryOne(sql) {
        const results = await this.query(sql);
        return results && results.length > 0 ? results[0] : null;
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log("[db] Connection closed");
        }
    }
}

// Utility functions
function getZoneName(zoneId) {
    return ZONES[zoneId] || 'Unknown zone';
}

async function testRealm() {
    try {
        const server = CONFIG.server[CONFIG.realm_id].addr;
        const port = CONFIG.server[CONFIG.realm_id].game_port;
        console.log(`[realm] Testing connection to ${server}:${port}`);
        
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(500);
            
            socket.on('connect', () => {
                socket.destroy();
                console.log('[realm] Server status: online');
                resolve(true);
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                console.log('[realm] Server status: offline (timeout)');
                resolve(false);
            });
            
            socket.on('error', () => {
                console.log('[realm] Server status: offline (error)');
                resolve(false);
            });
            
            socket.connect(port, server);
        });
    } catch (error) {
        console.log(`[realm] Connection test failed: ${error.message}`);
        return false;
    }
}

function sortPlayers(players) {
    return players.sort((a, b) => {
        if (a.leaderGuid === b.leaderGuid) {
            return a.name.localeCompare(b.name);
        }
        return (a.leaderGuid || 0) - (b.leaderGuid || 0);
    });
}

async function getRealmName() {
    const realmDb = new DBLayer(
        CONFIG.realm_db.host,
        CONFIG.realm_db.user,
        CONFIG.realm_db.password,
        CONFIG.realm_db.database,
        CONFIG.realm_db.port
    );
    
    if (await realmDb.connect()) {
        const query = `SELECT name FROM realmlist WHERE id = ${CONFIG.realm_id}`;
        const result = await realmDb.queryOne(query);
        await realmDb.close();
        return result ? result.name : "Unknown Realm";
    }
    
    return "Unknown Realm";
}

// Serve static files
app.use(express.static('public'));
app.use('/img', express.static('img'));

// Main page route
app.get('/', async (req, res) => {
    const realmName = await getRealmName();

    console.log("realmName: ", realmName);
    
    // Generate the HTML with embedded data
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Online Playermap</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    
    <style type="text/css">
        body {
            margin-left: 0px;
            margin-top: 0px;
            margin-right: 0px;
            margin-bottom: 0px;
            color: #EABA28;
            background-color: #000000;
        }
        
        /* Grid mode container to expand page height */
        .grid-mode::after {
            content: "";
            display: block;
            height: 200px;
        }
        #world {
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            background-image: url(${CONFIG.img_base}azeroth.jpg);
            z-index: 10;
        }
        #outland {
            visibility: hidden;
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            background-image: url(${CONFIG.img_base}outland.jpg);
            z-index: 9;
        }
        #northrend {
            visibility: hidden;
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            background-image: url(${CONFIG.img_base}northrend.jpg);
            z-index: 8;
        }
        #pointsOldworld {
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            z-index: 100;
        }
        #pointsOutland {
            visibility: hidden;
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            z-index: 99;
        }
        #pointsNorthrend {
            visibility: hidden;
            position: absolute;
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            z-index: 98;
        }
        
        /* Grid layout styles */
        .grid-mode #world {
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
            background-size: 966px 732px;
        }
        .grid-mode #outland {
            height: 732px;
            width: 966px;
            left: 5%;
            margin-left: -100px;
            top: 870px;
            background-size: 966px 732px;
            visibility: visible !important;
            z-index: 8;
        }
        .grid-mode #northrend {
            height: 732px;
            width: 966px;
            left: 90%;
            margin-left: -866px;
            top: 870px;
            background-size: 966px 732px;
            visibility: visible !important;
            z-index: 9;
        }
        .grid-mode #pointsOldworld {
            height: 732px;
            width: 966px;
            left: 50%;
            margin-left: -483px;
            top: 120px;
        }
        .grid-mode #pointsOutland {
            height: 732px;
            width: 966px;
            left: 5%;
            margin-left: -100px;
            top: 870px;
            visibility: visible !important;
            z-index: 150;
            pointer-events: auto;
        }
        .grid-mode #pointsNorthrend {
            height: 732px;
            width: 966px;
            left: 90%;
            margin-left: -866px;
            top: 870px;
            visibility: visible !important;
            z-index: 150;
            pointer-events: auto;
        }
        
        /* Grid mode adjustments for other elements */
        .grid-mode #info_bottom {
            margin-top: 1650px;
            margin-bottom: 200px;
            padding-bottom: 50px;
        }
        
        #wow {
            position: absolute;
            height: 98px;
            width: 200px;
            left: 50%;
            margin-left: -100px;
            top: 20px;
            z-index: 101;
            text-align: center;
            clear: none;
            float: none;
        }
        #info {
            position: absolute;
            height: 16px;
            width: 40px;
            left: 50%;
            margin-left: -20px;
            top: 98px;
            z-index: 102;
            text-align: center;
            visibility: hidden;
        }
        #info_bottom {
            position: absolute;
            height: 20px;
            width: 966px;
            left: 50%;
            margin-top: 711px;
            margin-left: -483px;
            top: 120px;
            z-index: 101;
            text-align: center;
        }
        #timer {
            font-family: arial;
            font-size: 12px;
            font-style: normal;
            text-align: center;
            font-weight: bold;
            color: #E7CF07;
            filter: Glow(Color=#000099, Strength=3);
        }
        #refresh_timer {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 200;
            font-family: arial;
            font-size: 14px;
            font-weight: bold;
            color: #EABA28;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 5px;
            border: 1px solid #555;
        }
        #server_info {
            font-family: Georgia, "Times New Roman", Times, serif;
            font-size: 20px;
            font-style: italic;
            text-align: center;
            font-weight: bold;
            color: #FFFF99;
            filter: Glow(Color=0, Strength=3);
            padding-top: 30px;
        }
        #serverstatus {
            visibility: ${CONFIG.map_show_status ? 'visible' : 'hidden'};
            position: absolute;
            height: 36px;
            width: 156px;
            margin-left: -78px;
            left: 52.5%;
            top: 105px;
            text-align: center;
            z-index: 101;
        }
        #tip {
            border: 0px solid #aaaaaa;
            left: -1000px;
            padding: 0px;
            position: absolute;
            top: -1000px;
            z-index: 150;
        }
        .statustext {
            font-weight: normal;
            color: #EABA28;
            font-family: verdana, arial, sans-serif, helvetica;
            font-size: 12px;
            font-style: normal;
            text-align: center;
            padding: 0px;
            background-image: url(${CONFIG.img_base}status.gif);
        }
        .tip_header {
            background: #bb0000;
            FONT-WEIGHT: bold;
            color: #FFFFFF;
            font-family: arial, helvetica, sans-serif;
            font-size: 12px;
            font-style: normal;
            text-align: center;
            padding: 0px;
        }
        .tip_head_text {
            background: rgb(50,50,50);
            FONT-WEIGHT: bold;
            color: #DDDD33;
            font-family: arial, helvetica, sans-serif;
            font-size: 12px;
            font-style: normal;
            text-align: left;
            padding: 0px;
        }
        .tip_text {
            background: #000000;
            FONT-WEIGHT: normal;
            color: #ffffff;
            font-family: arial, helvetica, sans-serif;
            font-size: 12px;
            font-style: normal;
            text-align: center;
            padding: 0px;
        }
        .tip_worldinfo {
            FONT-WEIGHT: normal;
            color: #FFFF99;
            font-family: Georgia, arial, helvetica, sans-serif;
            font-size: 12px;
            font-style: normal;
            text-align: left;
            padding: 0px;
        }
        
        /* Checkbox styling */
        #gridToggle {
            position: absolute;
            top: 50px;
            left: 50px;
            z-index: 200;
            color: #EABA28;
            font-family: arial, helvetica, sans-serif;
            font-size: 14px;
        }
        
        #gridToggle input[type="checkbox"] {
            margin-right: 8px;
            transform: scale(1.2);
        }
        
        #gridToggle label {
            cursor: pointer;
            user-select: none;
        }
    </style>
</head>

<body onload="start()">
    <div id="refresh_timer">Next update: <span id="refresh_countdown">--</span>s</div>
    
    <div id="gridToggle">
        <input type="checkbox" id="gridModeCheckbox" onchange="toggleGridMode()">
        <label for="gridModeCheckbox">Show All Maps</label>
    </div>
    
    <div onMouseDown="showNextStatusText();" id="serverstatus">
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="156px" height="36px">
            <tr><td id="status" class="statustext"></td></tr>
        </table>
    </div>
    <div id="tip"></div>
    <div id="pointsOldworld"></div>
    <div id="pointsOutland"></div>
    <div id="pointsNorthrend"></div>
    <div id="world"></div>
    <div id="outland"></div>
    <div id="northrend"></div>
    <div id="wow">
        <img src="${CONFIG.img_base}realm_on.gif" id="statusIMG" style="position: absolute; border: 0px; left: 50%; margin-left: -50px; top: 0;" onClick="window.location.reload()">
    </div>
    <div id="info">
        <center>
            <table valign="top" border="0" cellspacing="0" cellpadding="0" height="16">
                <tr><td id="timer"></td></tr>
            </table>
        </center>
    </div>
    <div id="info_bottom">
        <center>
            <table border="0" cellspacing="0" cellpadding="0" height="20" width="100%">
                <tr><td align="center" valign="top" id="server_info"></td></tr>
            </table>
        </center>
    </div>

    <script type="text/javascript">
        // Configuration variables from server
        var CONFIG = ${JSON.stringify(CONFIG)};
        var LANG_DEFS = ${JSON.stringify(LANG_DEFS)};
        var CHARACTER_RACE = ${JSON.stringify(CHARACTER_RACE)};
        var CHARACTER_CLASS = ${JSON.stringify(CHARACTER_CLASS)};
        
        // Configuration variables
        var current_map = 0;
        
        // ===== UPDATE INTERVAL CONFIGURATION =====
        // Uncomment ONE of the following lines to set your preferred update interval:
        //var time = CONFIG.map_time;              // 5 seconds (default)
        var time = 30;
        // var time = 60;                              // 1 minute updates
        // var time = 120;                             // 2 minute updates
        // ==========================================
        
        var show_time = CONFIG.map_show_time;
        var show_status = CONFIG.map_show_status;
        var maps_count = LANG_DEFS.maps_names.length;
        var maps_array = [${CONFIG.maps_for_points}];
        var maps_name_array = LANG_DEFS.maps_names;

        var race_name = CHARACTER_RACE;
        var class_name = CHARACTER_CLASS;

        // Instance coordinates
        var instances_x = [];
        var instances_y = [];
        instances_x[0] = { 2:0,13:0,17:0,30:762,33:712,34:732,35:732,36:712,37:0,43:245,44:0,47:238,48:172,70:833,90:738,109:849,129:254,150:0,169:0,189:773,209:269,229:782,230:778,249:290,269:315,289:816,309:782,329:834,349:123,369:745,389:308,409:783,429:164,449:741,450:305,451:0,469:778,489:244,509:160,529:820,531:144,532:798,534:317,560:320,568:897,572:750,580:868,585:883,595:322,618:313 };
        instances_y[0] = { 2:0,13:0,17:0,30:278,33:295,34:511,35:503,36:567,37:0,43:419,44:0,47:508,48:291,70:443,90:419,109:551,129:516,150:0,169:0,189:216,209:568,229:481,230:484,249:514,269:601,289:258,309:589,329:203,349:432,369:497,389:352,409:484,429:496,449:508,450:352,451:0,469:480,489:364,509:607,529:321,531:603,532:569,534:596,560:606,568:172,572:245,580:26,585:16,595:601,618:348 };
        instances_x[1] = { 540:593,542:586,543:593,544:588,545:393,546:399,547:388,548:399,550:683,552:680,553:672,554:669,555:495,556:506,557:495,558:483,559:408,562:443,564:740,565:485 };
        instances_y[1] = { 540:399,542:398,543:405,544:402,545:355,546:350,547:353,548:357,550:226,552:215,553:210,554:239,555:569,556:557,557:545,558:557,559:489,562:239,564:567,565:204 };
        instances_x[2] = { 533:568,574:749,575:751,576:161,578:159,599:553,600:605,601:395,602:575,603:559,604:740,608:470,615:491,616:155,617:457,619:400,624:363,631:400,632:415,649:475,650:465,658:393,668:410,724:491 };
        instances_y[2] = { 533:456,574:577,575:583,576:443,578:451,599:195,600:406,601:462,602:180,603:169,604:292,608:360,615:465,616:447,617:352,619:462,624:369,631:350,632:350,649:207,650:207,658:362,668:365,724:455 };

        var fade_colors = ['C6B711','BDAF10','B7A910','B1A40F','AB9E0F','A4980E','9E920E','988C0D','92870D','8B800C','857B0B','7F750B','79700A','746B0A','6E6609','686009','625B08','5C5508','564F07','504A07','4A4406','443F05','3E3905','383404','312D04','2A2703','232002','1C1A02','141201','000000'];
        var fade_cur_color = fade_colors.length-1;
        var status_text = ['OffLine','DB connect error','uptime','max online','GM online'];
        var status_data = [1,0,0,0];
        var status_process = [];
        var status_cur_time = 0;
        var status_next_process = 0;
        var statusUpdateInterval = 50;
        var pointx;
        var pointy;

        function _status_action(text,status_data,text_type,action,time) {
            this.text_id = text;
            this.status_data = status_data;
            this.text_type = text_type;
            this.action = action;
            this.time = time;
        }

        function _coord() {
            this.x = 0;
            this.y = 0;
        }

        function _points() {
            this.map_id = 0;
            this.x = 0;
            this.y = 0;
            this.name = "";
            this.zone = "";
            this.faction = 0;
            this.single_text = "";
            this.multi_text = "";
            this.player = 0;
            this.Extention = 0;
        }

        function _multi_text() {
            this.current = 0;
            this.next = 0;
            this.first_members = [];
            this.text = [];
        }

        function _pos() {
            this.x = 0;
            this.y = 0;
        }

        function getBodyScrollTop() {
            return self.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop);
        }

        function getBodyScrollLeft() {
            return self.pageXOffset || (document.documentElement && document.documentElement.scrollLeft) || (document.body && document.body.scrollLeft);
        }

        function get_tipxy(tip_width, tip_height, x1, y1) {
            tipxy = new _coord();
            tipxy.x = 5;
            tipxy.y = 5;
            var wd, ht;
            if(document.layers) {
                wd = innerWidth;
                ht = innerHeight;
            } else {
                wd = document.body.clientWidth;
                ht = document.body.clientHeight;
            }
            
            // Position tooltip slightly above and to the right of mouse
            if(x1+tip_width+15 < wd)
                tipxy.x = x1+15;
            else if(x1-tip_width-15 > 0)
                tipxy.x = x1-tip_width-15;
            else
                tipxy.x = wd/2-tip_width/2;
                
            // Always position above mouse cursor
            if(y1-tip_height-10 > 0)
                tipxy.y = y1-tip_height-10;
            else if(y1+tip_height+10 < ht)
                tipxy.y = y1+10;
            else
                tipxy.y = 5;
                
            return tipxy;
        }

        function getMultiText(multitext, onClick) {
            if(onClick) {
                multitext.current = multitext.next;
            }
            var ht;
            if(document.layers) {
                ht = innerHeight;
            } else {
                ht = document.body.clientHeight;
            }
            var length = multitext.text.length - multitext.current;
            var count = length;
            if((20+length*22) > ht*0.8) {
                count = Math.round((ht*0.8 - 20)/22);
                multitext.next = multitext.current + count;
                if(multitext.next == multitext.text.length)
                    multitext.next = 0;
            } else
                multitext.next = 0;
            var data = '';
            var i = 0;
            while(i < count) {
                var group_line = '';
                if(in_array(multitext.current + i, multitext.first_members))
                    group_line = '<tr><td colspan="7" bgcolor="#11FF99" height="1px"></td></tr>';
                data += group_line + '<tr class="tip_text"><td align="left">&nbsp;'+(multitext.current + i + 1)+'&nbsp;</td>'+multitext.text[multitext.current + i]+'</tr>';
                i++;
            }
            if(multitext.next > multitext.current)
                data += '<tr class="tip_text"><td align="right" colspan="7">>>>&nbsp;Click to next&nbsp;>>>&nbsp;</td></tr>';
            else if(multitext.current > 0)
                data += '<tr class="tip_text"><td align="left" colspan="7">&nbsp;<<<&nbsp;Click to first&nbsp;<<<</td></tr>';
            return data;
        }

        function tip(object, type, onClick) {
            var t, data;
            var tipxy;
            t=document.getElementById("tip");
            
            // Get current mouse position more reliably
            var mouseX, mouseY;
            if(window.event) {
                // For IE and others
                mouseX = window.event.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft);
                mouseY = window.event.clientY + (document.documentElement.scrollTop || document.body.scrollTop);
            } else {
                // Use stored coordinates from mouse move
                mouseX = pointx || 0;
                mouseY = pointy || 0;
            }
            
            switch(type) {
            case 2:
                tipxy = new _coord();
                tipxy.x = mouseX + 15;
                tipxy.y = mouseY - 60;
                t.innerHTML='<table width="120" border="0" cellspacing="0" cellpadding="0" class="tip_worldinfo">'+object+'</table>';
                break;
            case 1:
                if(onClick || t.innerHTML == '') {
                    data = getMultiText(object.multi_text, onClick);
                    t.innerHTML='<table border="0" cellspacing="0" cellpadding="0"><tr class="tip_header"><td colspan="7">'+object.zone+'</td></tr><tr class="tip_head_text"><td align="center">#</td><td>&nbsp;Name</td><td width="25" align="center">Level</td><td colspan="2">Race</td><td colspan="2">&nbsp;Class</td></tr>'+data+'</table>';
                }
                tipxy = get_tipxy(t.offsetWidth, t.offsetHeight, mouseX, mouseY);
                break;
            case 0:
                var color;
                if(object.faction) {color='#D2321E';}
                else {color='#0096BE';}
                t.innerHTML='<table width="100" border="0" cellspacing="0" cellpadding="0"><tr class="tip_text"><td>&nbsp;'+object.name+'&nbsp;</td></tr><tr bgcolor="'+color+'"><td height="1px"></td></tr><tr><td><table width="100%" border="0" cellspacing="0" cellpadding="3"><tr class="tip_text"><td>'+object.single_text+'</td></tr></table></td></tr></table>';
                tipxy = get_tipxy(t.offsetWidth, t.offsetHeight, mouseX, mouseY);
                break;
            }
            t.style.left=tipxy.x + "px";
            t.style.top=tipxy.y + "px";
        }

        function h_tip() {
            var t;
            t=document.getElementById("tip");
            t.innerHTML="";
            t.style.left="-1000px";
            t.style.top="-1000px";
        }

        function get_player_position(x,y,m) {
            var pos = new _pos();
            var where_530 = 0;
            x = Math.round(x);
            y = Math.round(y);
            if(m == 530) {
                if(y < -1000 && y > -10000 && x > 5000) { //BE
                    x=x-10349; y=y+6357; where_530 = 1;
                } else if(y < -7000 && x < 0) {             //Dr
                    x=x+3961; y=y+13931; where_530 = 2;
                } else {                                    //Outland
                    x=x-3070; y=y-1265; where_530 = 3;
                }
            } else if(m == 609) {
                x=x-2355; y=y+5662;
            }
            var xpos, ypos;
            if(where_530 == 3) { //Outland
                xpos = Math.round(x * 0.051446);
                ypos = Math.round(y * 0.051446);
            } else if(m == 571) { //Northrend
                xpos = Math.round(x * 0.050085);
                ypos = Math.round(y * 0.050085);
            } else {              //Azeroth
                xpos = Math.round(x * 0.025140);
                ypos = Math.round(y * 0.025140);
            }
            switch (m.toString()) {
            case '530':
                if(where_530 == 1) {
                    pos.x = 858 - ypos; pos.y = 84 - xpos;
                } else if(where_530 == 2) {
                    pos.x = 103 - ypos; pos.y = 261 - xpos;
                } else if(where_530 == 3) {
                    pos.x = 684 - ypos; pos.y = 229 - xpos;
                }
                break;
            case '571':
                pos.x = 505 - ypos;
                pos.y = 642 - xpos;
                break;
            case '609':
                pos.x = 896 - ypos;
                pos.y = 232 - xpos;
                break;
            case '1':
                pos.x = 194 - ypos;
                pos.y = 398 - xpos;
                break;
            case '0':
                pos.x = 752 - ypos;
                pos.y = 291 - xpos;
                break;
            default:
                pos.x = 194 - ypos;
                pos.y = 398 - xpos;
            }
            return pos;
        }

        function in_array(value, arr) {
            var i = 0;
            while (i < arr.length) {
                if(value == arr[i])
                    return true;
                i++;
            }
            return false;
        }

        function getMapLayerByID(id) {
            switch(id) {
            case 0:
                return document.getElementById("world"); 
            case 1:
                return document.getElementById("outland"); 
            case 2:
                return document.getElementById("northrend"); 
            default:
                return null;
            }
        }

        function getPointsLayerByID(id) {
            switch(id) {
            case 0:
                return document.getElementById("pointsOldworld"); 
            case 1:
                return document.getElementById("pointsOutland"); 
            case 2:
                return document.getElementById("pointsNorthrend"); 
            default:
                return null;
            }
        }

        function switchworld(n) {
            // Don't switch maps if we're in grid mode
            if (document.body.classList.contains('grid-mode')) {
                return;
            }
            
            for(var i = 0; i < maps_count; i++) {
                var obj_map_layer = getMapLayerByID(i);
                var obj_points_layer = getPointsLayerByID(i);

                if(i == n) {
                    obj_map_layer.style.visibility = "visible";
                    obj_points_layer.style.visibility = "visible";
                } else {
                    obj_map_layer.style.visibility = "hidden";
                    obj_points_layer.style.visibility = "hidden";
                }
            }
        }

        function toggleGridMode() {
            var checkbox = document.getElementById('gridModeCheckbox');
            var body = document.body;
            
            if (checkbox.checked) {
                console.log("[js] Switching to grid mode");
                body.classList.add('grid-mode');
                // In grid mode, show all maps
                for(var i = 0; i < maps_count; i++) {
                    var obj_map_layer = getMapLayerByID(i);
                    var obj_points_layer = getPointsLayerByID(i);
                    obj_map_layer.style.visibility = "visible";
                    obj_points_layer.style.visibility = "visible";
                    
                    // Debug: Log point layer properties
                    console.log("[js] Point layer " + i + " visibility:", obj_points_layer.style.visibility);
                    console.log("[js] Point layer " + i + " z-index:", window.getComputedStyle(obj_points_layer).zIndex);
                }
                // Regenerate points with grid positioning
                regeneratePointsForGrid();
            } else {
                console.log("[js] Switching to single map mode");
                body.classList.remove('grid-mode');
                // Return to single map mode - show Azeroth by default
                switchworld(0);
                // Regenerate points with normal positioning
                regeneratePointsForNormal();
            }
        }

        // Store original point data for regeneration
        var originalPointsData = null;

        function regeneratePointsForGrid() {
            if (!mpoints || mpoints.length === 0) return;
            
            // Clear existing points
            for(var i = 0; i < maps_count; i++) {
                var obj = getPointsLayerByID(i);
                obj.innerHTML = '';
            }
            
            var instances = ['', '', ''];
            var groups = ['', '', ''];
            var single = ['', '', ''];
            
            // Regenerate points with original positioning (CSS handles the grid offsets)
            for(var n = 0; n < mpoints.length; n++) {
                var point = mpoints[n];
                
                if(!in_array(point.map_id, maps_array)) {
                    // Instance icons - use original positioning
                    var instX = instances_x[point.Extention][point.map_id];
                    var instY = instances_y[point.Extention][point.map_id];
                    
                    instances[point.Extention] += '<img src="' + CONFIG.img_base + 'inst-icon.gif" style="position: absolute; border: 0px; left: '+instX+'px; top: '+instY+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;">';
                } else {
                    // Player/bot points - use original positions
                    if(point.player > 1) {
                        groups[point.Extention] += '<img src="' + CONFIG.img_base + 'group-icon.gif" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;" onclick="onClickNode(event);">';
                    } else {
                        var pointImg;
                        if(point.faction)
                            pointImg = CONFIG.img_base + "horde.gif";
                        else
                            pointImg = CONFIG.img_base + "allia.gif";
                        
                        if (point.name.includes('(')) {
                            single[point.Extention] += '<img src="'+pointImg+'" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                        } else {
                            pointImg = CONFIG.img_base2 + point.race + "-" + point.gender + ".gif";
                            single[point.Extention] += '<img src="'+pointImg+'" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px; width: 1.5%; height: auto;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                        }
                    }
                }
            }
            
            // Update all point layers
            for(var i = 0; i < maps_count; i++) {
                var obj = getPointsLayerByID(i);
                obj.innerHTML = instances[i] + single[i] + groups[i];
            }
        }

        function regeneratePointsForNormal() {
            if (!mpoints || mpoints.length === 0) return;
            
            // Clear existing points
            for(var i = 0; i < maps_count; i++) {
                var obj = getPointsLayerByID(i);
                obj.innerHTML = '';
            }
            
            var instances = ['', '', ''];
            var groups = ['', '', ''];
            var single = ['', '', ''];
            
            // Regenerate points with normal positioning
            for(var n = 0; n < mpoints.length; n++) {
                var point = mpoints[n];
                
                if(!in_array(point.map_id, maps_array)) {
                    instances[point.Extention] += '<img src="' + CONFIG.img_base + 'inst-icon.gif" style="position: absolute; border: 0px; left: '+instances_x[point.Extention][point.map_id]+'px; top: '+instances_y[point.Extention][point.map_id]+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;">';
                } else if(point.player > 1) {
                    groups[point.Extention] += '<img src="' + CONFIG.img_base + 'group-icon.gif" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;" onclick="onClickNode(event);">';
                } else {
                    var pointImg;
                    if(point.faction)
                        pointImg = CONFIG.img_base + "horde.gif";
                    else
                        pointImg = CONFIG.img_base + "allia.gif";
                    
                    if (point.name.includes('(')) {
                        single[point.Extention] += '<img src="'+pointImg+'" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                    } else {
                        pointImg = CONFIG.img_base2 + point.race + "-" + point.gender + ".gif";
                        single[point.Extention] += '<img src="'+pointImg+'" style="position: absolute; border: 0px; left: '+point.x+'px; top: '+point.y+'px; width: 1.5%; height: auto;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                    }
                }
            }
            
            // Update all point layers
            for(var i = 0; i < maps_count; i++) {
                var obj = getPointsLayerByID(i);
                obj.innerHTML = instances[i] + single[i] + groups[i];
            }
        }

        function scalePointsForGrid(isGrid) {
            // This function is now replaced by regeneratePointsForGrid/regeneratePointsForNormal
            // Keeping it for compatibility but it does nothing
        }

        var mpoints = [];

        function show(data) {
            console.log("[js] Processing player data...");
            if(!data) {
                var object;
                for(var i = 0; i < maps_count; i++) {
                    object = getPointsLayerByID(i);
                    object.innerHTML = '';
                }
                document.getElementById("server_info").innerHTML = '';
                return;
            }

            mpoints = [];
            var instances = [];
            var groups = [];
            var single = [];
            var points_layer = [];
            var alliance_count = [];
            var horde_count = [];

            for(var i = 0; i < maps_count; i++) {
                instances[i] = '';
                groups[i] = '';
                single[i] = '';
                alliance_count[i] = data[i][0];
                horde_count[i] = data[i][1];
            }

            var point_count=0;
            var ht;
            if(document.layers) {
                ht = innerHeight;
            } else {
                ht = document.body.clientHeight;
            }
            var group_line = '';
            var i = maps_count;

            // Fix player and map count
            var players_online_count = 0;
            var ally_players_online_count = 0;
            var horde_players_online_count = 0;
            var az_player_count = 0;
            var outland_player_count = 0;
            var northrend_player_count = 0;
            var az_player_count_a = 0;
            var outland_player_count_a = 0;
            var northrend_player_count_a = 0;
            var az_player_count_h = 0;
            var outland_player_count_h = 0;
            var northrend_player_count_h = 0;
            var starting_map = 0;

            while (i < data.length) {
                // Fix player count
                players_online_count++;

                var faction, text_col;
                if (data[i].race==2 || data[i].race==5 || data[i].race==6 || data[i].race==8 || data[i].race==10) {
                    faction = 1;
                    text_col='#D2321E';
                    // Fix player count
                    horde_players_online_count++;
                    if (data[i].map == 530)
                        outland_player_count_h++;
                    else if (data[i].map == 571)
                        northrend_player_count_h++;
                    else
                        az_player_count_h++;
                } else {
                    faction = 0;
                    text_col='#0096BE';
                    // Fix player count
                    ally_players_online_count++;
                    if (data[i].map == 530)
                        outland_player_count_a++;
                    else if (data[i].map == 571)
                        northrend_player_count_a++;
                    else
                        az_player_count_a++;
                }

                if (!data[i].name.includes('(')) {
                    console.log("[js] Found player in map: " + data[i].map);
                    if (data[i].map === 530) {
                        starting_map = 1;
                    } else if (data[i].map === 571) {
                        starting_map = 2;
                    }
                }

                // Fix player count
                if (data[i].map == 530)
                    outland_player_count++;
                else if (data[i].map == 571)
                    northrend_player_count++;
                else
                    az_player_count++;

                var char;
                if(data[i].dead == 1)
                    char = '<img src="' + CONFIG.img_base + 'dead.gif" style="float:center" border="0" width="18" height="18">';
                else
                    char = '<img src="' + CONFIG.img_base2 + data[i].race+'-'+data[i].gender+'.gif" style="float:center" border="0" width="18" height="18">';
                
                var n=0;
                var pos;
                if(in_array(data[i].map, maps_array)) {
                    pos = get_player_position(data[i].x,data[i].y,data[i].map);
                    while(n != point_count) {
                        if(data[i].map == mpoints[n].map_id && Math.sqrt(Math.pow(pos.x-mpoints[n].x,2)+Math.pow(pos.y-mpoints[n].y,2)) < 3)
                            break;
                        n++;
                    }
                } else {
                    while(n != point_count) {
                        if(mpoints[n].map_id == data[i].map)
                            break;
                        n++;
                    }
                }
                
                if(n == point_count) {
                    mpoints[n] = new _points();
                    mpoints[point_count].map_id = data[i].map;
                    mpoints[point_count].name = data[i].name;
                    mpoints[point_count].zone = data[i].zone;
                    mpoints[point_count].race = data[i].race;
                    mpoints[point_count].gender = data[i].gender;
                    mpoints[point_count].player = 1;
                    mpoints[point_count].Extention = data[i].Extention;
                    if(in_array(data[i].map, maps_array)) {
                        mpoints[n].faction = faction;
                        mpoints[point_count].single_text = data[i].zone+'<br>'+data[i].level+' lvl<br>'+char+'&nbsp;<img src="' + CONFIG.img_base2 + data[i].cl+'.gif" style="float:center" border="0" width="18" height="18"><br>'+race_name[data[i].race]+'<br/>'+class_name[data[i].cl]+'<br/>';
                        mpoints[point_count].x = pos.x;
                        mpoints[point_count].y = pos.y;
                    } else {
                        mpoints[point_count].single_text='';
                        mpoints[point_count].x = 0;
                        mpoints[point_count].y = 0;
                    }
                    mpoints[point_count].current_leaderGuid = data[i].leaderGuid;
                    mpoints[point_count].multi_text = new _multi_text();
                    n = point_count;
                    point_count++;
                } else {
                    mpoints[n].player += 1;
                    mpoints[n].single_text = '';
                }
                
                if(!in_array(mpoints[n].map_id, maps_array) && (mpoints[n].current_leaderGuid != data[i].leaderGuid || (data[i].leaderGuid == 0 && mpoints[n].player > 1))) {
                    mpoints[n].multi_text.first_members.push(mpoints[n].player-1);
                    mpoints[n].current_leaderGuid = data[i].leaderGuid;
                }
                mpoints[n].multi_text.text[mpoints[n].player-1] = '<td align="left" valign="middle">&nbsp;'+data[i].name+'</td><td>'+data[i].level+'</td><td align="left">'+char+'</td><td align="left" style="color: '+text_col+';">&nbsp;'+race_name[data[i].race]+'</td><td align="left">&nbsp;<img src="' + CONFIG.img_base2 + data[i].cl+'.gif" style="float:center" border="0" width="18" height="18"></td><td align="left">&nbsp;'+class_name[data[i].cl]+'&nbsp;</td>';
                i++;
            }

            n=0;
            while(n!=point_count) {
                if(!in_array(mpoints[n].map_id, maps_array))
                    instances[mpoints[n].Extention] += '<img src="' + CONFIG.img_base + 'inst-icon.gif" style="position: absolute; border: 0px; left: '+instances_x[mpoints[n].Extention][mpoints[n].map_id]+'px; top: '+instances_y[mpoints[n].Extention][mpoints[n].map_id]+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;">';
                else if(mpoints[n].player > 1)
                    groups[mpoints[n].Extention] += '<img src="' + CONFIG.img_base + 'group-icon.gif" style="position: absolute; border: 0px; left: '+mpoints[n].x+'px; top: '+mpoints[n].y+'px;" onMouseMove="tip(mpoints['+n+'],1,false);" onMouseDown="tip(mpoints['+n+'],1,true);" onMouseOut="h_tip();mpoints['+n+'].multi_text.current=0;" onclick="onClickNode(event);">';
                else {
                    var point;
                    if(mpoints[n].faction)
                        point = CONFIG.img_base + "horde.gif";
                    else
                        point = CONFIG.img_base + "allia.gif";
                    
                    if (mpoints[n].name.includes('(')) {
                        single[mpoints[n].Extention] += '<img src="'+point+'" style="position: absolute; border: 0px; left: '+mpoints[n].x+'px; top: '+mpoints[n].y+'px;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                    } else {
                        // Show race gif instead of horde / allia gif for players
                        point = CONFIG.img_base2 + mpoints[n].race + "-" + mpoints[n].gender + ".gif";
                        single[mpoints[n].Extention] += '<img src="'+point+'" style="position: absolute; border: 0px; left: '+mpoints[n].x+'px; top: '+mpoints[n].y+'px; width: 1.5%; height: auto;" onMouseMove="tip(mpoints['+n+'],0,false);" onMouseOut="h_tip();" onclick="onClickNode(event);">';
                    }
                }
                n++;
            }

            var players_count = [0];
            var total_players_count = [0,0];

            for(i = 0; i < maps_count; i++) {
                var obj = getPointsLayerByID(i);
                obj.innerHTML = instances[i] + single[i] + groups[i];
                players_count[i] = alliance_count[i] + horde_count[i];
                total_players_count[0] += alliance_count[i];
                total_players_count[1] += horde_count[i];
            }

            // Fix player count
            total_players_count[0] = ally_players_online_count;
            total_players_count[1] = horde_players_online_count;
            players_count[0] = az_player_count;
            players_count[1] = outland_player_count;
            players_count[2] = northrend_player_count;
            console.log("[js] az player count: " + az_player_count + ", outland: " + outland_player_count + ", northrend: " + northrend_player_count);

            alliance_count[0] = az_player_count_a;
            alliance_count[1] = outland_player_count_a;
            alliance_count[2] = northrend_player_count_a;
            horde_count[0] = az_player_count_h;
            horde_count[1] = outland_player_count_h;
            horde_count[2] = northrend_player_count_h;

            // Create tooltip content for total players
            var totalTooltip = "<tr><td><img src='" + CONFIG.img_base + "hordeicon.gif'></td><td><b style='color: rgb(210,50,30);'>Horde:</b> <b>" + total_players_count[1] + "</b></td></tr><tr><td><img src='" + CONFIG.img_base + "allianceicon.gif'></td><td><b style='color: rgb(0,150,190);'>Alliance:</b> <b>" + total_players_count[0] + "</b></td></tr>";
            
            document.getElementById("server_info").innerHTML=CONFIG.core_name + ' | Online: <b style="color: rgb(100,100,100);" onMouseMove="showTotalTooltip();" onMouseOut="h_tip();">Total</b> '+players_online_count+'';

            for(i = 0; i < maps_count; i++) {
                var mapTooltip = "<tr><td><img src='" + CONFIG.img_base + "hordeicon.gif'></td><td><b style='color: rgb(210,50,30);'>Horde:</b> <b>" + horde_count[i] + "</b></td></tr><tr><td><img src='" + CONFIG.img_base + "allianceicon.gif'></td><td><b style='color: rgb(0,150,190);'>Alliance:</b> <b>" + alliance_count[i] + "</b></td></tr>";
                document.getElementById("server_info").innerHTML += '&nbsp;<b style="color: rgb(160,160,20); cursor:pointer;" onClick="switchworld('+i+');" onMouseMove="showMapTooltip('+i+');" onMouseOut="h_tip();">'+maps_name_array[i]+'</b> '+players_count[i]+'';
            }
            
            // Store tooltip data globally for the functions to access
            window.totalTooltipData = totalTooltip;
            window.mapTooltipData = [];
            for(var j = 0; j < maps_count; j++) {
                window.mapTooltipData[j] = "<tr><td><img src='" + CONFIG.img_base + "hordeicon.gif'></td><td><b style='color: rgb(210,50,30);'>Horde:</b> <b>" + horde_count[j] + "</b></td></tr><tr><td><img src='" + CONFIG.img_base + "allianceicon.gif'></td><td><b style='color: rgb(0,150,190);'>Alliance:</b> <b>" + alliance_count[j] + "</b></td></tr>";
            }
            // Starting map to show: outland (1) / northrend (2)
            if (!document.body.classList.contains('grid-mode')) {
                switchworld(starting_map);
            } else {
                // If in grid mode, make sure all maps are visible and regenerate points
                for(var i = 0; i < maps_count; i++) {
                    var obj_map_layer = getMapLayerByID(i);
                    var obj_points_layer = getPointsLayerByID(i);
                    obj_map_layer.style.visibility = "visible";
                    obj_points_layer.style.visibility = "visible";
                }
                regeneratePointsForGrid();
            }
            console.log("[js] Player data processed successfully");
        }

        function showTotalTooltip() {
            if (window.totalTooltipData) {
                tip(window.totalTooltipData, 2, false);
            }
        }
        
        function showMapTooltip(mapIndex) {
            if (window.mapTooltipData && window.mapTooltipData[mapIndex]) {
                tip(window.mapTooltipData[mapIndex], 2, false);
            }
        }

        function statusController(status_process_id,diff) {
            var action = status_process[status_process_id].action;
            if(action) {
                var obj = document.getElementById("status");
                var text_type = status_process[status_process_id].text_type;
                if(text_type == 0) {
                    var status_process_now = new Date();
                    var status_process_diff = status_process_now.getTime() - status_process_started.getTime();
                    var objDate = new Date(status_data[status_process[status_process_id].status_data]*1000 + status_process_diff);
                    var days = parseInt(status_data[status_process[status_process_id].status_data]/86400);
                    var hours = objDate.getUTCHours();
                    var min = objDate.getUTCMinutes();
                    var sec = objDate.getUTCSeconds();
                    if(hours < 10) hours = '0'+hours;
                    if(min < 10) min = '0'+min;
                    if(sec < 10) sec = '0'+sec;
                    if(days) days = days+' '; else days = '';
                    obj.innerHTML = status_text[status_process[status_process_id].text_id]+' - '+days+''+hours+':'+min+':'+sec;
                } else if(text_type == 1) {
                    obj.innerHTML = status_text[status_process[status_process_id].text_id]+' - '+status_data[status_process[status_process_id].status_data];
                } else
                    obj.innerHTML = status_text[status_process[status_process_id].text_id];
                switch(action) {
                case 1:
                    if(fade_cur_color > 0) {
                        fade_cur_color--;
                        obj.style.color = '#'+fade_colors[fade_cur_color];
                    }
                    break;
                case 2:
                    if(fade_cur_color < (fade_colors.length-1)) {
                        fade_cur_color++;
                        obj.style.color = '#'+fade_colors[fade_cur_color];
                    }
                    break;
                }
            }
            status_cur_time += diff;
            if(status_next_process || status_cur_time >= status_process[status_process_id].time) {
                if(status_next_process)
                    status_cur_time = statusUpdateInterval*fade_colors.length;
                else
                    status_cur_time = 0;
                do {
                    status_process_id++;
                    if(status_process_id >= (status_process.length))
                        status_process_id = 0;
                } while(status_next_process && status_process[status_process_id].action == 2);
                status_next_process = 0;
            }
            setTimeout('statusController('+status_process_id+','+statusUpdateInterval+')', statusUpdateInterval);
        }

        function showNextStatusText() {
            if(status_process.length > 2)
                status_next_process = 1;
        }

        var status_process_started;
        function statusInit() {
            var blinkTime = statusUpdateInterval*fade_colors.length;
            var time_to_show_uptime = CONFIG.map_time_to_show_uptime;
            var time_to_show_maxonline = CONFIG.map_time_to_show_maxonline;
            var time_to_show_gmonline = CONFIG.map_time_to_show_gmonline;

            // for first time
            if(status_process.length == 0)
                setTimeout('statusController(0,'+statusUpdateInterval+')', statusUpdateInterval);

            status_process = [];
            if(status_data[0] == 1) { // online
                if(time_to_show_uptime) {
                    status_process.push(new _status_action(2,1,0,1,time_to_show_uptime));
                    status_process.push(new _status_action(2,1,0,2,blinkTime));
                }
                if(time_to_show_maxonline) {
                    status_process.push(new _status_action(3,2,1,1,time_to_show_maxonline));
                    status_process.push(new _status_action(3,2,1,2,blinkTime));
                }
            } else if(status_data[0] == 0) { // offline
                status_process.push(new _status_action(0,0,2,1,blinkTime));
                status_process.push(new _status_action(0,0,2,2,blinkTime));
            } else { //DB connect error
                status_process.push(new _status_action(1,0,2,1,blinkTime));
                status_process.push(new _status_action(1,0,2,2,blinkTime));
            }
        }

        function load_data() {
            console.log("[js] Loading player data from API...");
            fetch('/api/players')
                .then(response => response.json())
                .then(data => {
                    console.log("[js] Received data from API");
                    if(show_status) {
                        if(data.status) {
                            if(status_data[0] != data.status.online) {
                                status_data[0] = data.status.online;
                                var obj = document.getElementById("statusIMG");
                                if(status_data[0] != 1) {
                                    obj.src = CONFIG.img_base + "realm_off.gif";
                                } else {
                                    obj.src = CONFIG.img_base + "realm_on.gif";
                                }
                            }
                            if(data.status.uptime < status_data[1] || status_data[1] == 0) {
                                status_process_started = new Date();
                                status_data[1] = data.status.uptime;
                            }
                            status_data[2] = data.status.maxplayers;
                            status_data[3] = data.status.gmonline;
                            statusInit();
                        }
                    }
                    show(data.online);
                })
                .catch(error => {
                    console.error('[js] Error loading data:', error);
                });
        }

        var then;
        function reset() {
            var ms = 0;
            then = new Date();
            then.setTime(then.getTime()-ms);
            load_data();
        }

        function display() {
            var now = new Date();
            var ms = now.getTime() - then.getTime();
            ms = time*1000-ms;
            var secondsLeft = Math.round(ms/1000);
            
            // Update both timers
            if ((show_time==1) && (time!=0)) {
                document.getElementById("timer").innerHTML = secondsLeft;
            }
            
            // Update refresh countdown timer
            var refreshTimer = document.getElementById("refresh_countdown");
            if (refreshTimer) {
                if (secondsLeft > 0) {
                    refreshTimer.innerHTML = secondsLeft;
                    refreshTimer.style.color = "#EABA28";
                } else {
                    refreshTimer.innerHTML = "Updating...";
                    refreshTimer.style.color = "#ff6600";
                }
            }
            
            if (ms<=0) {
                reset();
            }
            if (time!=0) {
                setTimeout("display();", 500);
            }
        }

        function getUpdateIntervalText() {
            if (time < 60) {
                return time + " seconds";
            } else if (time < 3600) {
                return Math.round(time/60) + " minute" + (time >= 120 ? "s" : "");
            } else {
                return Math.round(time/3600) + " hour" + (time >= 7200 ? "s" : "");
            }
        }

        function start() {
            // Fix zoom based on viewport size
            var w = window.innerWidth;
            var h = window.innerHeight;
            console.log("Viewport size:", w + "x" + h);
            if (h > 720) {
                console.log("Setting zoom to 90%");
                // Non-standard but works in all major browsers
                document.documentElement.style.zoom = "90%";
                // Could also use a standard-transform approach
                // by wrapping everything in a container and doing:
                //var wrap = document.getElementById("zoom-wrap");
                //wrap.style.transform = "scale(0.9)";
                //wrap.style.transformOrigin = "top left";
                //wrap.style.width = (100/0.9) + "%";
            }

            // Force grid mode to false at startup
            var checkbox = document.getElementById('gridModeCheckbox');
            checkbox.checked = false;
            document.body.classList.remove('grid-mode');
            
            reset();
            
            // Start the display timer for countdown
            display();
            
            // Show update interval info
            console.log("[js] Starting AzerothCore playermap with " + getUpdateIntervalText() + " updates!");
            
            // Update the refresh timer label
            var refreshTimer = document.getElementById("refresh_timer");
            if (refreshTimer && time >= 60) {
                refreshTimer.innerHTML = 'Next update (' + getUpdateIntervalText() + '): <span id="refresh_countdown">--</span>s';
            }
            
            // Improved mouse tracking for all browsers
            document.addEventListener('mousemove', function(e) {
                pointx = e.pageX || (e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft));
                pointy = e.pageY || (e.clientY + (document.documentElement.scrollTop || document.body.scrollTop));
            });
            
            // Fallback for older browsers
            if(navigator.appName=="Netscape") {
                document.onmousemove=function(e) {
                    pointx = e.pageX;
                    pointy = e.pageY;
                    return true;
                }
            }

            // Update page every 2nd min as backup (keep this as failsafe)
            setInterval(function() { window.location.reload(); }, 120000);
        }

        function copy(text) {
            var input = document.createElement('textarea');
            input.innerHTML = text;
            document.body.appendChild(input);
            input.select();
            var result = document.execCommand('copy');
            document.body.removeChild(input);
            return result;
        }

        function onClickNode(e) {
            var t, data;
            t=document.getElementById("tip");
            
            if (t.innerHTML.includes('(')) {
                const tip_split = t.innerHTML.split("(");
                var copy_text = ".npcb go " + tip_split[1].split(")")[0];
                console.log("[js] COPYING TEXT: " + copy_text);
                copy(copy_text);
            }
        }
        
        console.log("[js] Node.js WoW Player Map initialized!");
    </script>
</body>
</html>`;

    res.send(html);
});

// API endpoint for player data
app.get('/api/players', async (req, res) => {
    console.log("[api] Starting player data fetch");
    
    const result = { status: null, online: null };
    
    // Get realm database connection
    const realmDb = new DBLayer(
        CONFIG.realm_db.host,
        CONFIG.realm_db.user, 
        CONFIG.realm_db.password,
        CONFIG.realm_db.database,
        CONFIG.realm_db.port
    );
    
    if (!(await realmDb.connect())) {
        console.log("[api] Realm database connection failed");
        result.status = { online: 2 };
        return res.json(result);
    }
    
    // Get GM accounts
    let gmAccounts = [];

    // acore
    //const gmQuery = "SELECT GROUP_CONCAT(`id` SEPARATOR ' ') as ids FROM `account_access` WHERE `gmlevel`>'0'";
    // tcore
    //const gmQuery = "SELECT GROUP_CONCAT(`AccountID` SEPARATOR ' ') as ids FROM `account_access` WHERE `SecurityLevel`>'0'";
    //const gmResult = await realmDb.queryOne(gmQuery);

    // Use gmQuery from config instead
    const gmResult = await realmDb.queryOne(CONFIG.gmQuery);

    if (gmResult && gmResult.ids) {
        gmAccounts = gmResult.ids.split(' ');
        console.log(`[api] Found ${gmAccounts.length} GM accounts`);
    }
    
    // Get characters database connection
    const charDbConfig = CONFIG.characters_db[CONFIG.realm_id];
    const charactersDb = new DBLayer(
        charDbConfig.host,
        charDbConfig.user,
        charDbConfig.password, 
        charDbConfig.database,
        charDbConfig.port
    );
    
    if (!(await charactersDb.connect())) {
        console.log("[api] Characters database connection failed");
        result.status = { online: 2 };
        await realmDb.close();
        return res.json(result);
    }
    
    // Constants for race detection
    const HORDE_RACES = 0x2B2;
    const ALLIANCE_RACES = 0x44D;
    const OUTLAND_INST = [540,542,543,544,545,546,547,548,550,552,553,554,555,556,557,558,559,562,564,565];
    const NORTHREND_INST = [533,574,575,576,578,599,600,601,602,603,604,608,615,616,617,619,624,631,632,649,650,658,668,724];
    
    const mapsCount = LANG_DEFS.maps_names.length;
    const count = Array.from({length: mapsCount}, () => [0, 0]);
    
    // Query players and bots
    const playerQuery = `
        SELECT \`guid\`, \`account\`, \`name\`, \`class\`, \`race\`, \`level\`, \`gender\`, 
               \`position_x\`, \`position_y\`, \`map\`, \`zone\`, \`extra_flags\` 
        FROM \`characters\` 
        WHERE \`online\`='1' 
        ORDER BY \`name\`
    `;
    
    const botQuery = `
        SELECT \`guid\`, \`account\`, \`name\`, \`class\`, \`race\`, \`level\`, \`gender\`, 
               \`position_x\`, \`position_y\`, \`map\`, \`zone\`, \`extra_flags\` 
        FROM \`characters_playermap\` 
        WHERE \`online\`='1' 
        ORDER BY \`name\`
    `;
    
    console.log("[api] Fetching player data...");
    const playersResult = await charactersDb.query(playerQuery) || [];
    console.log(`[api] Found ${playersResult.length} players`);
    
    console.log("[api] Fetching bot data...");
    const botsResult = await charactersDb.query(botQuery) || [];
    console.log(`[api] Found ${botsResult.length} bots`);
    
    // Merge results
    const mergedResults = [...playersResult, ...botsResult];
    console.log(`[api] Total characters: ${mergedResults.length}`);
    
    const arr = [];
    let gmOnline = 0;
    
    for (const character of mergedResults) {
        // Determine extension (map type)
        let extension;
        if (character.map === 530 && character.position_y > -1000 || OUTLAND_INST.includes(character.map)) {
            extension = 1;
        } else if (character.map === 571 || NORTHREND_INST.includes(character.map)) {
            extension = 2;
        } else {
            extension = 0;
        }
        
        let gmPlayer = false;
        let showPlayer = true;
        
        // Add bot identifier to name if guid > 70000
        if (character.guid > 70000) {
            character.name = `${character.name} (${character.guid})`;
        }
        
        // Check if player is GM
        if (gmAccounts.includes(character.account.toString())) {
            gmPlayer = true;
            showPlayer = false;
            
            if (CONFIG.gm_online) {
                showPlayer = true;
                if ((character.extra_flags & 0x1) !== 0 && CONFIG.map_gm_show_online_only_gmoff) {
                    showPlayer = false;
                }
                if ((character.extra_flags & 0x10) !== 0 && CONFIG.map_gm_show_online_only_gmvisible) {
                    showPlayer = false;
                }
            }
        }
        
        // Count players by faction and extension
        if (!gmPlayer || (gmPlayer && CONFIG.gm_online_count)) {
            if (HORDE_RACES & (0x1 << (character.race - 1))) {
                count[extension][1]++;
            } else if (ALLIANCE_RACES & (0x1 << (character.race - 1))) {
                count[extension][0]++;
            }
        }
        
        // Count GM online
        if ((gmPlayer && showPlayer) || (gmPlayer && !showPlayer && CONFIG.map_status_gm_include_all)) {
            gmOnline++;
        }
        
        if (gmPlayer && !showPlayer) {
            continue;
        }
        
        // Prepare character data
        const charData = {
            x: character.position_x,
            y: character.position_y,
            dead: 0, // TODO?
            name: character.name,
            map: character.map,
            zone: getZoneName(character.zone),
            cl: character.class,
            race: character.race,
            level: character.level,
            gender: character.gender,
            Extention: extension,
            leaderGuid: 0 // TODO?
        };
        
        arr.push(charData);
    }
    
    await charactersDb.close();
    
    if (!arr.length && !(await testRealm())) {
        result.online = null;
    } else {
        const sortedArr = sortPlayers(arr);
        // Prepend count data
        const finalArr = [...count, ...sortedArr];
        result.online = finalArr;
        console.log(`[api] Returning ${arr.length} characters with count data`);
    }
    
    // Get status information
    if (CONFIG.map_show_status) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        const uptimeQuery = `
            SELECT \`starttime\`, \`maxplayers\` 
            FROM \`uptime\` 
            WHERE \`starttime\`=(SELECT MAX(\`starttime\`) FROM \`uptime\`)
        `;
        const uptimeResult = await realmDb.queryOne(uptimeQuery);
        
        if (uptimeResult) {
            const status = {
                online: await testRealm() ? 1 : 0,
                uptime: currentTimestamp - uptimeResult.starttime,
                maxplayers: uptimeResult.maxplayers,
                gmonline: gmOnline
            };
            result.status = status;
            console.log(`[api] Server status:`, status);
        } else {
            result.status = null;
        }
    } else {
        result.status = null;
    }
    
    await realmDb.close();
    console.log("[api] Data fetch completed");
    res.json(result);
});

// Start server
app.listen(PORT, () => {
    console.log(`[server] Node.js WoW Player Map server running on http://localhost:${PORT}`);
    console.log(`[server] Configuration: ${CONFIG.map_time}s updates, ${CONFIG.gm_online ? 'GM' : 'No GM'} visibility`);
});

