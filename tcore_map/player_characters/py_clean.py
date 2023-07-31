##!/usr/bin/env python3

import mysql.connector
from os.path import exists

# pip3 install mysql-connector-python-rf
# Windows:
# python -m pip install mysql-connector-python

# Cron example:
# */5 * * * * /usr/bin/python3 /home/jonas/Code2/Javascript/player_characters/py_insert.py > /home/jonas/wander_cron_log.txt 2>&1

N = 150 # Amount of wandering bots
server_path = "/home/jonas/tcore_relwithdebinfo/bin"

mydb = mysql.connector.connect(
  host="localhost",
  user="trinity",
  password="trinity",
  database="characters"
)

mycursor = mydb.cursor()

mycursor.execute("SELECT * FROM characters_playermap")
myresult = mycursor.fetchall()

for x in myresult:
  print(x)

print("-----------------------------------------")
# Clean db
mycursor.execute("DELETE FROM characters_playermap")
mydb.commit()
print(mycursor.rowcount, "records deleted.")
print("-----------------------------------------")
mydb.close()
