Here are **5 common coding patterns that instantly hint at the time complexity**. Once you recognize these patterns, you can often determine complexity **in seconds**. ⚡

---

# 1️⃣ Single Loop → **O(n)**

If an algorithm **iterates through the input once**, it’s usually linear.

### Pattern

```python
for i in range(n):
    do_something()
```

### Complexity

[
O(n)
]

### Example

```python
def sum_list(nums):
    total = 0
    for n in nums:
        total += n
    return total
```

* One pass through the list
* **Time:** O(n)

✅ Very common in:

* counting
* searching
* filtering
* aggregations

---

# 2️⃣ Nested Loops Over Same Input → **O(n²)**

If you see **a loop inside another loop over the same input**, it's usually quadratic.

### Pattern

```python
for i in range(n):
    for j in range(n):
        do_something()
```

### Complexity

[
O(n^2)
]

### Example

```python
for i in nums:
    for j in nums:
        print(i, j)
```

Every element interacts with every other element.

Common in:

* **brute-force comparisons**
* **pair finding**
* **distance calculations**

---

# 3️⃣ Divide Input Each Step → **O(log n)**

When the input **shrinks by half each iteration**, it's logarithmic.

### Pattern

```python
while n > 1:
    n = n // 2
```

### Complexity

[
O(\log n)
]

### Example

**Binary search**

```python
while left <= right:
    mid = (left + right) // 2
```

Each step removes **half the search space**.

Common in:

* binary search
* heap operations
* balanced trees

---

# 4️⃣ Loop + Halving → **O(n log n)**

When you combine:

* an **O(n) loop**
* with a **logarithmic operation**

You usually get:

[
O(n \log n)
]

### Example

Many **efficient sorting algorithms**:

* Merge Sort
* Heap Sort
* Quick Sort (average case)

Example idea:

```python
for i in range(n):
    binary_search(...)
```

[
n × log(n) = O(n\log n)
]

---

# 5️⃣ Generating All Combinations → **O(2ⁿ) or Worse**

If an algorithm **tries every possible combination**, complexity becomes exponential.

### Pattern

```python
def explore(options):
    explore(option1)
    explore(option2)
```

### Complexity

[
O(2^n)
]

Example: recursive subset generation.

```python
def subsets(nums):
    if not nums:
        return [[]]
```

Each element can be:

* included
* excluded

Total subsets:

[
2^n
]

---

# 📊 Pattern Cheat Sheet

| Pattern              | Complexity     |
| -------------------- | -------------- |
| One loop over data   | **O(n)**       |
| Nested loops         | **O(n²)**      |
| Halving each step    | **O(log n)**   |
| Loop + log operation | **O(n log n)** |
| All combinations     | **O(2ⁿ)**      |

---

# 🧠 Pro Trick (Used in Interviews)

Look for **what grows with input size**.

Example:

=
---
