from __future__ import annotations

from fractions import Fraction
from itertools import product
from typing import Iterator, Optional


OPS = ("+", "-", "*", "/")


def eval_no_parens_3(a: int, op1: str, b: int, op2: str, c: int) -> Fraction | None:
    """
    Evaluate: a op1 b op2 c with NO parentheses, using standard precedence:
      * and / before + and -, left-to-right within same precedence.
    Exact rational arithmetic via Fraction.
    Returns None if division by zero occurs.
    """
    A = Fraction(a, 1)
    B = Fraction(b, 1)
    C = Fraction(c, 1)

    # Case 1: op2 has higher precedence than op1: a op1 (b op2 c)
    if op1 in ("+", "-") and op2 in ("*", "/"):
        if op2 == "/":
            if c == 0:
                return None
            bc = B / C
        else:
            bc = B * C

        return (A + bc) if op1 == "+" else (A - bc)

    # Case 2: op1 has higher precedence than op2: (a op1 b) op2 c
    if op1 in ("*", "/") and op2 in ("+", "-"):
        if op1 == "/":
            if b == 0:
                return None
            ab = A / B
        else:
            ab = A * B

        return (ab + C) if op2 == "+" else (ab - C)

    # Case 3: same precedence: left-to-right
    # (a op1 b) op2 c
    # Note: for +/-, and */- same-prec categories, evaluate left-to-right.
    # First compute ab
    if op1 == "+":
        ab = A + B
    elif op1 == "-":
        ab = A - B
    elif op1 == "*":
        ab = A * B
    else:  # "/"
        if b == 0:
            return None
        ab = A / B

    # Then apply op2 with c
    if op2 == "+":
        return ab + C
    if op2 == "-":
        return ab - C
    if op2 == "*":
        return ab * C
    # "/"
    if c == 0:
        return None
    return ab / C


def generate_all_no_parens_expressions(
    t: int,
    *,
    lo: int = 1,
    hi: int = 9,
    allowed_ops: tuple[str, ...] = OPS,
    limit: Optional[int] = None,
) -> Iterator[str]:
    """
    Yield all expressions "a op1 b op2 c" (no parentheses) with a,b,c in [lo,hi]
    and op1,op2 in allowed_ops that evaluate exactly to integer target t.
    """
    target = Fraction(t, 1)
    produced = 0

    for a in range(lo, hi + 1):
        for b in range(lo, hi + 1):
            if b == a:
                continue
            for c in range(lo, hi + 1):
                if c == a or c == b:
                    continue
                for op1, op2 in product(allowed_ops, repeat=2):
                    v = eval_no_parens_3(a, op1, b, op2, c)
                    if v is None:
                        continue
                    if v == target:
                        yield f"{a}{op1}{b}{op2}{c}"
                        produced += 1
                        if limit is not None and produced >= limit:
                            return


def write_no_parens_expressions_to_file(
    t: int,
    path: str,
    *,
    lo: int = 1,
    hi: int = 9,
    limit: Optional[int] = None,
) -> int:
    cnt = 0
    with open(path, "w", encoding="utf-8") as f:
        for expr in generate_all_no_parens_expressions(t, lo=lo, hi=hi, limit=limit):
            f.write(expr + "\n")
            cnt += 1
    return cnt


if __name__ == "__main__":
    for i in range(1, 100):
        target = i
        # # 1) 앞 50개만 보기
        # for i, e in enumerate(generate_all_no_parens_expressions(target, lo=1, hi=99), 1):
        #     print(i, e)
        

        # 2) 전부 파일로 저장 (결과가 많을 수 있으니 권장)
        n = write_no_parens_expressions_to_file(target, f"game_logic/answers/{target}.txt", lo=1, hi=9)
        print("written:", i)
