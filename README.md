# My utility scripts for generating / visualizing wanderer nodes based on [Trickerer's](https://github.com/trickerer/Trinity-Bots) Npcbots

# Live map of wandering bots

I created a live map of wandering bots (based on [Azerothcore playermap](https://github.com/azerothcore/playermap)). The 

To use the botmap you need to alter your AzerothCore / TrinityCore fork so that when a wander node is reached

## Azeroth:
![Bot map Azeroth](./images/botmap_azeroth.png?raw=true "Bot map Azeroth")

## Outland:
![Bot map Outland](./images/botmap_outland.png?raw=true "Bot map Outland")

## Northrend:
![Bot map Northrend](./images/botmap_northrend.png?raw=true "Bot map Northrend")

# Interactive wander nodes map

## Interaction:

The wander node maps (see html-files) are generated using pyvis, so you can interact with the nodes by dragging them around or zooming to get a closer look. The nodes are directed and you can see the corresponding ID's if you zoom in.

Example of enlarged view of Shadowmoon Valley / Terokkar Forest:

![Interactive map example](./images/outland_interactive_map_example.png?raw=true "Interactive map example")

## Outland:
![Interactive map Outland](./images/outland_interactive_map.png?raw=true "Interactive map Outland")

## Northrend:
![Interactive map Northrend](./images/northrend_interactive_map.png?raw=true "Interactive map Northrend")

## Eastern Kingdoms:
![Interactive map EK](./images/eastern_kingdoms_interactive_map.png?raw=true "Interactive map EK")

## Kalimdor:
![Interactive map Kalimdor](./images/kalimdor_interactive_map.png?raw=true "Interactive map Kalimdor")

## Azeroth (Eastern Kingdoms and Kalimdor):
![Interactive map Azeroth](./images/azeroth_interactive_map.png?raw=true "Interactive map Azeroth")

# Info

I don't recommend using any scripts unless you look into the code and try to understand what it does. The code is for personal use and I haven't generalized it for external usage. This respo is mostly for showing cool features and tracking changes :)

dfs.cpp can be used to search the nodes based on SQL entries. The script checks that every node is reachable from every other node. The script also supports checking that every node is reachable from every other node in current zone ONLY.
The script currently supports Outland and Northrend nodes, but it would be trivial to add support for Azeroth nodes as well.

There's similar functionality in [wander_nodes_util.ipynb](./wander_nodes_util.ipynb).
The notebook also contains scripts for generating SQL entries based on gm-logs, adjustments / updates of HandyNotes.lua etc. The code is mostly for personal use but can be alterered to serve your specific need.

[pyis.ipynb](./pyis.ipynb) contains code for generating the interactive wander nodes.