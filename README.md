# My utility scripts for generating / visualizing wanderer nodes based on [Trickerer's](https://github.com/trickerer/Trinity-Bots) Npcbots

# Live map of wandering bots

I created a live map of wandering bots (based on [Azerothcore playermap](https://github.com/azerothcore/playermap)). The bots position is based on their current wander node and is updated when they reach their new target node.

To use the botmap you need to alter your AzerothCore / TrinityCore fork so that when a wander node is reached (when OnWanderNodeReached() is called), you store that info in a separate database.

The interactive maps showcased below can be used directly through the included HTML files. The botmap and other utility scripts requires a bit more attention and I might improve on the instructions if there's interest in the tools. See more info in the info section further down.

## Azeroth:
![Bot map Azeroth](./images/botmap_azeroth.gif?raw=true "Bot map Azeroth")

## Outland:
![Bot map Outland](./images/botmap_outland.gif?raw=true "Bot map Outland")

## Northrend:
![Bot map Northrend](./images/botmap_northrend.gif?raw=true "Bot map Northrend")

## Hover to see bot info (click to pipe ".npcb go XXXXX" into clipboard):
![Bot map hover](./images/botmap_hover.png?raw=true "Bot map hover")

# Interactive wander nodes map

## Interaction:

The wander node maps (see HTML files) are generated using pyvis. You can interact with the nodes by dragging them around or zooming to get a closer look. The nodes are directed and you can see the corresponding ID's if you zoom in.

Example of enlarged view of Shadowmoon Valley / Terokkar Forest:

![Interactive map example](./images/interactive_wander_nodes.gif?raw=true "Interactive map example")

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

***I don't recommend using any scripts unless you look into the code and try to understand what it does. The code is for personal use and I haven't generalized it for external usage. This repo is mostly for showing cool features and tracking changes :)***

dfs.cpp can be used to search the nodes based on SQL entries. The script checks that every node is reachable from every other node. The script also supports checking that every node is reachable from every other node in current zone ONLY.
The script currently supports Outland and Northrend nodes, but it would be trivial to add support for Azeroth nodes as well.

There's similar functionality in [wander_nodes_util.ipynb](./wander_nodes_util.ipynb).
The notebook also contains scripts for generating SQL entries based on gm-logs, adjustments / updates of HandyNotes.lua etc (it's sort of a mess). The code is mostly for personal use but can be alterered to serve your specific need.

[pyvis.ipynb](./pyvis.ipynb) contains code for generating the interactive wander nodes.

## Files:

wander_nodes.txt includes Azeroth wander nodes (created by [Trickerer](https://github.com/trickerer))

2023_06_09_00_creature_template_npcbot_wander_nodes.sql includes my SQL entries for Outland and Northrend