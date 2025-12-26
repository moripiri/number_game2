from __future__ import annotations

import os
from collections import defaultdict
from fractions import Fraction
from itertools import permutations, product
from typing import DefaultDict, Dict, Iterable, List, Sequence, Tuple

OPS: Tuple[str, ...] = ("+", "-", "*", "/")


def eval_no_parens(nums: Sequence[int], ops: Sequence[str]) -> Fraction | None:
    """
    Evaluate: n0 op0 n1 op1 n2 ... with NO parentheses,
    using standard precedence (*,/ before +,-) and left-to-right within same precedence.
    Exact arithmetic via Fraction.
    Return None if division by zero occurs.
    """
    if len(nums) == 0:
        return None
    if len(ops) != len(nums) - 1:
        raise ValueError("len(ops) must be len(nums)-1")

    values = [Fraction(n, 1) for n in nums]
    operators = list(ops)

    # Pass 1: resolve * and / from left to right
    i = 0
    while i < len(operators):
        op = operators[i]
        if op in ("*", "/"):
            a = values[i]
            b = values[i + 1]
            if op == "/":
                if b == 0:
                    return None
                r = a / b
            else:
                r = a * b

            values[i : i + 2] = [r]
            operators.pop(i)
            # stay at same i
        else:
            i += 1

    # Pass 2: resolve + and - left-to-right
    res = values[0]
    for i, op in enumerate(operators):
        b = values[i + 1]
        if op == "+":
            res += b
        else:  # "-"
            res -= b
    return res


def enumerate_targets_for_k(
    *,
    k: int,
    lo: int = 1,
    hi: int = 9,
    target_lo: int = 1,
    target_hi: int = 99,
    allowed_ops: Tuple[str, ...] = OPS,
) -> Dict[int, List[str]]:
    """
    Enumerate ALL expressions with:
      - k distinct numbers in [lo,hi]
      - k-1 operators in allowed_ops
      - no parentheses
    Evaluate them once and bucket by integer target in [target_lo, target_hi].

    Returns: dict[target] -> list of expression strings.
    """
    if k < 2:
        raise ValueError("k must be >= 2")
    n_pool = list(range(lo, hi + 1))
    if k > len(n_pool):
        raise ValueError("k cannot exceed the size of the number pool")

    buckets: DefaultDict[int, List[str]] = defaultdict(list)

    for nums in permutations(n_pool, k):  # distinct numbers by construction
        for ops in product(allowed_ops, repeat=k - 1):
            v = eval_no_parens(nums, ops)
            if v is None or v.denominator != 1:
                continue

            tv = int(v)
            if not (target_lo <= tv <= target_hi):
                continue

            parts = [str(nums[0])]
            for o, n in zip(ops, nums[1:]):
                parts.append(o)
                parts.append(str(n))
            buckets[tv].append("".join(parts))

    return dict(buckets)


def write_buckets(
    buckets: Dict[int, List[str]],
    out_dir: str,
    *,
    target_lo: int = 1,
    target_hi: int = 99,
) -> None:
    os.makedirs(out_dir, exist_ok=True)
    for t in range(target_lo, target_hi + 1):
        exprs = buckets.get(t, [])
        with open(os.path.join(out_dir, f"{t}.txt"), "w", encoding="utf-8") as f:
            if exprs:
                f.write("\n".join(exprs) + "\n")


if __name__ == "__main__":
    base_dir = "game_logic/answers"
    lo, hi = 1, 9
    target_lo, target_hi = 1, 99

    for k in (4, 5):
        print(f"Enumerating k={k} ...")
        buckets = enumerate_targets_for_k(
            k=k,
            lo=lo,
            hi=hi,
            target_lo=target_lo,
            target_hi=target_hi,
        )
        out_dir = os.path.join(base_dir, f"k{k}")
        write_buckets(buckets, out_dir, target_lo=target_lo, target_hi=target_hi)

        total = sum(len(v) for v in buckets.values())
        print(f"done k={k}. total expressions written (within target range): {total}")
