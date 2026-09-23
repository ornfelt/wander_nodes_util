<?php

require_once("defines.php");
require_once("pomm_conf.php");
require_once("func.php");
require_once("map_english.php");

$_RESULT = null;

$maps_count = count($lang_defs['maps_names']);

// Character kinds reported to the client (keep in sync with index.php)
define('CHAR_KIND_PLAYER',    0); // real player - that's you
define('CHAR_KIND_NPCBOT',    1); // NPCBots module bot
define('CHAR_KIND_PLAYERBOT', 2); // Playerbots module bot

// NPCBots live above this guid in `characters_playermap`
define('NPCBOT_GUID_MIN', 70000);
define('NPCBOT_TABLE', 'characters_playermap');

// Playerbots module accounts are named '<prefix>0', '<prefix>1', ...
// (AiPlayerbot.RandomBotAccountPrefix in playerbots.conf)
define('PLAYERBOT_ACCOUNT_PREFIX', getenv('PLAYERBOT_ACCOUNT_PREFIX') ?: 'rndbot');

$Horde_races = 0x2B2;
$Alliance_races = 0x44D;
$outland_inst   = array(540,542,543,544,545,546,547,548,550,552,553,554,555,556,557,558,559,562,564,565);
$northrend_inst = array(533,574,575,576,578,599,600,601,602,603,604,608,615,616,617,619,624,631,632,649,650,658,668,724);

require_once "libs/js/JsHttpRequest/Php.php";
$JsHttpRequest = new Subsys_JsHttpRequest_Php("utf-8");

$realm_db = new DBLayer($hostr, $userr, $passwordr, $dbr);
if (!$realm_db->isValid()) {
    $_RESULT['status']['online'] = 2;
    exit();
}
$realm_db->query("SET NAMES $database_encoding");

$gm_online = 0;
$gm_accounts = array();
if ($server_type == 1) { // TrinityCore
    //$query = $realm_db->query("SELECT GROUP_CONCAT(`id` SEPARATOR ' ') FROM `account_access` WHERE `gmlevel`>'0'");
    $query = $realm_db->query("SELECT GROUP_CONCAT(`AccountID` SEPARATOR ' ') FROM `account_access` WHERE `SecurityLevel`>'0'");
} else {
    $query = $realm_db->query("SELECT GROUP_CONCAT(`id` SEPARATOR ' ') FROM `account` WHERE `gmlevel`>'0'");
}

if ($query) {
    if ($result = $realm_db->fetch_row($query)) {
        $gm_accounts = explode(' ', $result[0]);
    }
}
$playerbot_accounts = array();
$query = $realm_db->query("SELECT GROUP_CONCAT(`id` SEPARATOR ' ') FROM `account` WHERE `username` LIKE '".PLAYERBOT_ACCOUNT_PREFIX."%'");
if ($query) {
    // GROUP_CONCAT gives NULL when no account matches the prefix
    if (($result = $realm_db->fetch_row($query)) && $result[0] !== null) {
        $playerbot_accounts = explode(' ', $result[0]);
    }
}

$groups = array();
$characters_db = new DBLayer($host, $user, $password, $db);
if (!$characters_db->isValid()) {
    $_RESULT['status']['online'] = 2;
    exit();
}

//$characters_db->query("SET NAMES $database_encoding");
//$query = $characters_db->query("SELECT `leaderGuid`,`memberGuid` FROM `group_member` WHERE `memberGuid` IN(SELECT `guid` FROM `characters` WHERE `online`='1')");
//if ($query) {
//    while ($result = $characters_db->fetch_assoc($query)) {
//        $groups[$result['memberGuid']] = $result['leaderGuid'];
//    }
//}

$Count = array();
for ($i = 0; $i < $maps_count; $i++) {
    $Count[$i] = array(0,0);
}
$arr = array();
$i=$maps_count;
//$query = $characters_db->query("SELECT `account`,`name`,`class`,`race`, `level`, `gender`, `position_x`,`position_y`,`position_z`,`map`,`zone`,`extra_flags` FROM `characters` WHERE `online`='1' ORDER BY `name`");
$query_players = $characters_db->query("SELECT `guid`, `account`,`name`,`class`,`race`, `level`, `gender`, `position_x`,`position_y`,`position_z`,`map`,`zone`,`extra_flags` FROM `characters` WHERE `online`='1' ORDER BY `name`");
// NPCBots keep their characters in a table of their own - a playerbots server has none,
// and querying a missing table poisons the connection for the queries that follow.
$query_bot_table = $characters_db->query("SHOW TABLES LIKE '".NPCBOT_TABLE."'");
$has_npcbot_table = $query_bot_table && $characters_db->num_rows($query_bot_table) > 0;
$query_bots = $has_npcbot_table ? $characters_db->query("SELECT `guid`, `account`,`name`,`class`,`race`, `level`, `gender`, `position_x`,`position_y`,`position_z`,`map`,`zone`,`extra_flags` FROM `".NPCBOT_TABLE."` WHERE `online`='1' ORDER BY `name`") : false;

$results_players = [];
while ($row = $characters_db->fetch_assoc($query_players)) {
    $results_players[] = $row;
}
$results_bots = [];
while ($row = $characters_db->fetch_assoc($query_bots)) {
    $results_bots[] = $row;
}
// Merge the results
$mergedResults = array_merge($results_players, $results_bots);

//while ($result = $characters_db->fetch_assoc($query)) {
foreach ($mergedResults as $result) {
    if ($result['map'] == 530 && $result['position_y'] > -1000 || in_array($result['map'], $outland_inst)) {
        $Extention = 1;
    } elseif ($result['map'] == 571 || in_array($result['map'], $northrend_inst)) {
        $Extention = 2;
    } else {
        $Extention = 0;
    }

    $gm_player = false;
    $show_player = true;
    if ($result['guid'] > NPCBOT_GUID_MIN) {
        $result['name'] = $result['name']." (".$result['guid'].")";
    }

    // Tell real players, NPCBots and playerbots apart
    if (in_array($result['account'], $playerbot_accounts)) {
        $char_kind = CHAR_KIND_PLAYERBOT;
    } elseif ($result['guid'] > NPCBOT_GUID_MIN) {
        $char_kind = CHAR_KIND_NPCBOT;
    } else {
        $char_kind = CHAR_KIND_PLAYER;
    }

    if (in_array($result['account'], $gm_accounts)) {
        $gm_player = true;
        $show_player = false;
        if ($gm_show_online == 1) {
            $show_player = true;
            if (($result['extra_flags'] & 0x1) != 0 && $gm_show_online_only_gmoff == 1) {
                $show_player = false;
            }
            if (($result['extra_flags'] & 0x10) != 0 && $gm_show_online_only_gmvisible == 1) {
                $show_player = false;
            }
            if ($gm_add_suffix && $show_player) {
                //$result['name'] = $result['name'].' <small style="color: #EABA28;">{GM}</small>';
                //$result['name'] .= " (".$result['guid'].")";

                //$result['name'] = $result['name']." (".$result['guid'].")";
            }
        }
    }

    if ($gm_player == false || ($gm_player == true && $gm_include_online == 1)) {
        if ($Horde_races & (0x1 << ($result['race']-1))) {
            $Count[$Extention][1]++;
        } elseif ($Alliance_races & (0x1 << ($result['race']-1))) {
            $Count[$Extention][0]++;
        }
    }

    if (($gm_player && $show_player) || ($gm_player && !$show_player && $status_gm_include_all)) {
        $gm_online++;
    }
    if ($gm_player && $show_player == false) {
        continue;
    }

    $char_data = 0;
    $char_flags = $char_data;
    $char_dead = ($char_flags & 0x11)?1:0;
    $arr[$i]['x'] = $result['position_x'];
    $arr[$i]['y'] = $result['position_y'];
    $arr[$i]['z'] = $result['position_z'];
    $arr[$i]['guid'] = $result['guid'];
    $arr[$i]['kind'] = $char_kind;
    $arr[$i]['dead'] = $char_dead;
    $arr[$i]['name']=$result['name'];
    $arr[$i]['map']=$result['map'];
    $arr[$i]['zone']=get_zone_name($result['zone']);
    $arr[$i]['cl'] = $result['class'];
    $arr[$i]['race'] = $result['race'];
    $arr[$i]['level']=$result['level'];
    $arr[$i]['gender'] = $result['gender'];
    $arr[$i]['Extention'] = $Extention;
    $arr[$i]['leaderGuid'] = isset($groups[$char_data]) ? $groups[$char_data] : 0;
    $i++;
}
$characters_db->close();
unset($characters_db);

if (!count($arr) && !test_realm()) {
    $res['online'] = null;
} else {
    usort($arr, "sort_players");
    $arr = array_merge($Count, $arr);
    $res['online'] = $arr;
}

if ($show_status) {
    $query = $realm_db->query("SELECT UNIX_TIMESTAMP(),`starttime`,`maxplayers` FROM `uptime` WHERE `starttime`=(SELECT MAX(`starttime`) FROM `uptime`)");
    if ($result = $realm_db->fetch_row($query)) {
        $status['online'] = test_realm() ? 1 : 0;
        $status['uptime'] = $result[0] - $result[1];
        $status['maxplayers'] = $result[2];
        $status['gmonline'] = $gm_online;
    } else {
        $status = null;
    }
} else {
    $status = null;
}

$realm_db->close();
unset($realm_db);

$res['status'] = $status;

$_RESULT = $res;
