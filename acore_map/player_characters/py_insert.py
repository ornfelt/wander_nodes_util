##!/usr/bin/env python3

import mysql.connector
from os.path import exists

# pip3 install mysql-connector-python-rf
# Windows:
# python -m pip install mysql-connector-python

# Cron example:
# */5 * * * * /usr/bin/python3 /home/jonas/Code2/Javascript/player_characters/py_insert.py > /home/jonas/wander_cron_log.txt 2>&1

N = 150 # Amount of wandering bots
server_path = "D:/My files/svea_laptop/acore_06_26/acore_06_26/build_eluna/bin/RelWithDebInfo"

mydb = mysql.connector.connect(
  host="localhost",
  user="acore",
  password="acore",
  database="player_characters"
)

mycursor = mydb.cursor()

mycursor.execute("SELECT * FROM characters")
myresult = mycursor.fetchall()

#for x in myresult:
#  print(x)

#print("-----------------------------------------")
# Clean db
mycursor.execute("DELETE FROM characters")
mydb.commit()
print(mycursor.rowcount, "records deleted.")

#print("-----------------------------------------")

# Prepare the SQL query
#sql = "INSERT INTO customers (name, address) VALUES (%s, %s)"
#values = ("John Smith", "123 Main St")
# Execute the query
#mycursor.execute(sql, values)
# Commit the changes
#mydb.commit()
# Print the number of rows affected
#print(mycursor.rowcount, "record inserted.")

# Read wandering bot info:
with open(server_path + "/wander_nodes_data/wander_nodes_all.txt") as file:
    lines = [line.rstrip() for line in file]
    #print(lines)

entries = []
maps = []
zones = []
x_coords = []
y_coords = []

levels = [""] * N
#levels = ['' for _ in range(N)]
names = [""] * N
bot_classes = [""] * N
bot_races = [""] * N
bot_genders = [""] * N

for idx, line in enumerate(lines):
    #if idx <= 6:
    if "Spawning wandering bot!" in line and "Map 559" not in line and "Map 529" not in line and "Map 489" not in line and "Map 30" not in line:
        bot_entry = line.split("Bot: ")[1].split(", ")[0]
        #print("Bot entry:",bot_entry)
        entries.append(bot_entry)
        bot_map = line.split("Map ")[1].split(", ")[0]
        #print("Bot map:",bot_map)
        maps.append(bot_map)
        bot_zone = line.split("Zone ")[1].split("(")[0]
        #print("Bot zone:",bot_zone)
        zones.append(bot_zone)

        bot_x = line.split("(X: ")[1].split(" Y:")[0]
        #print("Bot x:",bot_x)
        x_coords.append(bot_x)
        bot_y = line.split("Y: ")[1].split(" Z:")[0]
        #print("Bot y:",bot_y)
        y_coords.append(bot_y)

# Dict based on index and bot_entry
#entry_dict = {k: v for k, v in enumerate(entries)}
# Reverse order so that we can use entry as key to find the index...
entry_dict = {k: v for v, k in enumerate(entries)}

print("entry_dict:", entry_dict)

# Read node file for each wanderer (if exists)
lines = [] # Reset lines list
for entry in entries:
    file_path = server_path + "/wander_nodes_data/" + entry + "_pos.txt"
    if exists(file_path):
        with open(file_path) as file:
            #lines = [line.rstrip() for line in file]
            lines.append(file.read())
            #print(lines)

# Loop new list (N lines)
for idx, line in enumerate(lines):
    if "WanderNodeReached!" in line and "map: 559" not in line and "map: 529" not in line and "map: 489" not in line and "map: 30" not in line:
        bot_entry = line.split("Bot: ")[1].split(", ")[0]
        #print("Bot entry:",bot_entry)
        bot_map = line.split("map: ")[1].split(", ")[0]
        #print("Bot map:",bot_map)
        maps[entry_dict[bot_entry]] = bot_map
        bot_zone = line.split("zone: ")[1].split(", ")[0]
        #print("Bot zone:",bot_zone)
        zones[entry_dict[bot_entry]] = bot_zone
        bot_x = line.split("X: ")[1].split(" Y:")[0]
        #print("Bot x:",bot_x)
        x_coords[entry_dict[bot_entry]] = bot_x
        bot_y = line.split("Y: ")[1].split(" Z:")[0]
        #print("Bot y:",bot_y)
        y_coords[entry_dict[bot_entry]] = bot_y
        bot_level = line.split("level: ")[1].split(", ")[0]
        #print("Bot lvl:",bot_level)
        levels[entry_dict[bot_entry]] = bot_level
        bot_name = line.split("name: ")[1].split(", ")[0]
        #bot_name = line.split("name: ")[1].split(", ")[0] + "(" + bot_entry + ")"
        # Remove ' from bot_name
        bot_name = bot_name.replace("'", "")

        #print("Bot name:",bot_name)
        names[entry_dict[bot_entry]] = bot_name
        bot_class = line.split("class: ")[1].split(", ")[0]
        #print("Bot class:",bot_class)
        bot_classes[entry_dict[bot_entry]] = bot_class
        bot_race = line.split("race: ")[1].split(", ")[0]
        #print("Bot race:",bot_race)
        bot_races[entry_dict[bot_entry]] = bot_race
        bot_gender = line.split("gender: ")[1].split(", ")[0]
        #print("Bot gender:",bot_gender)
        bot_genders[entry_dict[bot_entry]] = bot_gender

# Base sql
sql = "INSERT INTO characters(guid,account,name,class,race,level,gender,position_x,position_y,map,zone,extra_flags,online,taximask,innTriggerId) VALUES"

for i in range(len(entries)):
    #sql += "\n(BOT_ENTRY,1,'BOT_NAME',8,5,80,0,BOT_X,BOT_Y,BOT_MAP,BOT_ZONE,64,1,'',1),"
    sql += "\n(BOT_ENTRY,1,'BOT_NAME',BOT_CLASS,BOT_RACE,BOT_LEVEL,BOT_GENDER,BOT_X,BOT_Y,BOT_MAP,BOT_ZONE,64,1,'',1),"
    sql = sql.replace("BOT_ENTRY", entries[i])
    #sql = sql.replace("BOT_NAME", ("BOT_"+str(i))) # TODO
    sql = sql.replace("BOT_X", x_coords[i])
    sql = sql.replace("BOT_Y", y_coords[i])
    sql = sql.replace("BOT_MAP", maps[i])
    sql = sql.replace("BOT_ZONE", zones[i])

    if levels[i] != "":
        sql = sql.replace("BOT_LEVEL", levels[i])
    else:
        sql = sql.replace("BOT_LEVEL", "80")
    if names[i] != "":
        sql = sql.replace("BOT_NAME", names[i])
    else:
        sql = sql.replace("BOT_NAME", ("BOT_"+str(i)))
    if bot_classes[i] != "":
        sql = sql.replace("BOT_CLASS", bot_classes[i])
    else:
        sql = sql.replace("BOT_CLASS", "8")
    if bot_races[i] != "":
        sql = sql.replace("BOT_RACE", bot_races[i])
    else:
        sql = sql.replace("BOT_RACE", "5")
    if bot_genders[i] != "":
        sql = sql.replace("BOT_GENDER", bot_genders[i])
    else:
        sql = sql.replace("BOT_GENDER", "0")

#sql = sql[:-1] + ';'
sql = sql[:-1]
print("SQL QUERY:",sql)
# Execute the query
mycursor.execute(sql)
# Commit the changes
mydb.commit()
# Print the number of rows affected
print(mycursor.rowcount, "records inserted.")

#sql = "INSERT INTO customers (name, address) VALUES (%s, %s)"
#values = ("John Smith", "123 Main St")
# Execute the query
#mycursor.execute(sql, values)
# Commit the changes
#mydb.commit()
# Print the number of rows affected
#print(mycursor.rowcount, "record(s) inserted.")
