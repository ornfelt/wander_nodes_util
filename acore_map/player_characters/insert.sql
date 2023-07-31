-- SELECT `account`,`name`,`class`,`race`, `level`, `gender`, `position_x`,`position_y`,`map`,`zone`,`extra_flags` FROM `characters` WHERE `online`='1' ORDER BY `name`");

use player_characters;
DELETE FROM `characters`;
INSERT INTO `characters`(`guid`, `account`,`name`,`class`,`race`,`level`,`gender`,`position_x`,`position_y`,`map`,`zone`,`extra_flags`,`online`,`taximask`, `innTriggerId`) VALUES
-- Sample from my characters:
(1, 1,"Arch",3,2,80,0,1987.57,-4795.61,1,1637,64,1,"",1),
(2, 1,"Blue",7,2,80,0,8997.89,-1259.37,571,67,64,1,"",1),
(3, 1,"Jonas",8,5,80,0,9022.63,-1205.5,571,67,64,1,"",1),
(4, 1,"Jaina",8,5,80,0,5342.52,4913.75,571,3711,64,1,"",1),
(5, 1,"Blues",7,11,80,0,8998.13,-1286.56,571,67,64,1,"",1),
(6, 1,"Bluex",7,2,80,0,-2270.9,6483.44,530,3518,64,1,"",1),
(7, 1,"Oakenshield",1,3,60,0,-4939.25,-970.554,0,1537,0,1,"",1),
(8, 1,"Neovi",2,10,80,1,5348.02,5020.77,571,3711,64,1,"",1),
(9, 1,"Jonaz",8,5,80,0,1983.74,-4799.34,1,1637,64,1,"",1),
(10, 1,"Phi",4,5,80,0,1982.6,-4793.73,1,1637,64,1,"",1),
(11, 3,"Druu",11,4,80,1,9949.18,2325.15,1,1657,0,1,"",1);

--SELECT `account`,`name`,`class`,`race`, `level`, `gender`, `position_x`,`position_y`,`map`,`zone`,`extra_flags` FROM `characters`;
