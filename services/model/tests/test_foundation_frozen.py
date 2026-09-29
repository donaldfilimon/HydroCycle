from __future__ import annotations

import ast
import dataclasses
import enum
import importlib
import inspect
import sys
from pathlib import Path

FOUNDATION = ("provenance", "thermo", "geometry", "params", "state", "ledger")
SOURCE = Path(__file__).resolve().parents[1] / "src" / "hydrocycle"
SURFACE_FILE = Path(__file__).resolve().parent / "data" / "foundation_surface.txt"


def test_foundation_imports_only_stdlib_and_foundation() -> None:
    for name in FOUNDATION:
        tree = ast.parse((SOURCE / f"{name}.py").read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top = alias.name.split(".")[0]
                    assert top in sys.stdlib_module_names, f"{name} imports {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                if node.level == 0:
                    top = (node.module or "").split(".")[0]
                    assert top in sys.stdlib_module_names or top == "__future__", (
                        f"{name} imports {node.module}"
                    )
                else:
                    targets = [node.module] if node.module else [a.name for a in node.names]
                    for target in targets:
                        assert target in FOUNDATION, f"{name} imports .{target}"


def _imported_names(name: str) -> set[str]:
    tree = ast.parse((SOURCE / f"{name}.py").read_text())
    return {
        (alias.asname or alias.name).split(".")[0]
        for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
        for alias in node.names
    }


def render_surface() -> str:
    lines: list[str] = []
    for name in FOUNDATION:
        module = importlib.import_module(f"hydrocycle.{name}")
        imported = _imported_names(name)
        for attr in sorted(vars(module)):
            if attr.startswith("_") or attr in imported:
                continue
            obj = getattr(module, attr)
            if getattr(obj, "__module__", None) != module.__name__ and not isinstance(
                obj, (str, float, int, tuple, dict)
            ):
                continue
            if inspect.isclass(obj):
                if dataclasses.is_dataclass(obj):
                    fields = ", ".join(f"{f.name}: {f.type}" for f in dataclasses.fields(obj))
                    lines.append(f"{name}.{attr}({fields})")
                else:
                    lines.append(f"{name}.{attr} class")
                if issubclass(obj, enum.Enum):
                    for enum_member in obj:
                        lines.append(f"{name}.{attr}.{enum_member.name} = {enum_member.value!r}")
                for member in sorted(vars(obj)):
                    if member.startswith("_"):
                        continue
                    value = inspect.getattr_static(obj, member)
                    if isinstance(value, (staticmethod, classmethod)):
                        value = value.__func__
                    if inspect.isfunction(value):
                        lines.append(f"{name}.{attr}.{member}{inspect.signature(value)}")
                    elif isinstance(value, property):
                        lines.append(f"{name}.{attr}.{member} property")
            elif inspect.isfunction(obj):
                lines.append(f"{name}.{attr}{inspect.signature(obj)}")
            elif isinstance(obj, (str, tuple)):
                lines.append(f"{name}.{attr} = {obj!r}")
            else:
                lines.append(f"{name}.{attr} = {type(obj).__name__}")
    return "\n".join(lines) + "\n"


def test_foundation_surface_is_frozen() -> None:
    expected = SURFACE_FILE.read_text()
    actual = render_surface()
    assert actual == expected, (
        "The P1 foundation's public surface changed. The model spec forbids editing the "
        "foundation; if the change is deliberate, regenerate tests/data/foundation_surface.txt "
        'with `uv run --frozen python -c "import tests.test_foundation_frozen as t; '
        "open('tests/data/foundation_surface.txt','w').write(t.render_surface())\"` "
        "from services/model and commit it with the change."
    )
