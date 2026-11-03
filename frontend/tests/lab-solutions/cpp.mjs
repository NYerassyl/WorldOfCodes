export const solutions = {
  "cpp-basics-lab": `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int level = 0;
    double price = 0.0;

    cin >> name >> level >> price;

    cout << name << endl;
    cout << level << endl;
    cout << price << endl;
    return 0;
}
`,
  "cpp-control-lab": `#include <iostream>
using namespace std;

int main() {
    int start = 0;
    int end = 0;
    cin >> start >> end;

    for (int i = start; i <= end; i++) {
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
    int a = 0;
    int b = 0;
    cin >> a >> b;

    cout << sum(a, b) << endl;
    return 0;
}
`,
  "cpp-structs-lab": `#include <iostream>
using namespace std;

struct Score {
    int points;
    Score(int start) : points(start) {}
    int value() const { return points; }
    void add(int n) { points += n; }
};

int main() {
    int start = 0;
    int bonus = 0;
    cin >> start >> bonus;

    Score score(start);
    cout << score.value() << endl;
    score.add(bonus);
    cout << score.value() << endl;
    return 0;
}
`,
  "cpp-stl-lab": `#include <iostream>
#include <vector>
#include <map>
#include <algorithm>
#include <string>
using namespace std;

int main() {
    int n = 0;
    cin >> n;

    vector<int> scores(n);
    for (int i = 0; i < n; i++) {
        cin >> scores[i];
    }

    sort(scores.begin(), scores.end());

    for (int i = 0; i < n; i++) {
        if (i > 0) cout << " ";
        cout << scores[i];
    }
    cout << endl;

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
