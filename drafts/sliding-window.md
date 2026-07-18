Most array and substring problems have an obvious brute-force answer: check every window, take the best one. It works, and it is O(n·k). The sliding window turns the same problem into O(n) by noticing something simple — consecutive windows overlap almost completely, so recomputing them from scratch throws away work you already did.

Here is the whole idea in one picture. To find the best sum of 3 consecutive numbers in `[2, 1, 5, 1, 3, 2]`:

```
[2  1  5] 1  3  2     sum = 8
 2 [1  5  1] 3  2     sum = 7
 2  1 [5  1  3] 2     sum = 9
 2  1  5 [1  3  2]    sum = 6
```

Moving from one window to the next, four of the five values are unchanged. Only one leaves and one enters. So instead of adding three numbers each time, add the one entering and subtract the one leaving.

That is the entire technique. Everything below is variations on it.

## Pattern 1 — the fixed window

The window size never changes. Build the first one, then slide.

Start by filling the initial window:

```cpp
int windowSum = 0;
for (int i = 0; i < k; i++) {
    windowSum += nums[i];
}
```

Now slide. `right` is the index entering the window; `right - k` is the one leaving it:

```cpp
int best = windowSum;
for (int right = k; right < (int)nums.size(); right++) {
    windowSum += nums[right];       // one enters
    windowSum -= nums[right - k];   // one leaves
    best = max(best, windowSum);
}
```

The `right - k` index is where this goes wrong most often. When `right` is the newest element, the oldest one in the window sits exactly `k` positions behind it. Draw two windows on paper once and it stops being confusing.

Guard the degenerate cases and it is done:

```cpp
int maxSumSubarray(const vector<int>& nums, int k) {
    if ((int)nums.size() < k || k <= 0) return 0;

    int windowSum = 0;
    for (int i = 0; i < k; i++) {
        windowSum += nums[i];
    }

    int best = windowSum;
    for (int right = k; right < (int)nums.size(); right++) {
        windowSum += nums[right];
        windowSum -= nums[right - k];
        best = max(best, windowSum);
    }
    return best;
}
```

Every element is added once and removed once. O(n) time, O(1) space.

## Pattern 2 — the variable window

Fixed windows are the easy half. The interesting problems do not tell you the size: *find the shortest subarray whose sum is at least `target`*.

Now the window has two independently moving edges. The rule is:

- **`right` always moves forward**, one step per iteration, growing the window
- **`left` moves only when the window is "too good"**, shrinking it

Grow first:

```cpp
int left = 0, windowSum = 0, best = INT_MAX;

for (int right = 0; right < (int)nums.size(); right++) {
    windowSum += nums[right];
```

Then, while the window satisfies the condition, record it and shrink — because a shorter window might still satisfy it:

```cpp
    while (windowSum >= target) {
        best = min(best, right - left + 1);
        windowSum -= nums[left];
        left++;
    }
}
```

That inner `while` looks like it makes this O(n²). It does not. `left` only ever moves forward, and it can move at most n times in total across the entire run. Both pointers make one pass, so it is O(n).

Distinguish "no answer" from a real one — `INT_MAX` means the condition was never met:

```cpp
int minSubarrayLen(const vector<int>& nums, int target) {
    int left = 0, windowSum = 0, best = INT_MAX;

    for (int right = 0; right < (int)nums.size(); right++) {
        windowSum += nums[right];

        while (windowSum >= target) {
            best = min(best, right - left + 1);
            windowSum -= nums[left];
            left++;
        }
    }
    return best == INT_MAX ? 0 : best;
}
```

## Pattern 3 — a window with memory

*Longest substring without repeating characters.* The window state is no longer a number, so a running sum will not do. You need to know where each character was last seen.

```cpp
unordered_map<char, int> lastSeen;
int left = 0, best = 0;
```

When the incoming character was already seen, jump `left` past that occurrence:

```cpp
for (int right = 0; right < (int)s.size(); right++) {
    char c = s[right];

    if (lastSeen.count(c) && lastSeen[c] >= left) {
        left = lastSeen[c] + 1;
    }

    lastSeen[c] = right;
    best = max(best, right - left + 1);
}
```

The `lastSeen[c] >= left` check is the part worth slowing down for. The map remembers characters that have already fallen out of the window behind `left`. Without that comparison you would drag `left` *backwards* on a stale entry and start counting duplicates as unique.

On `"abcabcbb"` the answer is 3 — `"abc"`. On `"bbbbb"` it is 1. On `"pwwkew"` it is 3, `"wke"`, and notably not `"pwke"`, which is a subsequence rather than a substring.

## Pattern 4 — shrinking on a count

*Longest substring with at most `k` distinct characters.* Same shape as Pattern 2, but the thing you shrink on is the size of a frequency map:

```cpp
unordered_map<char, int> count;
int left = 0, best = 0;

for (int right = 0; right < (int)s.size(); right++) {
    count[s[right]]++;

    while ((int)count.size() > k) {
        char leftChar = s[left];
        count[leftChar]--;
        if (count[leftChar] == 0) count.erase(leftChar);
        left++;
    }

    best = max(best, right - left + 1);
}
```

The `erase` is mandatory. `count.size()` is your distinct-character counter, so leaving a zeroed entry in the map keeps counting a character that is no longer in the window, and the loop never terminates correctly.

## Recognising the pattern

Reach for a sliding window when all of these hold:

- The problem asks about a **contiguous** subarray or substring — not a subsequence
- You want a maximum, minimum, or a count of qualifying windows
- The window can be updated **incrementally** as it moves, in O(1) or close to it

That last point is the real constraint. Sliding windows work on sums, counts and frequency maps because adding and removing one element is cheap. They do not work when the answer requires re-examining the whole window, such as a median, unless you bring a heavier structure along.

One more caveat: the shrink-while-valid trick in Pattern 2 assumes all values are positive. With negative numbers, adding an element can *decrease* the sum, so a window failing the condition might still succeed after growing. That problem needs prefix sums and a deque, not a plain sliding window.

## Complete code

```cpp
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <climits>

using namespace std;

// Pattern 1: fixed-size window
int maxSumSubarray(const vector<int>& nums, int k) {
    if ((int)nums.size() < k || k <= 0) return 0;

    int windowSum = 0;
    for (int i = 0; i < k; i++) {
        windowSum += nums[i];
    }

    int best = windowSum;
    for (int right = k; right < (int)nums.size(); right++) {
        windowSum += nums[right];
        windowSum -= nums[right - k];
        best = max(best, windowSum);
    }
    return best;
}

// Pattern 2: variable window, shrink while the condition holds
int minSubarrayLen(const vector<int>& nums, int target) {
    int left = 0, windowSum = 0, best = INT_MAX;

    for (int right = 0; right < (int)nums.size(); right++) {
        windowSum += nums[right];

        while (windowSum >= target) {
            best = min(best, right - left + 1);
            windowSum -= nums[left];
            left++;
        }
    }
    return best == INT_MAX ? 0 : best;
}

// Pattern 3: variable window with a last-seen map
int longestUniqueSubstring(const string& s) {
    unordered_map<char, int> lastSeen;
    int left = 0, best = 0;

    for (int right = 0; right < (int)s.size(); right++) {
        char c = s[right];

        if (lastSeen.count(c) && lastSeen[c] >= left) {
            left = lastSeen[c] + 1;
        }

        lastSeen[c] = right;
        best = max(best, right - left + 1);
    }
    return best;
}

// Pattern 4: shrink on distinct count
int longestWithAtMostKDistinct(const string& s, int k) {
    unordered_map<char, int> count;
    int left = 0, best = 0;

    for (int right = 0; right < (int)s.size(); right++) {
        count[s[right]]++;

        while ((int)count.size() > k) {
            char leftChar = s[left];
            count[leftChar]--;
            if (count[leftChar] == 0) count.erase(leftChar);
            left++;
        }

        best = max(best, right - left + 1);
    }
    return best;
}

int main() {
    vector<int> nums = {2, 1, 5, 1, 3, 2};
    cout << "maxSumSubarray({2,1,5,1,3,2}, 3) = " << maxSumSubarray(nums, 3) << "\n";

    vector<int> nums2 = {2, 3, 1, 2, 4, 3};
    cout << "minSubarrayLen({2,3,1,2,4,3}, 7) = " << minSubarrayLen(nums2, 7) << "\n";

    cout << "longestUniqueSubstring(\"abcabcbb\") = " << longestUniqueSubstring("abcabcbb") << "\n";
    cout << "longestUniqueSubstring(\"bbbbb\")   = " << longestUniqueSubstring("bbbbb") << "\n";
    cout << "longestUniqueSubstring(\"pwwkew\")  = " << longestUniqueSubstring("pwwkew") << "\n";

    cout << "longestWithAtMostKDistinct(\"eceba\", 2) = " << longestWithAtMostKDistinct("eceba", 2) << "\n";

    return 0;
}
```

Compiled with `g++ -std=c++17 -Wall -Wextra -O2`, this prints:

```
maxSumSubarray({2,1,5,1,3,2}, 3) = 9
minSubarrayLen({2,3,1,2,4,3}, 7) = 2
longestUniqueSubstring("abcabcbb") = 3
longestUniqueSubstring("bbbbb")   = 1
longestUniqueSubstring("pwwkew")  = 3
longestWithAtMostKDistinct("eceba", 2) = 3
```

Four patterns, one idea: when windows overlap, do not rebuild them — update them.
