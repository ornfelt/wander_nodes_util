#include <iostream>
#include <fstream>
#include <sstream>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <regex>

using namespace std;

#define OUTLAND 1

vector<string> readLinesFromFile(const string& filename) {
    vector<string> lines;
    ifstream file(filename);

    if (file.is_open()) {
        string line;
        while (getline(file, line)) {
            lines.push_back(line);
        }
        file.close();
    }

    return lines;
}

class Graph {
private:
    unordered_map<int, vector<int>> graph;
	// found_targets is used to optimize... What could potentially be done to further optimize is to
	// go through the visited nodes and mark those as found targets based on the previous
	// nodes in visited as start_nodes. Requires visited to be ordered, preferably vector for looping.
    unordered_map<int, unordered_set<int>> found_targets;
    bool target_found;
    bool should_print;

public:
    Graph() {
        target_found = false;
        should_print = false;
    }

    void addEdge(int u, int v) {
        graph[u].push_back(v);
    }

    inline void DFSUtil(int v, unordered_set<int>& visited, int target_v) {
        visited.insert(v);

        if (v == target_v) {
            if (should_print) {
                cout << v << " ";
                cout << "Target found!\n" << endl;
            }
            target_found = true;
            // Add to found_targets
            found_targets[target_v] = visited;
            return;
        } else if (!target_found) {
            if (should_print) {
                cout << v << " ";
            }

            for (int neighbour : graph[v]) {
                if (visited.find(neighbour) == visited.end()) {
                    DFSUtil(neighbour, visited, target_v);
                }
            }
        }
    }

    bool DFS_search(int start_id, int target_id) {
        if (should_print) {
            cout << "start_id: " << start_id << endl;
            cout << "target_id: " << target_id << endl;
        }

        // First check found_targets
		//if target_id in self.found_targets.keys() and start_id in self.found_targets[target_id]
		if (found_targets.find(target_id) != found_targets.end() && found_targets[target_id].find(start_id) != found_targets[target_id].end())
        {
            //std::cout << "Target " << target_id << " already found from start_id " << start_id << std::endl;
            return true;
        }

        unordered_set<int> visited;
        target_found = false;

        for (int vertex : graph[start_id]) {
            if (visited.find(vertex) == visited.end() && !target_found) {
                DFSUtil(vertex, visited, target_id);
            }
        }

        return target_found;
    }

    bool DFS_search_same_zone(int start_id, int target_id, unordered_map<string, string>& zones) {
        if (should_print) {
            cout << "start_id: " << start_id << endl;
            cout << "target_id: " << target_id << endl;
        }

        // First check found_targets
		//if target_id in self.found_targets.keys() and start_id in self.found_targets[target_id]
		if (found_targets.find(target_id) != found_targets.end() && found_targets[target_id].find(start_id) != found_targets[target_id].end())
        {
            //std::cout << "Target " << target_id << " already found from start_id " << start_id << std::endl;
            return true;
        }

        unordered_set<int> visited;
        target_found = false;

        for (int vertex : graph[start_id]) {
            if (visited.find(vertex) == visited.end() && !target_found && zones[std::to_string(vertex)] == zones[std::to_string(start_id)]) {
                DFSUtilSameZone(vertex, visited, target_id, zones);
            }
        }

        return target_found;
    }

    inline void DFSUtilSameZone(int v, unordered_set<int>& visited, int target_v, unordered_map<string, string>& zones) {
        visited.insert(v);

        if (v == target_v) {
            if (should_print) {
                cout << v << " ";
                cout << "Target found!\n" << endl;
            }
            target_found = true;
            // Add to found_targets
            found_targets[target_v] = visited;
			// Here, all (except first and last) in visited can be used as found_targets
			// as well from every previous node in visited. It requires visited to be ordered however.
            return;
        } else if (!target_found) {
            if (should_print) {
                cout << v << " ";
            }

            for (int neighbour : graph[v]) {
                if (visited.find(neighbour) == visited.end() && zones[std::to_string(neighbour)] == zones[std::to_string(target_v)]) {
                    DFSUtilSameZone(neighbour, visited, target_v, zones);
                }
            }
        }
    }

    void setPrint(bool print) {
        should_print = print;
    }
};

std::string extract_index(const std::string& input, const char sep, const int idx)
{
	stringstream ss(input);
	std::vector<std::string> result;
	while(ss.good())
	{
		std::string substr;
		getline(ss, substr, sep);
		result.push_back(substr);
	}
    return result[idx];
}

int main() {
    vector<string> sql_lines = readLinesFromFile("2023_06_09_00_creature_template_npcbot_wander_nodes.sql");

    unordered_map<string, vector<string>> node_vertices;
    unordered_map<string, string> node_zones;
    // Loop Outland nodes
    for (const string& line : sql_lines) {
        if (!line.empty() && line[0] == '(') {
            //string map_id = line.substr(line.find(",") + 1, line.find(",", line.find(",") + 1) - line.find(",") - 1);
            std::string map_id = extract_index(line, ',', 2);
            //std::cout << "Map ID: " << map_id << std::endl;

#if OUTLAND
            if (map_id == "530") { // Outland Map ID
#else
            if (map_id == "571") { // Northrend Map ID
#endif
                string node_id = line.substr(line.find("(") + 1, line.find(",") - line.find("(") - 1);
				//std::cout << "node_id: " << node_id << std::endl;
                //string node_links = line.substr(line.find("'") + 1);
                std::string node_links = extract_index(line, '\'', 3);
                //node_links = node_links.substr(0, node_links.find(":0")).replace(node_links.length() - 1, 1, "");
                node_links = std::regex_replace(node_links, std::regex(":0"), "");
				//std::cout << "node_links: " << node_links << std::endl;
                stringstream ss(node_links);
                vector<string> links;
                string link;
                while (ss >> link) {
                    links.push_back(link);
                }
                node_vertices[node_id] = links;

                // Also add zone_ids
                //string zone_id = line.substr(line.find(",", line.find(",") + 1) + 1);
                std::string zone_id = extract_index(line, ',', 3);
				//std::cout << "zone_id" << zone_id << std::endl;
                node_zones[node_id] = zone_id;
            }
        }
    }

    // DFS using Graph class
    Graph g;

    // Add edges to the graph
    // g.addEdge(0, 1);

    for (auto& pair : node_vertices) {
        int node_id = std::stoi(pair.first);
        vector<std::string>& node_links = pair.second;

        for (std::string link : node_links) {
            g.addEdge(node_id, std::stoi(link));
        }
    }

    g.setPrint(true);

//#if !OUTLAND
#if OUTLAND
	bool test_bool = g.DFS_search(2418, 2474);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search(2500, 2602);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search(2418, 2536);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search(2746, 2702);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search_same_zone(2649, 2626, node_zones);
    std::cout << "\n" << test_bool << endl;
#else
    bool test_bool = g.DFS_search(2802, 2900);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search(3273, 3330);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search_same_zone(3209, 3225, node_zones);
    std::cout << "\n" << test_bool << endl;
    test_bool = g.DFS_search_same_zone(2970, 3003, node_zones);
    std::cout << "\n" << test_bool << endl;
	// Test print zones
	std::cout << "3228 zone_id: " << node_zones["3228"] << std::endl;
	std::cout << "3225 zone_id: " << node_zones["3225"] << std::endl;
#endif
    size_t node_count = node_vertices.size();

    std::cout << "Looping all nodes... Nodes: " << node_count << std::endl;
    g.setPrint(false);
    bool links_to_all = true;
    int loop_counter = 0;

    for (auto& node_pair : node_vertices) {
        int node_id = std::stoi(node_pair.first);

        for (auto& other_node_pair : node_vertices) {
            int other_node_id = std::stoi(other_node_pair.first);

            if (node_id != other_node_id) {
                bool can_reach = g.DFS_search(node_id, other_node_id);
			// Only search nodes from the same zone
			//if (node_id != other_node_id && node_zones[to_string(node_id)] == node_zones[to_string(other_node_id)]) {
                //bool can_reach = g.DFS_search_same_zone(node_id, other_node_id, node_zones);

                loop_counter++;
				// For printing
				//if (loop_counter % 300 == 0) g.setPrint(true);
				//else g.setPrint(false);

                if (!can_reach) {
                    cout << "CAN'T REACH: " << other_node_id << " FROM NODE: " << node_id << endl;
                    links_to_all = false;
                    break;
                }
            }
        }

        if (!links_to_all) {
            break;
        }
    }

    std::cout << "Done checking links... loop_counter: " << loop_counter << 
        " - should be " << node_count << "*" << node_count-1 << " = " <<
        node_count*(node_count-1) << std::endl;
	return 0;
}
