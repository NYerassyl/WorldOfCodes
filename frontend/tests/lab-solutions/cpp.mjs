export const solutions = {
  "cpp-basics-lab": `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "Ada";
    int level = 3;
    double price = 4.5;

    cout << name << endl;
    cout << level << endl;
    cout << price << endl;
    return 0;
}
`,
  "cpp-control-lab": `#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 5; i++) {
        if (i % 2 == 0) {
            cout << i << " even" << endl;
        } else {
            cout << i << " odd" << endl;
        }
    }
    return 0;
}
`,
  "cpp-functions-lab": `#include <iostream>
using namespace std;

int sum(int a, int b) {
    return a + b;
}

int main() {
    int total = sum(3, 4);
    cout << total << endl;
    return 0;
}
`,
  "cpp-structs-lab": `#include <iostream>
using namespace std;

struct Score {
    int points;
    Score(int start) : points(start) {}
    int value() const { return points; }
};

int main() {
    Score score(42);
    cout << score.value() << endl;
    return 0;
}
`,
  "cpp-stl-lab": `#include <iostream>
#include <vector>
#include <map>
#include <algorithm>
using namespace std;

int main() {
    vector<int> scores = {12, 5, 20, 8};
    sort(scores.begin(), scores.end());

    int high = count_if(scores.begin(), scores.end(), [](int s) {
        return s >= 10;
    });

    map<string, int> totals = {{"high", high}};
    for (const auto& entry : totals) {
        cout << entry.first << ": " << entry.second << endl;
    }
    return 0;
}
`,
};
