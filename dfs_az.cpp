#include <iostream>
#include <fstream>
#include <sstream>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <regex>
#include <assert.h>

// Compile with: g++ -O2 -Wall dfs_az.cpp -o dfs_az

#define KALIMDOR 0

std::vector<std::string> read_lines_from_file(const std::string& filename) {
    std::vector<std::string> lines;
    std::ifstream file(filename);

    if (file.is_open()) {
        std::string line;
        while (getline(file, line)) {
            lines.push_back(line);
        }
        file.close();
    }
    return lines;
}

std::unordered_map<int, int> node_zones;
std::array<int, 2> isolated_zones {141, 1657};
template<class C, typename T>
bool contains(C&& c, T e) { return std::find(begin(c), end(c), e) != end(c); };

std::vector<std::string> node_lines = read_lines_from_file("2023_04_04_00_creature_template_npcbot_wander_nodes.sql");
#if KALIMDOR
    const std::string node_map_id = "1";
#else
    const std::string node_map_id = "0";
#endif

class Graph {
private:
    std::unordered_map<int, std::vector<int>> graph;
    //std::map<int, std::vector<int>> graph;
    std::unordered_map<int, std::vector<int>> node_history;
    int curr_start_id = 0;
    bool target_found = false;

public:
    std::unordered_map<int, std::unordered_set<int>> found_targets;
    bool should_print = false;

    void addEdge(const int& u, const int& v) {
        graph[u].push_back(v);
    }

    void DFSUtil(int v, std::unordered_set<int>& visited, const int& target_v) {
        visited.insert(v);
        if (std::find(node_history[curr_start_id].begin(), node_history[curr_start_id].end(), v) == node_history[curr_start_id].end() && v != curr_start_id)
            node_history[curr_start_id].push_back(v);

        if (v == target_v) {
            if (should_print)
                std::cout << v << " Target found!" << std::endl;
            target_found = true;
            //for (auto visited_node : visited)
            //    found_targets[target_v].insert(visited_node);
            found_targets[target_v].insert(visited.begin(), visited.end());
            return;
        } else if (!target_found) {
            if (should_print)
                std::cout << v << " ";
            for (const int& neighbour : graph[v]) {
                if (visited.find(neighbour) == visited.end())
                    DFSUtil(neighbour, visited, target_v);
            }
        }
    }

    bool DFS_search(int start_id, const int& target_id) {
        if (should_print)
            std::cout << "start_id: " << start_id << "target_id: " << target_id << std::endl;
        curr_start_id = start_id;
        std::unordered_set<int> visited;

        // First check found_targets
        if (found_targets.find(target_id) != found_targets.end() && found_targets[target_id].find(start_id) != found_targets[target_id].end())
            return true;
        else if (!node_history[start_id].empty()) {
            if (found_targets.find(target_id) != found_targets.end()) {
                for (int start_node : node_history[start_id]) {
                    if (start_node == target_id || found_targets[target_id].find(start_node) != found_targets[target_id].end()) {
                        return true;
                    }
                }
            } else {
                start_id = node_history[start_id].back();
                //std::copy(node_history[start_id].begin(),node_history[start_id].end(),std::inserter(visited,visited.end()));
                visited.insert(node_history[start_id].begin(), node_history[start_id].end());
            }
        }

        target_found = false;
        for (int vertex : graph[start_id]) {
            if (visited.find(vertex) == visited.end() && !target_found)
                DFSUtil(vertex, visited, target_id);

            if (target_found)
                return true;
        }
        return target_found;
    }
};

std::string extract_index(const std::string& input, const char sep, const int idx)
{
    std::stringstream ss(input);
	std::vector<std::string> result;
	while(ss.good()) {
		std::string substr;
		getline(ss, substr, sep);
		result.push_back(substr);
	}
    return result[idx];
}

int main() {
    std::unordered_map<int, std::vector<int>> node_vertices;
    // Loop nodes
    for (const std::string& line : node_lines) {
        if (!line.empty() && line[0] == '(') {
            //string map_id = line.substr(line.find(",") + 1, line.find(",", line.find(",") + 1) - line.find(",") - 1);
            std::string map_id = extract_index(line, ',', 2);
            //std::cout << "Map ID: " << map_id << std::endl;

            if (map_id == node_map_id) {
                int node_id = std::stoi(line.substr(line.find("(") + 1, line.find(",") - line.find("(") - 1));
				//std::cout << "node_id: " << node_id << std::endl;
                //std::string node_links = line.substr(line.find("'") + 1);
                std::string node_links = extract_index(line, '\'', 3);
                //node_links = node_links.substr(0, node_links.find(":0")).replace(node_links.length() - 1, 1, "");
                node_links = std::regex_replace(node_links, std::regex(":0"), "");
				//std::cout << "node_links: " << node_links << std::endl;
                std::stringstream ss(node_links);
                std::vector<int> links;
                std::string link;
                while (ss >> link) {
                    links.push_back(std::stoi(link));
                }
                node_vertices[node_id] = links;

                // Also add zone_ids
                //std::string zone_id = line.substr(line.find(",", line.find(",") + 1) + 1);
                int zone_id = std::stoi(extract_index(line, ',', 3));
				//std::cout << "zone_id" << zone_id << std::endl;
                node_zones[node_id] = zone_id;
            }
        }
    }

    // DFS using Graph class
    Graph g;
    for (auto& pair : node_vertices) {
        int node_id = pair.first;
        std::vector<int>& node_links = pair.second;

        for (const int& link : node_links) {
            g.addEdge(node_id, link);
        }
    }

    g.should_print = true;
#if KALIMDOR
    //bool test_bool = g.DFS_search(2418, 2474);
    //std::cout << "\n" << test_bool << std::endl;
    //assert(test_bool);
    //test_bool = g.DFS_search(2418, 2450);
    //std::cout << "\n" << test_bool << std::endl;
    //assert(test_bool);
#else
    //bool test_bool = g.DFS_search(4854, 5038);
    //std::cout << "\n" << test_bool << std::endl;
    //assert(test_bool);
    //test_bool = g.DFS_search(5038, 4854);
    //std::cout << "\n" << test_bool << std::endl;
    //assert(test_bool);
#endif

    size_t node_count = node_vertices.size();
    std::cout << "Looping all nodes... Nodes: " << node_count << std::endl;
    bool links_to_all = true;
    bool break_when_no_link = false;
    int loop_counter = 0;
    int isolated_counter = 0;
    g.should_print = false;

    for (const auto& entry : node_vertices) {
        int node_id = entry.first;
        for (const auto& other_entry : node_vertices) {
            int other_node_id = other_entry.first;
            // If the zone is isolated (like Teldrassil) only check nodes with same zone
            // Scenarios: if node_id is on teldrassil, then other_node_id must have same zone.
            // If other_node_id is on isolated, then node_id must have the same zone
            bool trying_to_reach_isolated = (contains(isolated_zones, node_zones[node_id]) || 
                    (contains(isolated_zones, node_zones[other_node_id]))) && node_zones[node_id] != node_zones[other_node_id];
            if (trying_to_reach_isolated)
                isolated_counter++;
            if (node_id != other_node_id && !trying_to_reach_isolated) {
                bool can_reach = g.DFS_search(node_id, other_node_id);
                loop_counter++;
				//if (loop_counter % 300 == 0) g.should_print = true;
				//else g.should_print = false;
                if (!can_reach) {
                    std::cout << "CAN'T REACH: " << other_node_id << " (zone: " << node_zones[other_node_id] << 
                        ") FROM NODE: " << node_id << " (zone: " << node_zones[node_id] << ")" << std::endl;
                    links_to_all = false;
                    if (break_when_no_link)
                        break;
                }
            }
        }
        if (!links_to_all && break_when_no_link)
            break;
    }

    std::cout << "Done checking links... Nodes checked: " << loop_counter + isolated_counter << " - should be " 
        << node_count << " * " << node_count - 1 << " = " << 
        node_count * (node_count - 1) << std::endl;

    return 0;
}
