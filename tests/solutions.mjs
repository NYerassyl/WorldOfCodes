export const solutions = {
  "py-double": "def double(n):\n    return n * 2",
  "py-area": "def rectangle_area(width, height):\n    return width * height",
  "py-even": "def is_even(n):\n    return n % 2 == 0",
  "py-grade":
    "def grade(score):\n    return 'A' if score >= 90 else 'B' if score >= 75 else 'C' if score >= 60 else 'D'",
  "py-sum": "def sum_to_n(n):\n    return n * (n+1) // 2",
  "py-multiples": "def count_multiples(n, k):\n    return n // k",
  "py-greet": "def greet(name):\n    return f'Hello, {name}!'",
  "py-max3": "def max_of_three(a, b, c):\n    return max(a,b,c)",
  "py-edges": "def first_and_last(nums):\n    return [nums[0],nums[-1]]",
  "py-unique":
    "def unique_in_order(nums):\n    return list(dict.fromkeys(nums))",
  "py-uppercase": "def upper_name(name):\n    return name.upper()",
  "py-lengths": "def word_lengths(words):\n    return [len(w) for w in words]",
  "algo-two-sum":
    "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1,len(nums)):\n            if nums[i]+nums[j] == target:\n                return [i,j]",
  "algo-binary-search":
    "def binary_search(nums, target):\n    lo,hi=0,len(nums)-1\n    while lo<=hi:\n        mid=(lo+hi)//2\n        if nums[mid]==target: return mid\n        if nums[mid]<target: lo=mid+1\n        else: hi=mid-1\n    return -1",
  "algo-sort": "def sort_numbers(nums):\n    return sorted(nums)",
  "algo-brackets":
    "def valid_parentheses(text):\n    stack=[]\n    pairs={')':'(',']':'[','}':'{'}\n    for c in text:\n        if c in '([{': stack.append(c)\n        elif not stack or stack.pop()!=pairs[c]: return False\n    return not stack",
};
