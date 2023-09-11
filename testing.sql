--
SET @WP_START = 2418;
SET @WP_END   = 5038;

DELETE FROM `creature_template_npcbot_wander_nodes` WHERE `id` BETWEEN @WP_START AND @WP_END;
INSERT INTO `creature_template_npcbot_wander_nodes`(`id`,`name`,`mapid`,`zoneid`,`areaid`,`minlevel`,`maxlevel`,`flags`,`x`,`y`,`z`,`o`,`links`) VALUES
(2418,'hellfire001',530,3483,3804,60,63,0,-88.1661,1757.73,61.4158,2.30551,'2419:0 2421:0 '),
(2419,'hellfire002',530,3483,3804,60,63,0,-130.83,1837.76,78.4899,5.22012,'2418:0 2420:0 '),
(2420,'hellfire003',530,3483,3542,60,63,0,-228.144,1920.56,96.8968,1.90495,'2419:0 2421:0 '),
(2421,'hellfire004',530,3483,3542,60,63,1,-207.846,2150.92,80.3185,1.58606,'2418:0 '),
